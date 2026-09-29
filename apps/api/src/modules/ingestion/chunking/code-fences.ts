import type { CodeFence } from './chunker.types.js'

// CommonMark: at most three spaces of indentation, then three or more backticks or tildes.
const FENCE_OPENING = /^ {0,3}(`{3,}|~{3,})(.*)$/
const FENCE_CLOSING = /^ {0,3}(`{3,}|~{3,})[ \t]*$/
const BACKTICK = '`'

/** The fence `line` opens, if any; a backtick fence's info string cannot contain backticks. */
export function openingFence(line: string): CodeFence | undefined {
  const match = FENCE_OPENING.exec(line)
  if (match === null) return undefined
  const [, run = '', info = ''] = match
  const marker = run.charAt(0)
  if (marker === BACKTICK && info.includes(BACKTICK)) return undefined
  return { marker, length: run.length }
}

/** True when `line` closes `fence`: the same character, at least as many, nothing after them. */
export function closesFence(line: string, fence: CodeFence): boolean {
  const run = FENCE_CLOSING.exec(line)?.[1]
  return run !== undefined && run.charAt(0) === fence.marker && run.length >= fence.length
}

/** The fence still open after `line`: opened by it, kept, or none once `line` closes it. */
export function fenceAfter(line: string, fence: CodeFence | undefined): CodeFence | undefined {
  if (fence === undefined) return openingFence(line)
  return closesFence(line, fence) ? undefined : fence
}
