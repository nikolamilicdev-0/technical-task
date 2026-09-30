// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { buildCitation, buildCitations } from '@/__tests__/fixtures/chat'
import {
  citationHref,
  linkifyCitations,
  markCited,
  parseCitationHref,
  relativeRelevance,
  sectionPath,
  toPlainExcerpt,
  topScore,
} from '@/features/chat/lib/citations'

const SOURCES = 6

describe('linkifyCitations', () => {
  it('turns an in-range marker into a citation link', () => {
    expect(linkifyCitations('Install it first [1].', SOURCES)).toBe(
      'Install it first [1](#cite-1).'
    )
  })

  it('splits a marker list into one link per source', () => {
    expect(linkifyCitations('Both agree [2, 4].', SOURCES)).toBe(
      'Both agree [2](#cite-2)[4](#cite-4).'
    )
  })

  it('links adjacent markers', () => {
    expect(linkifyCitations('See [1][2].', SOURCES)).toBe('See [1](#cite-1)[2](#cite-2).')
  })

  it('tolerates spaces inside the brackets', () => {
    expect(linkifyCitations('Yes [ 3 ].', SOURCES)).toBe('Yes [3](#cite-3).')
  })

  it('leaves markers without a matching source as written', () => {
    expect(linkifyCitations('Unknown [7] and [0].', SOURCES)).toBe('Unknown [7] and [0].')
  })

  it('drops out-of-range numbers from a list that also names real sources', () => {
    expect(linkifyCitations('Mixed [2, 9].', SOURCES)).toBe('Mixed [2](#cite-2).')
  })

  it('leaves real links, link definitions, images and escaped brackets alone', () => {
    const markdown = '[1](http://x) ![1] \\[1]\n\n[1]: http://example.com'
    expect(linkifyCitations(markdown, SOURCES)).toBe(markdown)
  })

  it('leaves inline code and fenced code untouched', () => {
    const markdown = 'Use `items[1]` [1]\n\n```ts\nconst first = items[1]\n```\nDone [2].'
    expect(linkifyCitations(markdown, SOURCES)).toBe(
      'Use `items[1]` [1](#cite-1)\n\n```ts\nconst first = items[1]\n```\nDone [2](#cite-2).'
    )
  })

  it('treats an unclosed fence as code to the end, as it streams in', () => {
    const markdown = 'Intro [1]\n\n```\nitems[2]'
    expect(linkifyCitations(markdown, SOURCES)).toBe('Intro [1](#cite-1)\n\n```\nitems[2]')
  })

  it('changes nothing when the answer has no sources', () => {
    expect(linkifyCitations('Nothing [1].', 0)).toBe('Nothing [1].')
  })
})

describe('parseCitationHref', () => {
  it('reads the source number of a citation link', () => {
    expect(parseCitationHref(citationHref(3))).toBe(3)
  })

  it.each([undefined, '', 'http://x', '#cite-', '#cite-3x', '#section'])(
    'is null for other links (%s)',
    (href) => {
      expect(parseCitationHref(href)).toBeNull()
    }
  )
})

describe('markCited', () => {
  it('flags the sources the answer cites, outside code, within range', () => {
    const cited = markCited(buildCitations(3), 'A [1, 3] and `x[2]` and [9].')
    expect(cited.map((citation) => citation.cited)).toEqual([true, false, true])
  })

  it('clears flags the answer no longer supports', () => {
    const [marked] = markCited([buildCitation({ cited: true })], 'No markers.')
    expect(marked?.cited).toBe(false)
  })
})

describe('sectionPath', () => {
  const citation = (headingPath: string) => buildCitation({ documentTitle: 'Guide', headingPath })

  it('drops the document title the breadcrumb starts with', () => {
    expect(sectionPath(citation('Guide › Setup › Linux'))).toBe('Setup › Linux')
  })

  it('is null for a passage above the first heading', () => {
    expect(sectionPath(citation('Guide'))).toBeNull()
    expect(sectionPath(citation(''))).toBeNull()
  })

  it('keeps a breadcrumb that starts with another title as it is', () => {
    expect(sectionPath(citation('Old title › Setup'))).toBe('Old title › Setup')
  })
})

describe('toPlainExcerpt', () => {
  it('strips the Markdown of a one-line excerpt, headings included', () => {
    expect(toPlainExcerpt('# Guide ## First week Collect your **laptop** from `IT`.')).toBe(
      'Guide First week Collect your laptop from IT.'
    )
  })

  it('keeps hashes that are not heading markers', () => {
    expect(toPlainExcerpt('Written in C# for issue #42.')).toBe('Written in C# for issue #42.')
  })
})

describe('relevance', () => {
  const citations = [buildCitation({ score: 0.032 }), buildCitation({ index: 2, score: 0.016 })]

  it('finds the best score of a message', () => {
    expect(topScore(citations)).toBe(0.032)
    expect(topScore([])).toBe(0)
  })

  it('scales scores against the best one', () => {
    expect(relativeRelevance(0.032, 0.032)).toBe(1)
    expect(relativeRelevance(0.016, 0.032)).toBe(0.5)
  })

  it('stays within 0 and 1 for degenerate scores', () => {
    expect(relativeRelevance(0.5, 0)).toBe(0)
    expect(relativeRelevance(-0.2, 0.4)).toBe(0)
    expect(relativeRelevance(0.9, 0.4)).toBe(1)
  })
})
