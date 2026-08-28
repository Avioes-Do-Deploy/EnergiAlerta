// ADR-0001: unidades autenticadas por dono; impact/series/anomalies usam os
// módulos de cálculo (billing/emission/detection/recommendations).
import type { FastifyReply, FastifyRequest } from 'fastify'
import db from '../database/prisma.js'
import AppError, { ERROR_TAGS } from '../errors/app.error.js'
import {
  anomalyIdParamSchema,
  createUnitSchema,
  unitIdParamSchema,
  updateAnomalyStatusSchema,
} from './dto/units.dto.js'
import { calcularFaturamento } from './billing.module.js'
import { calcularEmissao } from './emission.module.js'
import { calcularBaselines } from './detection.module.js'
import { recomendacaoPara } from './recommendations.js'
import { REFERENCE } from '../config/reference.js'
import type { Bandeira } from '../generated/prisma/client.js'

type TarifaRow = NonNullable<Awaited<ReturnType<typeof db.tariff_tables.findFirst>>>

function dataStr(data: Date) {
  return data.toISOString().slice(0, 10)
}

function precoBandeira(tarifa: TarifaRow, bandeira: Bandeira) {
  const precos: Record<Bandeira, number> = {
    VERDE: tarifa.bandeira_verde_preco_mwh,
    AMARELA: tarifa.bandeira_amarela_preco_mwh,
    VERMELHA_1: tarifa.bandeira_vermelha1_preco_mwh,
    VERMELHA_2: tarifa.bandeira_vermelha2_preco_mwh,
  }
  return precos[bandeira]
}

async function buscarTarifa() {
  const tarifa = await db.tariff_tables.findFirst({ orderBy: { vigencia: 'desc' } })
  if (!tarifa) {
    throw new AppError(500, {
      name: 'internalServerError',
      message: 'Tabela tarifária não configurada.',
      type: ERROR_TAGS.APP,
      identifierCode: 'TARIFF_NOT_CONFIGURED',
    })
  }
  return tarifa
}

// Fator do SIN: env opcional > tabela emission_factors (vigência mais recente) > default documentado.
async function buscarFatorEmissao(req: FastifyRequest) {
  const envValor = req.server.config.EMISSION_FACTOR_TCO2_MWH
  if (envValor) {
    const fator = Number(envValor)
    if (!Number.isNaN(fator)) {
      return { fator, fonte: REFERENCE.sinFactor.fonte, vigencia: REFERENCE.sinFactor.vigencia }
    }
  }
  const row = await db.emission_factors.findFirst({ orderBy: { data_vigencia: 'desc' } })
  if (row) return { fator: row.fator_tco2_mwh, fonte: row.fonte, vigencia: dataStr(row.data_vigencia) }
  return { fator: REFERENCE.sinFactor.tco2PerMwh, fonte: REFERENCE.sinFactor.fonte, vigencia: REFERENCE.sinFactor.vigencia }
}

async function buscarUnidadeDoUsuario(req: FastifyRequest, id: number) {
  const unit = await db.units.findUnique({ where: { id } })
  if (!unit || unit.user_id !== req.user.id) {
    throw new AppError(404, {
      name: 'notFound',
      message: 'Unidade não encontrada.',
      type: ERROR_TAGS.APP,
      identifierCode: 'UNIT_NOT_FOUND',
    })
  }
  return unit
}

export default class UnitsModule {
  static async list(req: FastifyRequest, rep: FastifyReply) {
    const units = await db.units.findMany({ where: { user_id: req.user.id }, orderBy: { id: 'asc' } })
    return rep.send({ units })
  }

  static async create(req: FastifyRequest, rep: FastifyReply) {
    const data = createUnitSchema.parse(req.body)
    const unit = await db.units.create({
      data: {
        nome: data.nome,
        segmento: data.segmento,
        area_m2: data.areaM2,
        horario_funcionamento: data.horarioFuncionamento,
        faixa_consumo: data.faixaConsumo,
        user_id: req.user.id,
      },
    })
    return rep.status(201).send(unit)
  }

  static async getById(req: FastifyRequest, rep: FastifyReply) {
    const { id } = unitIdParamSchema.parse(req.params)
    const unit = await buscarUnidadeDoUsuario(req, id)
    return rep.send(unit)
  }

  static async series(req: FastifyRequest, rep: FastifyReply) {
    const { id } = unitIdParamSchema.parse(req.params)
    const unit = await buscarUnidadeDoUsuario(req, id)
    const readings = await db.consumption_readings.findMany({ where: { unit_id: id }, orderBy: { periodo: 'asc' } })
    const comBaseline = calcularBaselines(
      readings.map((r) => ({ periodo: dataStr(r.periodo), leituraKwh: r.leitura_kwh })),
    )
    const leituras = readings.map((r, i) => ({
      periodo: dataStr(r.periodo),
      leituraKwh: r.leitura_kwh,
      baseline: Math.round(comBaseline[i].baseline * 100) / 100,
      desvio: Math.round(comBaseline[i].desvio * 10000) / 10000,
      bandeira: r.bandeira,
    }))
    return rep.send({ unitId: unit.id, segmento: unit.segmento, leituras })
  }

  static async anomalies(req: FastifyRequest, rep: FastifyReply) {
    const { id } = unitIdParamSchema.parse(req.params)
    const unit = await buscarUnidadeDoUsuario(req, id)
    const [anomaliasDb, readings, tarifa, fator] = await Promise.all([
      db.anomalies.findMany({ where: { unit_id: id }, orderBy: { janela_inicio: 'desc' } }),
      db.consumption_readings.findMany({ where: { unit_id: id }, orderBy: { periodo: 'asc' } }),
      buscarTarifa(),
      buscarFatorEmissao(req),
    ])
    const comBaseline = calcularBaselines(
      readings.map((r) => ({ periodo: dataStr(r.periodo), leituraKwh: r.leitura_kwh })),
    )
    const precoKwh = tarifa.te_preco_kwh + tarifa.tusd_preco_kwh
    const anomalias = anomaliasDb.map((a) => {
      const inicio = dataStr(a.janela_inicio)
      const fim = dataStr(a.janela_fim)
      const kwhExcedente = comBaseline
        .filter((c) => c.periodo >= inicio && c.periodo <= fim)
        .reduce((soma, c) => soma + (c.leituraKwh - c.baseline), 0)
      const recomendacao = recomendacaoPara(
        {
          tipo: a.tipo,
          desvio: a.desvio,
          kwhExcedente: Math.round(kwhExcedente * 100) / 100,
          janelaInicio: inicio,
          janelaFim: fim,
        },
        { precoKwh, fatorTco2Mwh: fator.fator },
      )
      return {
        id: a.id,
        tipo: a.tipo,
        severidade: a.severidade,
        desvio: a.desvio,
        janelaInicio: inicio,
        janelaFim: fim,
        status: a.status,
        explicacao: a.explicacao,
        rotuloInjetado: a.rotulo_injetado,
        recomendacao,
      }
    })
    return rep.send({ unitId: unit.id, anomalias })
  }

  static async impact(req: FastifyRequest, rep: FastifyReply) {
    const { id } = unitIdParamSchema.parse(req.params)
    const unit = await buscarUnidadeDoUsuario(req, id)
    const [readings, tarifa, fator] = await Promise.all([
      db.consumption_readings.findMany({ where: { unit_id: id }, orderBy: { periodo: 'asc' } }),
      buscarTarifa(),
      buscarFatorEmissao(req),
    ])

    let kwhTotal = 0
    let custoEnergia = 0
    let custoBandeira = 0
    for (const r of readings) {
      const fat = calcularFaturamento({
        modalidade: 'simples',
        kwh: r.leitura_kwh,
        tarifa: {
          tePrecoKwh: tarifa.te_preco_kwh,
          tusdPrecoKwh: tarifa.tusd_preco_kwh,
          bandeiraPrecoMwh: precoBandeira(tarifa, r.bandeira),
        },
      })
      kwhTotal += r.leitura_kwh
      custoEnergia += fat.custoEnergia
      custoBandeira += fat.custoBandeira
    }
    const custoTotal = custoEnergia + custoBandeira
    const emissao = calcularEmissao({
      kwh: kwhTotal,
      fatorTco2Mwh: fator.fator,
      fonte: fator.fonte,
      vigencia: fator.vigencia,
    })

    const porMes = new Map<string, number>()
    for (const r of readings) {
      const mes = dataStr(r.periodo).slice(0, 7)
      porMes.set(mes, (porMes.get(mes) ?? 0) + r.leitura_kwh)
    }
    const meses = [...porMes.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    const variacaoMensal = meses.map(([mes, kwh], i) => {
      const anterior = i > 0 ? meses[i - 1][1] : null
      const variacaoPct = anterior && anterior > 0 ? ((kwh - anterior) / anterior) * 100 : null
      return {
        mes,
        kwh: Math.round(kwh * 100) / 100,
        variacaoPct: variacaoPct === null ? null : Math.round(variacaoPct * 100) / 100,
      }
    })

    return rep.send({
      unitId: unit.id,
      periodo: readings.length
        ? { inicio: dataStr(readings[0].periodo), fim: dataStr(readings[readings.length - 1].periodo) }
        : null,
      kwhTotal: Math.round(kwhTotal * 100) / 100,
      custoTotal: Math.round(custoTotal * 100) / 100,
      tco2e: Math.round(emissao.tco2e * 10000) / 10000,
      equivalencias: {
        arvores: Math.round(emissao.arvores * 10) / 10,
        kmCarro: Math.round(emissao.kmCarro),
      },
      variacaoMensal,
      memoriaDeCalculo: {
        faturamento:
          `${Math.round(kwhTotal * 100) / 100} kWh × (${tarifa.te_preco_kwh.toFixed(2)} + ${tarifa.tusd_preco_kwh.toFixed(2)}) R$/kWh` +
          ` + R$ ${Math.round(custoBandeira * 100) / 100} de bandeiras = R$ ${Math.round(custoTotal * 100) / 100}`,
        emissao: emissao.formula,
        fatorSIN: { tco2Mwh: fator.fator, fonte: fator.fonte, vigencia: fator.vigencia },
        tarifa: {
          tePrecoKwh: tarifa.te_preco_kwh,
          tusdPrecoKwh: tarifa.tusd_preco_kwh,
          bandeiras: {
            VERDE: tarifa.bandeira_verde_preco_mwh,
            AMARELA: tarifa.bandeira_amarela_preco_mwh,
            VERMELHA_1: tarifa.bandeira_vermelha1_preco_mwh,
            VERMELHA_2: tarifa.bandeira_vermelha2_preco_mwh,
          },
          vigencia: dataStr(tarifa.vigencia),
          fonte: tarifa.fonte,
        },
      },
    })
  }

  static async updateAnomalyStatus(req: FastifyRequest, rep: FastifyReply) {
    const { id } = anomalyIdParamSchema.parse(req.params)
    const data = updateAnomalyStatusSchema.parse(req.body)
    const anomaly = await db.anomalies.findUnique({
      where: { id },
      include: { unit: { select: { user_id: true } } },
    })
    if (!anomaly || anomaly.unit.user_id !== req.user.id) {
      throw new AppError(404, {
        name: 'notFound',
        message: 'Anomalia não encontrada.',
        type: ERROR_TAGS.APP,
        identifierCode: 'ANOMALY_NOT_FOUND',
      })
    }
    const updated = await db.anomalies.update({ where: { id }, data: { status: data.status } })
    return rep.send(updated)
  }
}