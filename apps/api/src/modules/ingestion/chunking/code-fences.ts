import type { CodeFence } from './chunker.types.js'

const FENCE_OPENING = /^ {0,3}(`{3,}|~{3,})(.*)$/
const FENCE_CLOSING = /^ {0,3}(`{3,}|~{3,})[ \t]*$/
const BACKTICK = '`'

// A backtick fence's info string cannot contain backticks (CommonMark).
export function openingFence(line: string): CodeFence | undefined {
  const match = FENCE_OPENING.exec(line)
  if (match === null) return undefined
  const [, run = '', info = ''] = match
  const marker = run.charAt(0)
  if (marker === BACKTICK && info.includes(BACKTICK)) return undefined
  return { marker, length: run.length }
}

export function closesFence(line: string, fence: CodeFence): boolean {
  const run = FENCE_CLOSING.exec(line)?.[1]
  return run !== undefined && run.charAt(0) === fence.marker && run.length >= fence.length
}

export function fenceAfter(line: string, fence: CodeFence | undefined): CodeFence | undefined {
  if (fence === undefined) return openingFence(line)
  return closesFence(line, fence) ? undefined : fence
}
