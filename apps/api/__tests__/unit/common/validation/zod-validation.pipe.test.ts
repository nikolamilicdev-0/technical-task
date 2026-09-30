import { apiErrorSchema, createDocumentSchema, idSchema, updateDocumentSchema } from '@kb/contracts'
import type { ArgumentMetadata } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import type { z } from 'zod'

import { ApiHttpException } from '../../../../src/common/errors/api-http.exception.js'
import { ZodValidationPipe } from '../../../../src/common/validation/zod-validation.pipe.js'

const BODY: ArgumentMetadata = { type: 'body' }
const ID_PARAM: ArgumentMetadata = { type: 'param', data: 'id' }

function rejectionOf(schema: z.ZodType, value: unknown, metadata = BODY): ApiHttpException {
  try {
    new ZodValidationPipe(schema).transform(value, metadata)
  } catch (error) {
    if (error instanceof ApiHttpException) return error
    throw error
  }
  throw new Error('Expected the pipe to reject the value')
}

describe('ZodValidationPipe', () => {
  it('returns the parsed value: defaults applied, unknown keys stripped', () => {
    const pipe = new ZodValidationPipe(createDocumentSchema)
    const parsed = pipe.transform({ title: '  Guide ', content: 'Body', extra: true }, BODY)

    expect(parsed).toEqual({ title: 'Guide', content: 'Body', tags: [] })
  })

  it('rejects with 422 invalid_payload and per-field errors', () => {
    const rejection = rejectionOf(createDocumentSchema, { title: '', tags: ['x'.repeat(41)] })

    expect(rejection.getStatus()).toBe(422)
    expect(apiErrorSchema.parse(rejection.body)).toEqual(rejection.body)
    expect(rejection.body.code).toBe('invalid_payload')
    expect(rejection.body.messages).toEqual(['Invalid request payload'])
    expect(Object.keys(rejection.body.errors ?? {}).sort()).toEqual(['content', 'tags.0', 'title'])
  })

  it('puts problems with the whole value into messages', () => {
    const rejection = rejectionOf(updateDocumentSchema, {})

    expect(rejection.body).toEqual({
      code: 'invalid_payload',
      messages: ['Provide at least one field to update'],
    })
  })

  it('reports a body that is not an object without field errors', () => {
    expect(rejectionOf(createDocumentSchema, 'just text').body.errors).toBeUndefined()
  })

  it('reports a rejected route parameter under its name', () => {
    const rejection = rejectionOf(idSchema, 'not-a-uuid', ID_PARAM)

    expect(rejection.body.messages).toEqual(['Invalid request payload'])
    expect(Object.keys(rejection.body.errors ?? {})).toEqual(['id'])
  })
})
