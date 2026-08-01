import 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      DATABASE_URL: string
      JWT_SECRET: string
      ADMIN_SECRET_KEY?: string
    }
  }
}