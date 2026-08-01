import { type FastifyPluginAsync } from 'fastify'
import AuthModule from '../../../modules/auth.module.js'

const login: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/', AuthModule.login)
}

export default login
