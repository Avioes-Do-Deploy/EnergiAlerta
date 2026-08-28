import fp from 'fastify-plugin'
import multipart from '@fastify/multipart'

// Upload de CSV (importação de leituras) — limite de 2 MB e 1 arquivo por request.
export default fp(async (fastify) => {
  fastify.register(multipart, {
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  })
})