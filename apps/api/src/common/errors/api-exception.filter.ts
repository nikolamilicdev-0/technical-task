import { type ArgumentsHost, Catch, type ExceptionFilter, Logger } from '@nestjs/common'
import type { Response } from 'express'

import type { ApiRequest } from '../types/request.types.js'
import { describeError } from './describe-error.js'
import { HTTP_SERVER_ERROR_MIN, RETRY_AFTER_HEADER } from './error.constants.js'
import { mapErrorToResponse } from './error-mapping.js'

/** The only exception filter: every failure, from any layer, leaves in the shared error shape. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  readonly #logger = new Logger(ApiExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp()
    const request = http.getRequest<ApiRequest>()
    const response = http.getResponse<Response>()
    const { status, body } = mapErrorToResponse(exception)
    this.#report(exception, status, request)
    // A response that already started (an SSE stream) cannot change its status any more.
    if (response.headersSent) {
      response.end()
      return
    }
    if (body.retryAfter !== undefined) {
      response.setHeader(RETRY_AFTER_HEADER, String(body.retryAfter))
    }
    response.status(status).json(body)
  }

  #report(exception: unknown, status: number, request: ApiRequest): void {
    const label = `${request.method} ${request.originalUrl} [${request.requestId ?? '-'}]`
    if (status >= HTTP_SERVER_ERROR_MIN) {
      const stack = exception instanceof Error ? exception.stack : undefined
      this.#logger.error(`${label} failed with ${status}: ${describeError(exception)}`, stack)
      return
    }
    this.#logger.debug(`${label} rejected with ${status}: ${describeError(exception)}`)
  }
}
