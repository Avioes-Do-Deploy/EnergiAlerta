import { type FastifyPluginAsync } from 'fastify'
import UnitsModule from '../../../modules/units.module.js'
import authMiddleware from '../../../middlewares/auth.js'

const units: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware)
  fastify.get('/', UnitsModule.list)
  fastify.post('/', UnitsModule.create)
  fastify.get('/:id', UnitsModule.getById)
  fastify.get('/:id/series', UnitsModule.series)
  fastify.get('/:id/anomalies', UnitsModule.anomalies)
  fastify.get('/:id/impact', UnitsModule.impact)
}

export default units