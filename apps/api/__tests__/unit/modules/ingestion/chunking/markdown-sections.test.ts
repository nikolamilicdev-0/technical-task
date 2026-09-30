import { describe, expect, it } from 'vitest'

import { splitMarkdownSections } from '../../../../../src/modules/ingestion/chunking/markdown-sections.js'
import { LINEAR_TIME_BUDGET_MS, timed } from '../../../../fixtures/timing.js'

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

  it('keeps the text of a heading that nothing, not even a deeper heading, follows', () => {
    const markdown = lines('# Guide', '## Setup', '## Usage', 'Run it.', '### Flags', '#', '# End')

    expect(splitMarkdownSections(markdown)).toEqual([
      { headingPath: ['Guide', 'Setup'], body: 'Setup' },
      { headingPath: ['Guide', 'Usage'], body: 'Run it.' },
      { headingPath: ['Guide', 'Usage', 'Flags'], body: 'Flags' },
      { headingPath: ['End'], body: 'End' },
    ])
  })

  it('parses a heading holding long runs of blanks and hashes in linear time', () => {
    const text = `a${' '.repeat(100_000)}b`
    const markdown = lines(`# ${text}  `, 'x', `## c ${'#'.repeat(100_000)}`, 'y')

    const { value, ms } = timed(() => splitMarkdownSections(markdown))

    expect(value.map((section) => section.headingPath)).toEqual([[text], [text, 'c']])
    expect(ms).toBeLessThan(LINEAR_TIME_BUDGET_MS)
  })
})
