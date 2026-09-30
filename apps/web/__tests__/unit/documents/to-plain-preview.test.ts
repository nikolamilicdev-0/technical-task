import { describe, expect, it } from 'vitest'

import { toPlainPreview } from '@/features/documents/lib/to-plain-preview'

describe('toPlainPreview', () => {
  it.each([
    ['headings', '# Title\n\nBody text', 'Title Body text'],
    [
      'emphasis and strikethrough',
      'Some **bold**, *italic*, _under_ and ~~gone~~ text',
      'Some bold, italic, under and gone text',
    ],
    [
      'links and images',
      'See [the docs](https://example.com) and ![logo](a.png)',
      'See the docs and logo',
    ],
    ['a link cut off by the preview', 'Cut off [link](https://exa', 'Cut off link'],
    ['list and task markers', '- one\n* two\n1. three\n- [x] done', 'one two three done'],
    ['blockquotes', '> quoted', 'quoted'],
    ['code fences, keeping the code', '```ts\nconst x = 1\n```', 'const x = 1'],
    ['inline code', 'Use `pnpm dev` now', 'Use pnpm dev now'],
    ['tables', '| a | b |\n|---|---|\n| 1 | 2 |', 'a b 1 2'],
    ['horizontal rules', 'Line one\n\n---\n\nLine two', 'Line one Line two'],
    ['raw HTML', 'A <br> break', 'A break'],
    ['reference definitions', 'Text\n\n[1]: https://example.com', 'Text'],
  ])('strips %s', (_case, markdown, expected) => {
    expect(toPlainPreview(markdown)).toBe(expected)
  })

  it('leaves identifiers with underscores alone', () => {
    expect(toPlainPreview('Set snake_case_name and __init__ carefully')).toBe(
      'Set snake_case_name and init carefully'
    )
  })

  it('returns an empty string for markup without text', () => {
    expect(toPlainPreview('---\n\n***')).toBe('')
    expect(toPlainPreview('')).toBe('')
  })
})
