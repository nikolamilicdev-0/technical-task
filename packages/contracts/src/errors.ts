import { z } from 'zod'

export const ERROR_CODES = [
  'invalid_payload',
  'unauthenticated',
  'forbidden',
  'not_found',
  'payload_too_large',
  'unsupported_media_type',
  'rate_limited',
  'ai_provider_error',
  'ai_provider_unavailable',
  'internal_error',
] as const
export const errorCodeSchema = z.enum(ERROR_CODES)
export type ErrorCode = z.infer<typeof errorCodeSchema>

export const ERROR_HTTP_STATUS = {
  invalid_payload: 422,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  payload_too_large: 413,
  unsupported_media_type: 415,
  rate_limited: 429,
  ai_provider_error: 502,
  ai_provider_unavailable: 503,
  internal_error: 500,
} as const satisfies Record<ErrorCode, number>

export const retryAfterSecondsSchema = z.number().int().positive()

export const fieldErrorsSchema = z.record(z.string(), z.array(z.string()))
export type FieldErrors = z.infer<typeof fieldErrorsSchema>

export const apiErrorSchema = z.object({
  code: errorCodeSchema,
  messages: z.array(z.string()),
  errors: fieldErrorsSchema.optional(),
  retryAfter: retryAfterSecondsSchema.optional(),
})
export type ApiErrorBody = z.infer<typeof apiErrorSchema>
