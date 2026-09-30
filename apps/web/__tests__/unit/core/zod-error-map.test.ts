import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { createZodErrorMap } from '@/core/forms/zod-error-map'
import { signupSchema } from '@/features/auth/schema'
import en from '@/messages/en.json'

const errorMap = createZodErrorMap(en.validation)

function firstMessage(schema: z.ZodType, value: unknown): string | undefined {
  const result = schema.safeParse(value, { error: errorMap })
  if (result.success) throw new Error('Expected the value to be rejected')
  return result.error.issues[0]?.message
}

describe('createZodErrorMap', () => {
  it.each([
    ['an empty required string', z.string().min(1), '', en.validation.required],
    ['a missing value', z.string(), undefined, en.validation.required],
    ['a wrong type', z.string(), 42, en.validation.invalid],
    ['a short string', z.string().min(8), 'short', 'Use at least 8 characters.'],
    ['an empty string with a longer minimum', z.string().min(8), '', en.validation.required],
    ['a long string', z.string().max(3), 'long', 'Use at most 3 characters.'],
    ['a malformed email', z.email(), 'not-an-email', en.validation.email],
    ['an empty email', z.email(), '', en.validation.required],
    ['a malformed URL', z.url(), 'not a url', en.validation.url],
    ['too few items', z.array(z.string()).min(1), [], 'Add at least 1.'],
    ['too many items', z.array(z.string()).max(1), ['a', 'b'], 'Add at most 1.'],
    ['a small number', z.number().min(5), 1, 'Must be at least 5.'],
    ['a big number', z.number().max(5), 9, 'Must be at most 5.'],
    ['an unknown option', z.enum(['draft', 'ready']), 'gone', en.validation.invalidOption],
  ] as const)('maps %s to dictionary copy', (_label, schema, value, expected) => {
    expect(firstMessage(schema, value)).toBe(expected)
  })

  it('lets a refinement pick its copy by key', () => {
    const schema = z.string().refine(() => false, { params: { messageKey: 'email' } })
    expect(firstMessage(schema, 'x')).toBe(en.validation.email)
  })

  it('falls back to generic copy for refinements without a key', () => {
    expect(
      firstMessage(
        z.string().refine(() => false),
        'x'
      )
    ).toBe(en.validation.invalid)
  })

  it('keeps messages that a schema sets itself', () => {
    expect(firstMessage(z.string().min(3, 'Custom copy'), 'a')).toBe('Custom copy')
  })

  it('explains the sign-up password rule', () => {
    const result = signupSchema.safeParse(
      { email: 'ada@example.com', password: 'short' },
      { error: errorMap }
    )
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'Use at least 8 characters.',
    ])
  })
})
