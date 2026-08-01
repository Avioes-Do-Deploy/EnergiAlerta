import fp from 'fastify-plugin'
import helmet, { type FastifyHelmetOptions } from '@fastify/helmet'

export default fp<FastifyHelmetOptions>(async (fastify) => {
  fastify.register(helmet)
})
