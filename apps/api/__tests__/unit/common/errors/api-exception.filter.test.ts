import { Logger } from '@nestjs/common'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { ApiExceptionFilter } from '../../../../src/common/errors/api-exception.filter.js'
import { ApiHttpException } from '../../../../src/common/errors/api-http.exception.js'

function fakeResponse(headersSent = false) {
  return {
    headersSent,
    end: vi.fn(),
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  }
}

const request = { method: 'GET', originalUrl: '/api/documents', requestId: 'req-1' }

function run(exception: unknown, response: ReturnType<typeof fakeResponse>): void {
  new ApiExceptionFilter().catch(exception, new ExecutionContextHost([request, response]))
}

describe('ApiExceptionFilter', () => {
  beforeAll(() => {
    Logger.overrideLogger(false)
  })

  it('writes the mapped status and body', () => {
    const response = fakeResponse()
    run(new ApiHttpException('not_found', ['Document not found']), response)

    expect(response.status).toHaveBeenCalledWith(404)
    expect(response.json).toHaveBeenCalledWith({
      code: 'not_found',
      messages: ['Document not found'],
    })
    expect(response.setHeader).not.toHaveBeenCalled()
  })

  it('repeats the retry hint in the Retry-After header', () => {
    const response = fakeResponse()
    run(new ApiHttpException('rate_limited', ['Slow down'], { retryAfter: 30 }), response)

    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '30')
    expect(response.status).toHaveBeenCalledWith(429)
  })

  it('only ends a response whose headers are already sent', () => {
    const response = fakeResponse(true)
    run(new Error('stream broke'), response)

    expect(response.end).toHaveBeenCalledOnce()
    expect(response.status).not.toHaveBeenCalled()
    expect(response.json).not.toHaveBeenCalled()
  })
})
