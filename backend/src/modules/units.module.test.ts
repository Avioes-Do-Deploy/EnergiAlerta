import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import Fastify from 'fastify'
import app from '../app.js'
import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { gerarSerie } from '../seed/generator.js'

// DB dedicado e recriado a cada execução (schema aplicado via prisma db push).
const TEST_DB = 'file:./src/generated/units-test.db'
const TEST_DB_PATH = 'src/generated/units-test.db'

const server = Fastify()
let db: PrismaClient

async function signup() {
  const email = `units-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`
  const res = await server.inject({
    method: 'POST',
    url: '/auth/signup',
    payload: { name: 'Teste Hackathon', email, password: 'Senha123!' },
  })
  expect(res.statusCode).toBe(201)
  return res.json() as { token: string; user: { id: number } }
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` }
}

async function criarTarifa() {
  return db.tariff_tables.create({
    data: {
      vigencia: new Date('2025-01-01T00:00:00Z'),
      te_preco_kwh: 0.3,
      tusd_preco_kwh: 0.2,
      bandeira_verde_preco_mwh: 0,
      bandeira_amarela_preco_mwh: 18.8,
      bandeira_vermelha1_preco_mwh: 44.63,
      bandeira_vermelha2_preco_mwh: 94.92,
      fonte: 'ANEEL 2025 (teste)',
    },
  })
}

async function inserirLeituras(unitId: number, seed: number, segmento: 'COMERCIO' | 'ENSINO' | 'INSTITUICAO') {
  const { leituras } = gerarSerie({ seed, segmento })
  await db.consumption_readings.createMany({
    data: leituras.map((l) => ({
      unit_id: unitId,
      periodo: new Date(l.periodo + 'T00:00:00Z'),
      leitura_kwh: l.leituraKwh,
      bandeira: l.bandeira,
    })),
  })
}

beforeAll(async () => {
  if (existsSync(TEST_DB_PATH)) rmSync(TEST_DB_PATH)
  execSync('npx prisma db push', {
    env: { ...process.env, DATABASE_URL: TEST_DB },
    stdio: 'pipe',
  })
  process.env.DATABASE_URL = TEST_DB
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'units-test-secret'
  await server.register(app)
  await server.ready()
  const adapter = new PrismaBetterSqlite3({ url: TEST_DB })
  db = new PrismaClient({ adapter })
})

afterAll(async () => {
  await db.$disconnect()
  await server.close()
})

describe('API de unidades (fase 4)', () => {
  it('401 sem token em /api/units', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/units' })
    expect(res.statusCode).toBe(401)
  })

  it('cria unidade e lista apenas as do usuário', async () => {
    const { token } = await signup()
    const res = await server.inject({
      method: 'POST',
      url: '/api/units',
      headers: auth(token),
      payload: { nome: 'Padaria Central', segmento: 'COMERCIO', areaM2: 120 },
    })
    expect(res.statusCode).toBe(201)
    const unit = res.json()
    expect(unit.id).toBeGreaterThan(0)
    expect(unit.nome).toBe('Padaria Central')
    expect(unit.segmento).toBe('COMERCIO')

    const list = await server.inject({ method: 'GET', url: '/api/units', headers: auth(token) })
    expect(list.statusCode).toBe(200)
    expect(list.json().units.some((u: { id: number }) => u.id === unit.id)).toBe(true)
  })

  it('unidade de outro dono retorna 404', async () => {
    const { token: tokenA, user: userA } = await signup()
    const { token: tokenB } = await signup()
    const unit = await db.units.create({
      data: { nome: 'Loja A', segmento: 'COMERCIO', user_id: userA.id },
    })
    const res = await server.inject({ method: 'GET', url: `/api/units/${unit.id}`, headers: auth(tokenB) })
    expect(res.statusCode).toBe(404)
  })

  it('series retorna leituras com baseline (warmup 0, depois > 0) e bandeira', async () => {
    const { token, user } = await signup()
    const unit = await db.units.create({
      data: { nome: 'Escola Bairro', segmento: 'ENSINO', user_id: user.id },
    })
    await inserirLeituras(unit.id, 42, 'ENSINO')

    const res = await server.inject({
      method: 'GET',
      url: `/api/units/${unit.id}/series`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.leituras).toHaveLength(365)
    expect(body.leituras[0].baseline).toBe(0)
    expect(body.leituras[30].baseline).toBeGreaterThan(0)
    expect(body.leituras[30].bandeira).toBeDefined()
    expect(typeof body.leituras[30].desvio).toBe('number')
  })

  it('impact calcula kWh, R$, tCO₂e, variação mensal e memória de cálculo', async () => {
    const { token, user } = await signup()
    const unit = await db.units.create({
      data: { nome: 'Supermercado', segmento: 'COMERCIO', user_id: user.id },
    })
    await criarTarifa()
    await db.consumption_readings.createMany({
      data: [
        { unit_id: unit.id, periodo: new Date('2025-01-01T00:00:00Z'), leitura_kwh: 100, bandeira: 'VERDE' },
        { unit_id: unit.id, periodo: new Date('2025-01-02T00:00:00Z'), leitura_kwh: 200, bandeira: 'AMARELA' },
      ],
    })

    const res = await server.inject({
      method: 'GET',
      url: `/api/units/${unit.id}/impact`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.kwhTotal).toBe(300)
    expect(body.custoTotal).toBeCloseTo(153.76, 2) // 300×0,50 + 3,76 de bandeira amarela
    expect(body.tco2e).toBeCloseTo(0.027, 3) // 300 × 0,09 ÷ 1000
    expect(body.equivalencias.kmCarro).toBe(225) // 27 kg CO₂ ÷ 0,12 kg/km
    expect(body.variacaoMensal).toHaveLength(1)
    expect(body.variacaoMensal[0].mes).toBe('2025-01')
    expect(body.variacaoMensal[0].variacaoPct).toBeNull()
    expect(body.memoriaDeCalculo.fatorSIN.fonte).toBe('MME (SIN)')
    expect(body.memoriaDeCalculo.fatorSIN.tco2Mwh).toBeCloseTo(0.09, 3)
    expect(body.memoriaDeCalculo.tarifa.tePrecoKwh).toBe(0.3)
    expect(body.memoriaDeCalculo.faturamento).toContain('R$ 153.76')
  })

  it('anomalies traz recomendação e PATCH atualiza status', async () => {
    const { token, user } = await signup()
    const unit = await db.units.create({
      data: { nome: 'Prefeitura', segmento: 'INSTITUICAO', user_id: user.id },
    })
    await criarTarifa()
    const { leituras, injetadas } = gerarSerie({ seed: 7, segmento: 'INSTITUICAO' })
    await db.consumption_readings.createMany({
      data: leituras.map((l) => ({
        unit_id: unit.id,
        periodo: new Date(l.periodo + 'T00:00:00Z'),
        leitura_kwh: l.leituraKwh,
        bandeira: l.bandeira,
      })),
    })
    // Anomalia armazenada com a mesma janela do pico injetado no dado sintético.
    const inj = injetadas[0]
    const anomaly = await db.anomalies.create({
      data: {
        unit_id: unit.id,
        tipo: inj.tipo,
        severidade: 'ALTA',
        desvio: 0.8,
        janela_inicio: new Date(inj.inicio + 'T00:00:00Z'),
        janela_fim: new Date(inj.fim + 'T00:00:00Z'),
        status: 'DETECTADA',
        explicacao: 'Pico detectado no teste.',
      },
    })

    const res = await server.inject({
      method: 'GET',
      url: `/api/units/${unit.id}/anomalies`,
      headers: auth(token),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.anomalias).toHaveLength(1)
    expect(body.anomalias[0].recomendacao.acao.length).toBeGreaterThan(0)
    expect(body.anomalias[0].recomendacao.economiaReais).toBeGreaterThanOrEqual(0)
    expect(body.anomalias[0].recomendacao.economiaTco2e).toBeGreaterThanOrEqual(0)

    const patch = await server.inject({
      method: 'PATCH',
      url: `/api/anomalies/${anomaly.id}`,
      headers: auth(token),
      payload: { status: 'RESOLVIDA' },
    })
    expect(patch.statusCode).toBe(200)
    expect(patch.json().status).toBe('RESOLVIDA')

    const patchInvalido = await server.inject({
      method: 'PATCH',
      url: `/api/anomalies/${anomaly.id}`,
      headers: auth(token),
      payload: { status: 'QUALQUER_COISA' },
    })
    expect(patchInvalido.statusCode).toBe(400)
  })
})