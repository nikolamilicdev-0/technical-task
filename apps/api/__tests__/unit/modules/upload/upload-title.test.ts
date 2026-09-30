import { DOCUMENT_TITLE_MAX, documentTitleSchema } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { titleFromFilename } from '../../../../src/modules/upload/upload-title.js'

describe('titleFromFilename', () => {
  it.each([
    ['notes.md', 'notes'],
    ['Quarterly report (final).PDF', 'Quarterly report (final)'],
    ['  spaced out  .txt', 'spaced out'],
    ['v1.2 changelog.md', 'v1.2 changelog'],
    ['README', 'README'],
    ['.md', '.md'],
  ])('turns %s into %s', (filename, title) => {
    expect(titleFromFilename(filename)).toBe(title)
  })

  it('cuts long names to a valid title without splitting a character', () => {
    const title = titleFromFilename(`${'a'.repeat(DOCUMENT_TITLE_MAX - 1)}🌍 and more.txt`)

    expect(title).toBe('a'.repeat(DOCUMENT_TITLE_MAX - 1))
    expect(documentTitleSchema.safeParse(title).success).toBe(true)
  })

  it('falls back to a placeholder when the name has nothing but an extension', () => {
    expect(titleFromFilename('   .txt')).toBe('Untitled document')
  })
})
