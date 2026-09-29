import { Logger } from '@nestjs/common'
import type { NextFunction, Response } from 'express'

import type { ApiRequest } from '../types/request.types.js'

const logger = new Logger('HTTP')
const ABORTED_OUTCOME = 'aborted'

/** One access-log line per request once it is over, including guard rejections and client aborts. */
export function logRequests(request: ApiRequest, response: Response, next: NextFunction): void {
  const startedAt = performance.now()
  response.once('close', () => {
    const outcome = response.writableFinished ? String(response.statusCode) : ABORTED_OUTCOME
    const elapsedMs = Math.round(performance.now() - startedAt)
    const user = request.userContext === undefined ? '' : ` user=${request.userContext.userId}`
    const id = request.requestId ?? '-'
    logger.log(`${request.method} ${request.originalUrl} ${outcome} ${elapsedMs}ms [${id}]${user}`)
  })
  next()
}
