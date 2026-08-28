import 'fastify'
import '@fastify/jwt'

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      DATABASE_URL: string
      JWT_SECRET: string
      ADMIN_SECRET_KEY?: string
      // ADR-0001: fator do SIN parametrizável (tCO₂/MWh); default em src/config/reference.ts
      EMISSION_FACTOR_TCO2_MWH?: string
    }
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: number; email: string }
    user: { id: number; email: string }
  }
}