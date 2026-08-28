import { type FastifyPluginAsync } from 'fastify'
import UnitsModule from '../../../modules/units.module.js'
import authMiddleware from '../../../middlewares/auth.js'

const anomalies: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authMiddleware)
  fastify.patch('/:id', UnitsModule.updateAnomalyStatus)
}

export default anomalies