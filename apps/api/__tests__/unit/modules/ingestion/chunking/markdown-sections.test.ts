import { describe, expect, it } from 'vitest'

import { splitMarkdownSections } from '../../../../../src/modules/ingestion/chunking/markdown-sections.js'

const lines = (...text: string[]): string => text.join('\n')

describe('splitMarkdownSections', () => {
  it('keeps text before the first heading as a section without headings', () => {
    expect(splitMarkdownSections(lines('Intro text.', '', '# Guide', 'Body.'))).toEqual([
      { headingPath: [], body: 'Intro text.' },
      { headingPath: ['Guide'], body: 'Body.' },
    ])
  })

  it('nests headings and pops every level at or below a new heading', () => {
    const markdown = lines('# A', 'a', '## B', 'b', '### C', 'c', '## D', 'd', '# E', 'e')

    expect(splitMarkdownSections(markdown).map((section) => section.headingPath)).toEqual([
      ['A'],
      ['A', 'B'],
      ['A', 'B', 'C'],
      ['A', 'D'],
      ['E'],
    ])
  })

  it('handles skipped levels', () => {
    const markdown = lines('# A', 'a', '### C', 'c', '## B', 'b')

    expect(splitMarkdownSections(markdown).map((section) => section.headingPath)).toEqual([
      ['A'],
      ['A', 'C'],
      ['A', 'B'],
    ])
  })

  it.each([
    ['backtick', '```sh'],
    ['tilde', '~~~'],
  ])('leaves `#` lines inside a %s fence in the code', (_, opener) => {
    const closer = opener.slice(0, 3)
    const markdown = lines('## Setup', opener, '# not a heading', closer, 'After the code.')

    expect(splitMarkdownSections(markdown)).toEqual([
      {
        headingPath: ['Setup'],
        body: lines(opener, '# not a heading', closer, 'After the code.'),
      },
    ])
  })

  it('strips closing `#` runs but keeps a `#` that is part of a word', () => {
    const markdown = lines('## Install ##', 'x', '## C#', 'y')

    expect(splitMarkdownSections(markdown).map((section) => section.headingPath)).toEqual([
      ['Install'],
      ['C#'],
    ])
  })

  it.each([
    ['a hashtag', '#hashtag'],
    ['seven hashes', '####### seven'],
    ['an indented code line', '    # comment'],
  ])('does not treat %s as a heading', (_, line) => {
    expect(splitMarkdownSections(lines('Text.', line))).toEqual([
      { headingPath: [], body: lines('Text.', line) },
    ])
  })

  it('drops sections without text, keeping their headings for the ones below', () => {
    expect(splitMarkdownSections(lines('# Guide', '', '## Setup', 'Install it.'))).toEqual([
      { headingPath: ['Guide', 'Setup'], body: 'Install it.' },
    ])
  })
})
