import { NUL_CHARACTER_MESSAGE, withoutNul } from '@kb/contracts'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

describe('withoutNul', () => {
  const schema = withoutNul(z.string().trim().min(1))

  it('keeps the checks and transforms of the wrapped schema', () => {
    expect(schema.parse('  text  ')).toBe('text')
    expect(schema.safeParse('   ').success).toBe(false)
  })

  it.each([
    ['a leading NUL', '\u0000text'],
    ['an embedded NUL', 'te\u0000xt'],
    ['a trailing NUL', 'text\u0000'],
  ])('rejects %s', (_, value) => {
    const result = schema.safeParse(value)

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([NUL_CHARACTER_MESSAGE])
  })

  it('accepts other control characters such as tabs and line breaks', () => {
    expect(schema.parse('a\tb\nc')).toBe('a\tb\nc')
  })
})
