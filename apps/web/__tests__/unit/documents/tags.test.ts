import { MAX_TAGS, TAG_MAX_LENGTH } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import {
  addTags,
  hasRoomForTags,
  normalizeTag,
  removeTag,
  toggleTag,
} from '@/features/documents/lib/tags'

const tagsUpTo = (count: number) => Array.from({ length: count }, (_, index) => `tag-${index}`)

describe('normalizeTag', () => {
  it('trims and collapses inner whitespace', () => {
    expect(normalizeTag('  deep \t  work  ')).toBe('deep work')
  })
})

describe('addTags', () => {
  it('adds a trimmed tag', () => {
    expect(addTags(['notes'], '  release ')).toEqual(['notes', 'release'])
  })

  it('splits comma- and line-separated input', () => {
    expect(addTags([], 'design, research\nq3')).toEqual(['design', 'research', 'q3'])
  })

  it('skips blank entries', () => {
    expect(addTags(['notes'], ' , ,\n')).toEqual(['notes'])
  })

  it('skips duplicates, ignoring case and keeping the first spelling', () => {
    expect(addTags(['Design'], 'design, DESIGN, research, Research')).toEqual([
      'Design',
      'research',
    ])
  })

  it('skips tags over the length limit', () => {
    const longest = 'x'.repeat(TAG_MAX_LENGTH)
    expect(addTags([], `${longest}y, ok`)).toEqual(['ok'])
    expect(addTags([], longest)).toEqual([longest])
  })

  it('adds nothing beyond the tag limit', () => {
    const almostFull = tagsUpTo(MAX_TAGS - 1)
    expect(addTags(almostFull, 'a, b, c')).toEqual([...almostFull, 'a'])
    expect(addTags(tagsUpTo(MAX_TAGS), 'd')).toHaveLength(MAX_TAGS)
  })

  it('returns a new array', () => {
    const current = ['notes']
    addTags(current, 'release')
    expect(current).toEqual(['notes'])
  })
})

describe('removeTag', () => {
  it('removes exactly the given tag', () => {
    expect(removeTag(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
    expect(removeTag(['a'], 'A')).toEqual(['a'])
  })
})

describe('hasRoomForTags', () => {
  it('is false once the limit is reached', () => {
    expect(hasRoomForTags(tagsUpTo(MAX_TAGS - 1))).toBe(true)
    expect(hasRoomForTags(tagsUpTo(MAX_TAGS))).toBe(false)
  })
})

describe('toggleTag', () => {
  it('checks and unchecks a tag, keeping the other selections', () => {
    expect(toggleTag(['a'], 'b', true)).toEqual(['a', 'b'])
    expect(toggleTag(['a', 'b'], 'a', false)).toEqual(['b'])
    expect(toggleTag(['a'], 'a', true)).toEqual(['a'])
  })
})
