import type { FastifyReply, FastifyRequest } from 'fastify'
import bcrypt from 'bcrypt'
import db from '../database/prisma.js'
import { loginSchema, signupSchema } from './dto/auth.dto.js'
import AppError, { ERROR_TAGS } from '../errors/app.error.js'

export default class AuthModule {
  static async signup(req: FastifyRequest, rep: FastifyReply) {
    const data = signupSchema.parse(req.body)

    const existing = await db.users.findUnique({ where: { email: data.email } })
    if (existing) {
      throw new AppError(409, {
        name: 'conflict',
        message: 'Email já cadastrado.',
        type: ERROR_TAGS.APP,
        identifierCode: 'EMAIL_EXISTS',
      })
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    const user = await db.users.create({
      data: { name: data.name, email: data.email, password: hashedPassword },
      select: { id: true, name: true, email: true },
    })

    const token = req.server.jwt.sign({ id: user.id, email: user.email })

    return rep.status(201).send({ token, user })
  }

  static async login(req: FastifyRequest, rep: FastifyReply) {
    const data = loginSchema.parse(req.body)

    const user = await db.users.findUnique({ where: { email: data.email } })
    if (!user) {
      throw new AppError(401, {
        name: 'unauthorized',
        message: 'Email ou senha inválidos.',
        type: ERROR_TAGS.APP,
        identifierCode: 'INVALID_CREDENTIALS',
      })
    }

    const valid = await bcrypt.compare(data.password, user.password)
    if (!valid) {
      throw new AppError(401, {
        name: 'unauthorized',
        message: 'Email ou senha inválidos.',
        type: ERROR_TAGS.APP,
        identifierCode: 'INVALID_CREDENTIALS',
      })
    }

    const token = req.server.jwt.sign({ id: user.id, email: user.email })

    return rep.status(200).send({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    })
  }
}
