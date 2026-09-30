// @ts-check
import { stderr, stdout } from 'node:process'
import { styleText } from 'node:util'

import { CommandError } from './exec.mjs'

/** @typedef {Parameters<typeof styleText>[0]} TextStyle */
/** @typedef {ReadonlyArray<readonly [label: string, value: string]>} TableRows */

const STDERR_TAIL_LINES = 20

/**
 * Colours only when the stream is a terminal that allows it (honours NO_COLOR and FORCE_COLOR).
 * @param {TextStyle} style
 * @param {string} text
 * @param {NodeJS.WriteStream} [stream]
 */
export const paint = (style, text, stream = stdout) => styleText(style, text, { stream })

export const log = {
  /** @param {string} title */
  section: (title) => stdout.write(`\n${paint(['bold', 'cyan'], title)}\n`),
  /** @param {string} text */
  info: (text) => stdout.write(`  ${text}\n`),
  /** @param {string} text */
  success: (text) => stdout.write(`${paint('green', '✓')} ${text}\n`),
  /** @param {string} text */
  warn: (text) => stderr.write(`${paint('yellow', '!', stderr)} ${text}\n`),
  /** @param {string} text */
  error: (text) => stderr.write(`${paint('red', '✗', stderr)} ${text}\n`),
  /** @param {TableRows} rows */
  table(rows) {
    const width = Math.max(0, ...rows.map(([label]) => label.length))
    for (const [label, value] of rows) {
      stdout.write(`  ${paint('dim', label.padEnd(width))}  ${value}\n`)
    }
  },
}

/**
 * Prints an error for a human; for a failed command that captured output, its last stderr lines.
 * @param {unknown} error
 */
export function reportError(error) {
  log.error(error instanceof Error ? error.message : String(error))
  if (error instanceof CommandError && error.stderr.trim()) {
    const tail = error.stderr.trimEnd().split('\n').slice(-STDERR_TAIL_LINES)
    stderr.write(`${tail.map((line) => `    ${line}`).join('\n')}\n`)
  }
}
