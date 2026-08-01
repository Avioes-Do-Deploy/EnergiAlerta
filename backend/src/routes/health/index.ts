import { type FastifyPluginAsync } from 'fastify'

const health: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (req, rep) {
    return rep.code(200).send({
      ping: "pong",
      neverGonna: "giveYouUp",
      hotel: "trivago"
    })
  })
}

export default health
