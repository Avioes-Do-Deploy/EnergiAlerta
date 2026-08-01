import { type HttpErrorCodes, type HttpErrorNames } from "@fastify/sensible";

export default class AppError extends Error {
  public readonly name: HttpErrorNames
  public readonly type: ERROR_TAGS
  public readonly identifierCode: string
  public readonly status: HttpErrorCodes

  constructor(status: HttpErrorCodes, data: AppErrorType) {
    super(data.message)
    this.name = data.name
    this.type = data.type
    this.identifierCode = data.identifierCode
    this.status = status
  }
}

export interface AppErrorType {
  name: HttpErrorNames,
  message: string,
  type: ERROR_TAGS,
  identifierCode: string
}

export enum ERROR_TAGS {
  APP = "AppLogicError",
  DATABASE = "DatabaseError",
  UNKNOWN = "UnknownError"
}
