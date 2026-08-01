import { type FastifyPluginAsync } from 'fastify'

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (req, rep) {
    return rep.code(200).send({
      root: true,
      apiVersionPrefix: "v1",
      paths: {
        user: { placeholder: "PLACEHOLDER" }
      }
    })
  })
}

export default root
