import type { FastifyReply, FastifyRequest } from 'fastify'

export default async function authMiddleware(
  req: FastifyRequest,
  rep: FastifyReply,
) {
  try {
    await req.jwtVerify()
  } catch {
    return rep.status(401).send({
      name: 'unauthorized',
      type: 'AppLogicError',
      message: 'Token de autenticação inválido ou expirado.',
      identifierCode: 'AUTH_FAILED',
    })
  }
}
