import { AiProviderError } from '@kb/ai'
import { apiErrorSchema } from '@kb/contracts'
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
  UnsupportedMediaTypeException,
} from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'
import { describe, expect, it } from 'vitest'

import { ApiHttpException } from '../../../../src/common/errors/api-http.exception.js'
import { DEFAULT_ERROR_MESSAGES } from '../../../../src/common/errors/error.constants.js'
import { mapErrorToResponse } from '../../../../src/common/errors/error-mapping.js'

const SECRET_DETAIL = 'connection to db.internal:5432 failed for user admin'
const GENERIC_500 = {
  status: 500,
  body: { code: 'internal_error', messages: [DEFAULT_ERROR_MESSAGES.internal_error] },
}

/** An error shaped like the ones body-parser raises through http-errors. */
function httpError(status: number, message: string, expose = status < 500): Error {
  return Object.assign(new Error(message), { status, statusCode: status, expose })
}

function aiError(code: AiProviderError['code'], retryAfterSeconds?: number): AiProviderError {
  return new AiProviderError(code, `OpenAI failed: ${SECRET_DETAIL}`, {
    provider: 'openai',
    model: 'gpt-4o-mini',
    retryAfterSeconds,
  })
}

describe('mapErrorToResponse', () => {
  describe('ApiHttpException', () => {
    it.each([
      ['not_found', 404],
      ['unauthenticated', 401],
      ['forbidden', 403],
      ['unsupported_media_type', 415],
    ] as const)('sends a %s body as-is with status %i', (code, status) => {
      const exception = new ApiHttpException(code, ['Reason for the client'])
      expect(mapErrorToResponse(exception)).toEqual({ status, body: exception.body })
    })

    it('keeps field errors and retry hints', () => {
      const invalid = new ApiHttpException('invalid_payload', ['Invalid request payload'], {
        errors: { title: ['Required'] },
      })
      const limited = new ApiHttpException('rate_limited', ['Slow down'], { retryAfter: 42 })

      expect(mapErrorToResponse(invalid)).toEqual({
        status: 422,
        body: {
          code: 'invalid_payload',
          messages: ['Invalid request payload'],
          errors: { title: ['Required'] },
        },
      })
      expect(mapErrorToResponse(limited)).toEqual({
        status: 429,
        body: { code: 'rate_limited', messages: ['Slow down'], retryAfter: 42 },
      })
    })
  })

  describe('Nest HttpException', () => {
    it.each([
      ['NotFoundException', new NotFoundException('Cannot GET /api/nope'), 404, 'not_found'],
      ['UnauthorizedException', new UnauthorizedException(), 401, 'unauthenticated'],
      ['ForbiddenException', new ForbiddenException(), 403, 'forbidden'],
      ['PayloadTooLargeException', new PayloadTooLargeException(), 413, 'payload_too_large'],
      [
        'UnsupportedMediaTypeException',
        new UnsupportedMediaTypeException(),
        415,
        'unsupported_media_type',
      ],
      ['ThrottlerException', new ThrottlerException(), 429, 'rate_limited'],
      ['BadRequestException', new BadRequestException(), 422, 'invalid_payload'],
      ['an unlisted 4xx', new HttpException('I am a teapot', 418), 422, 'invalid_payload'],
    ] as const)('maps %s to %i %s', (_, exception, status, code) => {
      expect(mapErrorToResponse(exception)).toMatchObject({ status, body: { code } })
    })

    it('keeps the client-facing messages of a 4xx', () => {
      expect(
        mapErrorToResponse(new NotFoundException('Cannot GET /api/nope')).body.messages
      ).toEqual(['Cannot GET /api/nope'])
      expect(
        mapErrorToResponse(new BadRequestException(['a is required', 'b is invalid'])).body.messages
      ).toEqual(['a is required', 'b is invalid'])
    })

    it.each([
      ['InternalServerErrorException', new InternalServerErrorException(SECRET_DETAIL)],
      ['BadGatewayException', new BadGatewayException(SECRET_DETAIL)],
    ])('hides the details of a server-side %s behind the generic 500', (_, exception) => {
      expect(mapErrorToResponse(exception)).toEqual(GENERIC_500)
    })
  })

  describe('AiProviderError', () => {
    it.each(['rate_limited', 'timeout', 'connection', 'server'] as const)(
      'reports a retryable %s failure as 503 ai_provider_unavailable',
      (code) => {
        expect(mapErrorToResponse(aiError(code))).toEqual({
          status: 503,
          body: {
            code: 'ai_provider_unavailable',
            messages: [DEFAULT_ERROR_MESSAGES.ai_provider_unavailable],
          },
        })
      }
    )

    it('forwards the provider retry hint, rounded up to whole seconds', () => {
      expect(mapErrorToResponse(aiError('rate_limited', 7.2)).body.retryAfter).toBe(8)
    })

    it.each([
      'authentication',
      'permission',
      'not_found',
      'invalid_request',
      'unsupported',
      'unknown',
    ] as const)('reports a non-retryable %s failure as 502 without a retry hint', (code) => {
      expect(mapErrorToResponse(aiError(code, 30))).toEqual({
        status: 502,
        body: { code: 'ai_provider_error', messages: [DEFAULT_ERROR_MESSAGES.ai_provider_error] },
      })
    })
  })

  describe('errors from Express middleware', () => {
    it('maps a body-parser size rejection to 413 payload_too_large', () => {
      expect(mapErrorToResponse(httpError(413, 'request entity too large'))).toEqual({
        status: 413,
        body: { code: 'payload_too_large', messages: ['request entity too large'] },
      })
    })

    it('maps malformed JSON to 422 invalid_payload with the parser message', () => {
      const parseError = httpError(400, `Expected property name or '}' in JSON at position 1`)
      expect(mapErrorToResponse(parseError)).toEqual({
        status: 422,
        body: { code: 'invalid_payload', messages: [parseError.message] },
      })
    })

    it('treats unexposed http errors as internal errors', () => {
      expect(mapErrorToResponse(httpError(503, SECRET_DETAIL))).toEqual(GENERIC_500)
      expect(mapErrorToResponse(httpError(400, SECRET_DETAIL, false))).toEqual(GENERIC_500)
    })
  })

  it.each([
    ['an Error', new Error(SECRET_DETAIL)],
    ['a TypeError', new TypeError(SECRET_DETAIL)],
    ['a thrown string', SECRET_DETAIL],
    ['undefined', undefined],
  ])('answers %s with the generic 500', (_, thrown) => {
    expect(mapErrorToResponse(thrown)).toEqual(GENERIC_500)
  })

  it('always produces a body that satisfies the error contract', () => {
    const thrown = [
      new ApiHttpException('rate_limited', ['Slow down'], { retryAfter: 3 }),
      new BadRequestException(),
      aiError('rate_limited', 1),
      aiError('authentication'),
      httpError(413, 'request entity too large'),
      new Error(SECRET_DETAIL),
    ]
    for (const error of thrown) {
      expect(apiErrorSchema.safeParse(mapErrorToResponse(error).body).success).toBe(true)
    }
  })
})
