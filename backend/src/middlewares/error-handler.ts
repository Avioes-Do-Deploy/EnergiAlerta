import { type FastifyReply, type FastifyRequest } from "fastify";
import AppError from "../errors/app.error.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { ZodError } from "zod";
import { ERROR_TAGS } from "../errors/app.error.js";

export default async function errorHandler(
  error: unknown,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  if (error instanceof PrismaClientKnownRequestError) {
    console.error(`Erro ${error.code}: ${error.name}\n${error.message}\n Possível causa: ${error.cause}`)
    return rep.status(500).send({
      name: "internalServerError",
      type: ERROR_TAGS.UNKNOWN,
      message: "Não foi possível realizar a operação. Conferir logs da API para mais detalhes.",
      identifierCode: "OPERATION_FAILED"
    })
  }
  if (error instanceof ZodError) {
    console.error(`Erro ${error.type}: ${error.name}\n${error.message}\n Possível causa: ${error.cause}`)
    return rep.status(400).send({
      name: "badRequest",
      type: ERROR_TAGS.APP,
      message: "Dados enviados são inválidos. Conferir documentação da API em /docs",
      identifierCode: "VALIDATION_FAILED",
      details: error.issues
    })
  }
  if (error instanceof AppError) {
    return rep.status(error.status).send(error)
  }
}
