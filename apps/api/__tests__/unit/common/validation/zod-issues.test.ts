import { createDocumentSchema, updateDocumentSchema } from '@kb/contracts'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { formatIssuePath, groupIssues } from '../../../../src/common/validation/zod-issues.js'

function issuesOf(schema: z.ZodType, input: unknown): z.core.$ZodIssue[] {
  const result = schema.safeParse(input)
  return result.success ? [] : result.error.issues
}

describe('formatIssuePath', () => {
  it.each([
    [[], ''],
    [['title'], 'title'],
    [['tags', 0], 'tags.0'],
    [['a', 'b', 2, 'c'], 'a.b.2.c'],
  ])('formats %o as %o', (path, expected) => {
    expect(formatIssuePath(path)).toBe(expected)
  })
})

describe('groupIssues', () => {
  it('keys field problems by dotted path', () => {
    const tooLong = 'x'.repeat(41)
    const { formErrors, fieldErrors } = groupIssues(
      issuesOf(createDocumentSchema, { title: '', content: 'Body', tags: ['ok', tooLong] })
    )

    expect(formErrors).toEqual([])
    expect(Object.keys(fieldErrors).sort()).toEqual(['tags.1', 'title'])
    expect(fieldErrors['tags.1']).toHaveLength(1)
  })

  it('collects every message reported for the same field', () => {
    const schema = z.object({
      slug: z
        .string()
        .min(3, 'Too short')
        .regex(/^[a-z]+$/, 'Lowercase letters only'),
    })
    expect(groupIssues(issuesOf(schema, { slug: 'A' })).fieldErrors).toEqual({
      slug: ['Too short', 'Lowercase letters only'],
    })
  })

  it('reports problems with the value as a whole as form errors', () => {
    const { formErrors, fieldErrors } = groupIssues(issuesOf(updateDocumentSchema, {}))

    expect(formErrors).toEqual(['Provide at least one field to update'])
    expect(fieldErrors).toEqual({})
  })

  it('roots bare values at the given prefix', () => {
    const { formErrors, fieldErrors } = groupIssues(issuesOf(z.uuid(), 'nope'), ['id'])

    expect(formErrors).toEqual([])
    expect(Object.keys(fieldErrors)).toEqual(['id'])
  })

  it('keeps field names that look like prototype members as plain data', () => {
    const issues: z.core.$ZodIssue[] = ['__proto__', 'constructor'].map((key) => ({
      code: 'custom',
      path: [key],
      message: `Bad ${key}`,
    }))
    const { fieldErrors } = groupIssues(issues)

    expect(Object.getPrototypeOf(fieldErrors)).toBe(Object.prototype)
    expect(Object.entries(fieldErrors)).toEqual([
      ['__proto__', ['Bad __proto__']],
      ['constructor', ['Bad constructor']],
    ])
  })
})
