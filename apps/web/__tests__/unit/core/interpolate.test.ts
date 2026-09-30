import { describe, expect, it } from 'vitest'

import { interpolate, pluralize } from '@/core/i18n/interpolate'

describe('interpolate', () => {
  it('fills named placeholders', () => {
    expect(interpolate('Signed in as {email}', { email: 'ada@example.com' })).toBe(
      'Signed in as ada@example.com'
    )
  })

  it('stringifies numbers and fills repeated placeholders', () => {
    expect(interpolate('{n} of {n} in {seconds} s', { n: 3, seconds: 30 })).toBe('3 of 3 in 30 s')
  })

  it('leaves unknown placeholders visible', () => {
    expect(interpolate('Hello {name}', {})).toBe('Hello {name}')
  })

  it('ignores inherited object keys', () => {
    expect(interpolate('{toString}', {})).toBe('{toString}')
  })
})

describe('pluralize', () => {
  const documents = { one: '{count} document', other: '{count} documents' }

  it('uses the singular form for one', () => {
    expect(pluralize(documents, 1)).toBe('1 document')
  })

  it('uses the other form for zero and many', () => {
    expect(pluralize(documents, 0)).toBe('0 documents')
    expect(pluralize(documents, 2)).toBe('2 documents')
  })

  it('formats the count for the locale', () => {
    expect(pluralize(documents, 1200)).toBe('1,200 documents')
  })

  it('falls back to the other form when a category is missing', () => {
    expect(pluralize({ other: '{count} items' }, 1)).toBe('1 items')
  })

  it('fills extra values alongside the count', () => {
    const forms = { one: '{count} file in {folder}', other: '{count} files in {folder}' }
    expect(pluralize(forms, 4, { folder: 'Notes' })).toBe('4 files in Notes')
  })
})
