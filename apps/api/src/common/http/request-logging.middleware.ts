import { Logger } from '@nestjs/common'
import type { NextFunction, Response } from 'express'

import type { ApiRequest } from '../types/request.types.js'
import { elapsedMs } from '../utils/elapsed.js'

const logger = new Logger('HTTP')
const ABORTED_OUTCOME = 'aborted'

// Logged on `close`, so guard rejections and client aborts get a line too.
export function logRequests(request: ApiRequest, response: Response, next: NextFunction): void {
  const startedAt = performance.now()
  response.once('close', () => {
    const outcome = response.writableFinished ? String(response.statusCode) : ABORTED_OUTCOME
    const durationMs = elapsedMs(startedAt)
    const user = request.userContext === undefined ? '' : ` user=${request.userContext.userId}`
    const id = request.requestId ?? '-'
    logger.log(`${request.method} ${request.originalUrl} ${outcome} ${durationMs}ms [${id}]${user}`)
  })
  next()
}
