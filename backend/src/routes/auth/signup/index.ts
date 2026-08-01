import { type FastifyPluginAsync } from 'fastify'
import AuthModule from '../../../modules/auth.module.js'

const signup: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/', AuthModule.signup)
}

export default signup
