import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import Fastify from 'fastify'
import app from '../app.js'
import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const TEST_DB = 'file:./src/generated/import-test.db'
const TEST_DB_PATH = 'src/generated/import-test.db'

const server = Fastify()
let db: PrismaClient

async function signup() {
  const email = `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`
  const res = await server.inject({
    method: 'POST',
    url: '/auth/signup',
    payload: { name: 'Teste Import', email, password: 'Senha123!' },
  })
  expect(res.statusCode).toBe(201)
  return res.json() as { token: string; user: { id: number } }
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` }
}

function multipartBody(fields: Record<string, string>, file?: { name: string; content: string }) {
  const boundary = '----test-boundary-123'
  const parts: string[] = []
  for (const [key, value] of Object.entries(fields)) {
    parts.push(`--${boundary}`, `Content-Disposition: form-data; name="${key}"`, '', value)
  }
  if (file) {
    parts.push(
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${file.name}"`,
      'Content-Type: text/csv',
      '',
      file.content,
    )
  }
  parts.push(`--${boundary}--`, '')
  return {
    body: parts.join('\r\n'),
    contentType: `multipart/form-data; boundary=${boundary}`,
  }
}

beforeAll(async () => {
  if (existsSync(TEST_DB_PATH)) rmSync(TEST_DB_PATH)
  execSync('npx prisma db push', {
    env: { ...process.env, DATABASE_URL: TEST_DB },
    stdio: 'pipe',
  })
  process.env.DATABASE_URL = TEST_DB
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'import-test-secret'
  await server.register(app)
  await server.ready()
  const adapter = new PrismaBetterSqlite3({ url: TEST_DB })
  db = new PrismaClient({ adapter })
})

afterAll(async () => {
  await db.$disconnect()
  await server.close()
})

const CSV_VALIDO = [
  'periodo,leitura_kwh,bandeira',
  '2025-06-01,120.5,VERDE',
  '2025-06-02,130.2,AMARELA',
  '2025-06-03,110,VERMELHA_1',
].join('\n')

describe('Import CSV (fase 6)', () => {
  it('401 sem token', async () => {
    const { body, contentType } = multipartBody({ unitId: '1' }, { name: 'x.csv', content: CSV_VALIDO })
    const res = await server.inject({
      method: 'POST',
      url: '/api/import',
      headers: { 'content-type': contentType },
      payload: body,
    })
    expect(res.statusCode).toBe(401)
  })

  it('CSV válido importa e reprocessa detecção', async () => {
    const { token, user } = await signup()
    const unit = await db.units.create({ data: { nome: 'Mercado Teste', segmento: 'COMERCIO', user_id: user.id } })
    const { body, contentType } = multipartBody({ unitId: String(unit.id) }, { name: 'leituras.csv', content: CSV_VALIDO })

    const res = await server.inject({
      method: 'POST',
      url: '/api/import',
      headers: { ...auth(token), 'content-type': contentType },
      payload: body,
    })
    expect(res.statusCode).toBe(201)
    const json = res.json()
    expect(json.resumo).toEqual({ totalLinhas: 3, validas: 3, duplicadas: 0, invalidas: 0 })
    expect(json.importadas).toBe(3)
    expect(typeof json.detectadas).toBe('number')
    expect(json.erros).toHaveLength(0)

    const leituras = await db.consumption_readings.count({ where: { unit_id: unit.id } })
    expect(leituras).toBe(3)
  })

  it('linha inválida é reportada com número da linha e as válidas importam', async () => {
    const { token, user } = await signup()
    const unit = await db.units.create({ data: { nome: 'Escola Teste', segmento: 'ENSINO', user_id: user.id } })
    const csv = [
      'periodo,leitura_kwh,bandeira',
      '2025-06-01,120.5,VERDE',
      '2025-06-99,130.2,AMARELA',
      '2025-06-03,abc,VERMELHA_1',
      '2025-06-04,-10,ROXA',
    ].join('\n')
    const { body, contentType } = multipartBody({ unitId: String(unit.id) }, { name: 'com-erros.csv', content: csv })

    const res = await server.inject({
      method: 'POST',
      url: '/api/import',
      headers: { ...auth(token), 'content-type': contentType },
      payload: body,
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.resumo).toEqual({ totalLinhas: 4, validas: 1, duplicadas: 0, invalidas: 3 })
    expect(json.importadas).toBe(1)
    expect(json.erros).toHaveLength(3)
    expect(json.erros[0].linha).toBe(3) // header = linha 1
    expect(json.erros[0].mensagem).toContain('periodo')
    expect(json.erros[2].mensagem).toContain('bandeira')

    const leituras = await db.consumption_readings.count({ where: { unit_id: unit.id } })
    expect(leituras).toBe(1)
  })

  it('período duplicado (já existente ou repetido no arquivo) é ignorado', async () => {
    const { token, user } = await signup()
    const unit = await db.units.create({ data: { nome: 'UBS Teste', segmento: 'INSTITUICAO', user_id: user.id } })
    await db.consumption_readings.create({
      data: { unit_id: unit.id, periodo: new Date('2025-06-01T00:00:00Z'), leitura_kwh: 200, bandeira: 'VERDE' },
    })
    const csv = [
      'periodo,leitura_kwh,bandeira',
      '2025-06-01,999,VERDE', // já existe no banco
      '2025-06-02,130,AMARELA',
      '2025-06-02,131,AMARELA', // repetido no arquivo
    ].join('\n')
    const { body, contentType } = multipartBody({ unitId: String(unit.id) }, { name: 'dups.csv', content: csv })

    const res = await server.inject({
      method: 'POST',
      url: '/api/import',
      headers: { ...auth(token), 'content-type': contentType },
      payload: body,
    })
    expect(res.statusCode).toBe(201)
    const json = res.json()
    expect(json.resumo).toEqual({ totalLinhas: 3, validas: 3, duplicadas: 2, invalidas: 0 })
    expect(json.importadas).toBe(1)

    const leituras = await db.consumption_readings.count({ where: { unit_id: unit.id } })
    expect(leituras).toBe(2) // 1 pré-existente + 1 nova
  })

  it('preview=true valida sem persistir', async () => {
    const { token, user } = await signup()
    const unit = await db.units.create({ data: { nome: 'Padaria Teste', segmento: 'COMERCIO', user_id: user.id } })
    const { body, contentType } = multipartBody({ unitId: String(unit.id) }, { name: 'preview.csv', content: CSV_VALIDO })

    const res = await server.inject({
      method: 'POST',
      url: '/api/import?preview=true',
      headers: { ...auth(token), 'content-type': contentType },
      payload: body,
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.preview).toBe(true)
    expect(json.resumo.validas).toBe(3)
    expect(json.importadas).toBeUndefined()
    expect(json.detectadas).toBeUndefined()

    const leituras = await db.consumption_readings.count({ where: { unit_id: unit.id } })
    expect(leituras).toBe(0)
  })

  it('unidade de outro dono retorna 404', async () => {
    const { token: tokenA, user: userA } = await signup()
    const { token: tokenB } = await signup()
    const unit = await db.units.create({ data: { nome: 'Loja A', segmento: 'COMERCIO', user_id: userA.id } })
    const { body, contentType } = multipartBody({ unitId: String(unit.id) }, { name: 'x.csv', content: CSV_VALIDO })

    const res = await server.inject({
      method: 'POST',
      url: '/api/import',
      headers: { ...auth(tokenB), 'content-type': contentType },
      payload: body,
    })
    expect(res.statusCode).toBe(404)
  })

  it('falta do arquivo retorna 400', async () => {
    const { token, user } = await signup()
    const unit = await db.units.create({ data: { nome: 'Sem Arquivo', segmento: 'COMERCIO', user_id: user.id } })
    const { body, contentType } = multipartBody({ unitId: String(unit.id) })

    const res = await server.inject({
      method: 'POST',
      url: '/api/import',
      headers: { ...auth(token), 'content-type': contentType },
      payload: body,
    })
    expect(res.statusCode).toBe(400)
  })
})