import { randomUUID } from 'node:crypto'

import type { NextFunction, Response } from 'express'

import type { ApiRequest } from '../types/request.types.js'
import { REQUEST_ID_HEADER } from './http.constants.js'

// Upstream ids (proxies, tracing) are kept only when they cannot smuggle anything into log lines.
const SAFE_REQUEST_ID = /^[\w.:-]{1,128}$/

export function resolveRequestId(incoming: string | string[] | undefined): string {
  return typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID()
}

export function assignRequestId(request: ApiRequest, response: Response, next: NextFunction): void {
  const requestId = resolveRequestId(request.headers[REQUEST_ID_HEADER])
  request.requestId = requestId
  response.setHeader(REQUEST_ID_HEADER, requestId)
  next()
}
