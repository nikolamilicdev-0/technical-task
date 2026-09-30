import { DOCUMENT_TITLE_MAX, MAX_TAGS } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { uploadFieldsSchema } from '../../../../src/modules/upload/upload.schema.js'

function fields(body: Record<string, unknown>) {
  // Multer builds the body on a null-prototype object.
  const multipartBody: object = Object.assign(Object.create(null) as object, body)
  return uploadFieldsSchema.safeParse(multipartBody)
}

describe('uploadFieldsSchema', () => {
  it('needs no field at all, nor a body', () => {
    expect(fields({}).data).toEqual({ tags: [] })
    expect(uploadFieldsSchema.parse(undefined)).toEqual({ tags: [] })
  })

  it('trims a title and treats a blank one as not given', () => {
    expect(fields({ title: '  Notes  ' }).data?.title).toBe('Notes')
    expect(fields({ title: '   ' }).data?.title).toBeUndefined()
  })

  it('accepts one tag part or repeated parts, dropping blanks and duplicates', () => {
    expect(fields({ tags: 'release' }).data?.tags).toEqual(['release'])
    expect(fields({ tags: ['release', ' q3 ', '', 'release'] }).data?.tags).toEqual([
      'release',
      'q3',
    ])
  })

  it.each([
    ['a title over the limit', { title: 'x'.repeat(DOCUMENT_TITLE_MAX + 1) }, 'title'],
    ['too many tags', { tags: Array.from({ length: MAX_TAGS + 1 }, (_, i) => `t${i}`) }, 'tags'],
    ['a repeated title', { title: ['One', 'Two'] }, 'title'],
  ])('rejects %s', (_, body, field) => {
    const result = fields(body)

    expect(result.success).toBe(false)
    expect(result.error?.issues.map(({ path }) => path[0])).toContain(field)
  })
})
