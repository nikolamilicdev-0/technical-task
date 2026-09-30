import { describe, expect, it } from 'vitest'

import {
  closesFence,
  fenceAfter,
  openingFence,
} from '../../../../../src/modules/ingestion/chunking/code-fences.js'

const BACKTICKS = { marker: '`', length: 3 }
const TILDES = { marker: '~', length: 4 }

describe('openingFence', () => {
  it.each([
    ['```', BACKTICKS],
    ['```ts title="app.ts"', BACKTICKS],
    ['   ~~~~', TILDES],
    ['`````', { marker: '`', length: 5 }],
  ])('opens a fence at %j', (line, fence) => {
    expect(openingFence(line)).toEqual(fence)
  })

  it.each([
    ['two backticks', '``'],
    ['four spaces of indentation (indented code)', '    ```'],
    ['inline code with backticks in the info string', '```not a fence```'],
    ['prose', 'Run the tests.'],
  ])('ignores %s', (_, line) => {
    expect(openingFence(line)).toBeUndefined()
  })
})

describe('closesFence', () => {
  it.each([
    ['the same run', '```', BACKTICKS, true],
    ['a longer run with trailing spaces', '`````  ', BACKTICKS, true],
    ['a shorter run', '~~~', TILDES, false],
    ['the other character', '~~~~', BACKTICKS, false],
    ['a run followed by text', '``` js', BACKTICKS, false],
  ])('%s → %s', (_, line, fence, expected) => {
    expect(closesFence(line, fence)).toBe(expected)
  })
})

describe('fenceAfter', () => {
  it('opens, keeps and closes a fence line by line', () => {
    const opened = fenceAfter('```sh', undefined)

    expect(opened).toEqual(BACKTICKS)
    expect(fenceAfter('# not a heading', opened)).toBe(opened)
    expect(fenceAfter('```', opened)).toBeUndefined()
  })
})
