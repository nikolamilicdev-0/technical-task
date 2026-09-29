// @ts-check
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { env as processEnv } from 'node:process'
import { parseEnv } from 'node:util'

/** @typedef {Record<string, string | undefined>} EnvValues */
/** @typedef {'created' | 'kept' | 'replaced'} EnvFileOutcome */

const WORKSPACE_MARKER = 'pnpm-workspace.yaml'
const ASSIGNMENT = /^(\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=)(.*)$/
// Node's parser ends an unquoted value at `#` and trims whitespace, so such values need quotes.
const UNQUOTED_SAFE = /^[^\s#'"`\\]*$/
const LITERAL_QUOTES = ["'", '`']

/**
 * Walks up from `start` to the workspace root, the directory holding pnpm-workspace.yaml.
 * @param {string} [start]
 * @returns {string}
 */
export function findRepoRoot(start = import.meta.dirname) {
  let directory = start
  while (!existsSync(join(directory, WORKSPACE_MARKER))) {
    const parent = dirname(directory)
    if (parent === directory) throw new Error(`No ${WORKSPACE_MARKER} found above ${start}`)
    directory = parent
  }
  return directory
}

/**
 * @param {string} root
 * @returns {{ env: string, example: string }}
 */
export function envFilePaths(root) {
  return { env: join(root, '.env'), example: join(root, '.env.example') }
}

/**
 * @param {string} path
 * @returns {EnvValues}
 */
export function readEnvFile(path) {
  return existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : {}
}

/**
 * The `.env` values overlaid with the real environment, which wins (the apps load it the same way).
 * @param {string} path
 * @returns {EnvValues}
 */
export function loadEnvironment(path) {
  return { ...readEnvFile(path), ...processEnv }
}

/**
 * Creates `.env` from the template when missing; `force` replaces it after saving `.env.backup`.
 * @param {{ env: string, example: string }} paths
 * @param {boolean} force
 * @returns {EnvFileOutcome}
 */
export function ensureEnvFile({ env, example }, force) {
  if (!existsSync(env)) {
    copyFileSync(example, env)
    return 'created'
  }
  if (!force) return 'kept'
  copyFileSync(env, `${env}.backup`)
  copyFileSync(example, env)
  return 'replaced'
}

/**
 * Sets `updates` in place, keeping line order, comments and trailing notes; unknown keys are
 * appended. The file is rewritten only when a value changes.
 * @param {string} path
 * @param {Record<string, string>} updates
 * @returns {string[]} The keys whose value changed.
 */
export function upsertEnvFile(path, updates) {
  const source = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const current = parseEnv(source)
  const changed = Object.keys(updates).filter((key) => current[key] !== updates[key])
  if (changed.length === 0) return []

  const rewritten = new Set()
  const lines = source.split('\n').map((line) => {
    const [, prefix = '', key = '', rawValue = ''] = ASSIGNMENT.exec(line) ?? []
    const value = updates[key]
    if (value === undefined || !changed.includes(key)) return line
    rewritten.add(key)
    return `${prefix}${formatValue(value)}${trailingNote(rawValue)}`
  })
  const appended = changed.filter((key) => !rewritten.has(key))
  if (appended.length > 0) {
    if (lines.at(-1) === '') lines.pop()
    lines.push(...appended.map((key) => `${key}=${formatValue(updates[key] ?? '')}`), '')
  }

  const next = lines.join('\n')
  assertRoundTrip(next, updates)
  writeFileSync(path, next)
  return changed
}

/**
 * @param {string} value
 * @returns {string}
 */
function formatValue(value) {
  if (UNQUOTED_SAFE.test(value)) return value
  if (value.includes('\n')) throw new Error('Multi-line .env values are not supported')
  const quote = LITERAL_QUOTES.find((candidate) => !value.includes(candidate))
  if (!quote) throw new Error("A .env value cannot contain both ' and ` characters")
  return `${quote}${value}${quote}`
}

/**
 * The whitespace and `# note` that follow a raw value, so that rewriting the value keeps them.
 * @param {string} rawValue
 * @returns {string}
 */
function trailingNote(rawValue) {
  const value = rawValue.trimStart()
  const quote = value[0]
  if (quote === "'" || quote === '"' || quote === '`') {
    const end = value.indexOf(quote, 1)
    return end === -1 ? '' : value.slice(end + 1)
  }
  const hash = rawValue.indexOf('#')
  return hash === -1 ? '' : rawValue.slice(rawValue.slice(0, hash).trimEnd().length)
}

/**
 * @param {string} content
 * @param {Record<string, string>} updates
 */
function assertRoundTrip(content, updates) {
  const parsed = parseEnv(content)
  const drifted = Object.keys(updates).filter((key) => parsed[key] !== updates[key])
  if (drifted.length > 0) {
    throw new Error(`Refusing to write .env: ${drifted.join(', ')} would not read back unchanged`)
  }
}
