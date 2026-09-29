// @ts-check
import { exit, stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'

const SIGINT_EXIT_CODE = 130

/**
 * @template {string} T
 * @typedef {{ value: T, label: string }} Choice
 */

/** @returns {boolean} */
export function isInteractive() {
  return Boolean(stdin.isTTY && stdout.isTTY)
}

/**
 * Asks one question; `secret` hides the answer. Each call releases stdin before returning, so
 * child processes can prompt in between.
 * @param {string} question
 * @param {{ fallback?: string, secret?: boolean }} [options] `fallback` answers an empty reply.
 * @returns {Promise<string>}
 */
export async function ask(question, { fallback = '', secret = false } = {}) {
  let muted = false
  const output = new Writable({
    write(chunk, _encoding, done) {
      if (!muted) stdout.write(chunk)
      done()
    },
  })
  const readline = createInterface({ input: stdin, output, terminal: true })
  readline.on('SIGINT', () => {
    stdout.write('\n')
    exit(SIGINT_EXIT_CODE)
  })
  try {
    const answer = readline.question(`${question}: `)
    muted = secret
    const value = (await answer).trim()
    if (secret) stdout.write('\n')
    return value || fallback
  } finally {
    readline.close()
  }
}

/**
 * Numbered menu; an empty reply picks the first choice.
 * @template {string} T
 * @param {string} question
 * @param {ReadonlyArray<Choice<T>>} choices
 * @returns {Promise<T>}
 */
export async function choose(question, choices) {
  stdout.write(`${question}\n`)
  choices.forEach(({ label }, index) => stdout.write(`  ${index + 1}) ${label}\n`))
  for (;;) {
    const reply = await ask(`Choose 1-${choices.length}`, { fallback: '1' })
    const choice = choices[Number(reply) - 1]
    if (choice) return choice.value
  }
}
