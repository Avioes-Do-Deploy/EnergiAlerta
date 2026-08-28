// ADR-0001: import CSV de leituras — parse por linha (csv-parse), validação com
// preview antes de persistir, dedup por (unit_id, periodo) e reprocessamento de
// detecção de anomalias após cada importação.
import { parse } from 'csv-parse'
import type { FastifyReply, FastifyRequest } from 'fastify'
import db from '../database/prisma.js'
import AppError, { ERROR_TAGS } from '../errors/app.error.js'
import { importQuerySchema, linhaCSVSchema, type LinhaCSV } from './dto/import.dto.js'
import { detectarAnomalias } from './detection.module.js'
import type { Segmento } from '../seed/generator.js'

const MAX_LINHAS = 5000

interface ErroLinha {
  linha: number
  mensagem: string
}

function dataStr(data: Date) {
  return data.toISOString().slice(0, 10)
}

async function parseCSV(conteudo: Buffer) {
  const linhas: LinhaCSV[] = []
  const erros: ErroLinha[] = []
  const parser = parse(conteudo, {
    columns: true,
    info: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  })
  for await (const item of parser) {
    const envelope = item as { record?: unknown; info?: { lines: number } }
    const record = envelope.record ?? item
    const info = envelope.info ?? { lines: 0 }
    const resultado = linhaCSVSchema.safeParse(record)
    if (resultado.success) {
      linhas.push(resultado.data)
    } else {
      erros.push({
        linha: info.lines,
        mensagem: resultado.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      })
    }
  }
  return { linhas, erros }
}

// Re-roda a detecção para a unidade e substitui as anomalias detectadas,
// preservando as rotuladas injetadas (ground truth do seed/benchmark).
async function reprocessarDeteccao(unitId: number, segmento: Segmento) {
  const readings = await db.consumption_readings.findMany({
    where: { unit_id: unitId },
    orderBy: { periodo: 'asc' },
  })
  const detectadas = detectarAnomalias(
    readings.map((r) => ({ periodo: dataStr(r.periodo), leituraKwh: r.leitura_kwh })),
    segmento,
  )
  await db.anomalies.deleteMany({ where: { unit_id: unitId, rotulo_injetado: false } })
  if (detectadas.length > 0) {
    await db.anomalies.createMany({
      data: detectadas.map((a) => ({
        unit_id: unitId,
        tipo: a.tipo,
        severidade: a.severidade,
        desvio: a.desvio,
        janela_inicio: new Date(a.janelaInicio + 'T00:00:00Z'),
        janela_fim: new Date(a.janelaFim + 'T00:00:00Z'),
        status: 'DETECTADA',
        explicacao: a.explicacao,
      })),
    })
  }
  return detectadas.length
}

export default class ImportModule {
  static async importar(req: FastifyRequest, rep: FastifyReply) {
    const { preview } = importQuerySchema.parse(req.query ?? {})
    const previewMode = preview === 'true'

    let unitId: number | undefined
    let conteudo: Buffer | undefined
    let nomeArquivo = ''
    for await (const part of req.parts()) {
      if (part.type === 'file') {
        if (part.file.truncated) {
          throw new AppError(413, {
            name: 'payloadTooLarge',
            message: 'Arquivo excede o limite de 2 MB.',
            type: ERROR_TAGS.APP,
            identifierCode: 'FILE_TOO_LARGE',
          })
        }
        conteudo = await part.toBuffer()
        nomeArquivo = part.filename ?? ''
      } else if (part.fieldname === 'unitId') {
        unitId = Number(part.value)
      }
    }

    if (!conteudo) {
      throw new AppError(400, {
        name: 'badRequest',
        message: 'Envie um arquivo CSV no campo file.',
        type: ERROR_TAGS.APP,
        identifierCode: 'FILE_REQUIRED',
      })
    }
    if (typeof unitId !== 'number' || !Number.isInteger(unitId) || unitId <= 0) {
      throw new AppError(400, {
        name: 'badRequest',
        message: 'Campo unitId (número) é obrigatório.',
        type: ERROR_TAGS.APP,
        identifierCode: 'UNIT_ID_REQUIRED',
      })
    }

    const unit = await db.units.findUnique({ where: { id: unitId } })
    if (!unit || unit.user_id !== req.user.id) {
      throw new AppError(404, {
        name: 'notFound',
        message: 'Unidade não encontrada.',
        type: ERROR_TAGS.APP,
        identifierCode: 'UNIT_NOT_FOUND',
      })
    }

    const { linhas, erros } = await parseCSV(conteudo)
    const totalLinhas = linhas.length + erros.length
    if (totalLinhas > MAX_LINHAS) {
      throw new AppError(400, {
        name: 'badRequest',
        message: `Arquivo excede ${MAX_LINHAS} linhas de dados.`,
        type: ERROR_TAGS.APP,
        identifierCode: 'CSV_TOO_LARGE',
      })
    }

    const existentes = new Set(
      (
        await db.consumption_readings.findMany({
          where: { unit_id: unitId },
          select: { periodo: true },
        })
      ).map((r) => dataStr(r.periodo)),
    )
    const vistos = new Set<string>()
    const novas: LinhaCSV[] = []
    let duplicadas = 0
    for (const linha of linhas) {
      if (vistos.has(linha.periodo) || existentes.has(linha.periodo)) {
        duplicadas++
      } else {
        vistos.add(linha.periodo)
        novas.push(linha)
      }
    }

    let importadas = 0
    let detectadas = 0
    if (!previewMode && novas.length > 0) {
      await db.consumption_readings.createMany({
        data: novas.map((n) => ({
          unit_id: unitId,
          periodo: new Date(n.periodo + 'T00:00:00Z'),
          leitura_kwh: n.leitura_kwh,
          bandeira: n.bandeira,
        })),
      })
      importadas = novas.length
      detectadas = await reprocessarDeteccao(unitId, unit.segmento)
    }

    const resumo = {
      totalLinhas,
      validas: linhas.length,
      duplicadas,
      invalidas: erros.length,
    }
    const mensagem = previewMode
      ? `${novas.length} leituras prontas para importar; ${duplicadas} duplicadas ignoradas; ${erros.length} linha(s) inválida(s).`
      : `${importadas} leituras importadas; ${duplicadas} duplicadas ignoradas; ${erros.length} linha(s) inválida(s).`

    return rep.status(previewMode || erros.length > 0 ? 200 : 201).send({
      unitId,
      preview: previewMode,
      arquivo: nomeArquivo,
      resumo,
      erros,
      ...(previewMode ? {} : { importadas, detectadas }),
      mensagem,
    })
  }
}