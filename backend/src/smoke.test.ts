import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import app from './app.js'

// Smoke test: garante que o app boota com os plugins/routes autoloadados
// e que o pipeline de validação/erros responde (sem .env no CI).
const server = Fastify()

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'file:./src/generated/smoke.db'
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'smoke-secret'
  await server.register(app)
  await server.ready()
})

afterAll(async () => {
  await server.close()
})

describe('smoke', () => {
  it('boota e responde GET /', async () => {
    const res = await server.inject({ method: 'GET', url: '/' })
    expect(res.statusCode).toBe(200)
  })

  it('rota de auth login está plugada (validação 400)', async () => {
    const res = await server.inject({ method: 'POST', url: '/auth/login', payload: {} })
    expect(res.statusCode).toBe(400)
  })
})