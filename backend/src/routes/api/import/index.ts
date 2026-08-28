import { type FastifyPluginAsync } from 'fastify'
import ImportModule from '../../../modules/import.module.js'
import authMiddleware from '../../../middlewares/auth.js'

const importRoute: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware)
  fastify.post('/', ImportModule.importar)
}

export default importRoute