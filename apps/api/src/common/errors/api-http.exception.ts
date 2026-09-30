import { type ApiErrorBody, ERROR_HTTP_STATUS, type ErrorCode } from '@kb/contracts'
import { HttpException } from '@nestjs/common'

import type { ApiErrorDetails } from './errors.types.js'

export class ApiHttpException extends HttpException {
  readonly body: ApiErrorBody

  constructor(code: ErrorCode, messages: readonly string[], details: ApiErrorDetails = {}) {
    const body: ApiErrorBody = { code, messages: [...messages], ...details }
    super(body, ERROR_HTTP_STATUS[code])
    this.body = body
    this.message = messages.join(' ')
  }
}
