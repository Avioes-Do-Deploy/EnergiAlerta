import { type FastifyPluginAsync } from 'fastify'

const user: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (req, rep) {
    return rep.code(200).send({
      placeholder: "PLACEHOLDER"
    })
  })
}

export default user
