// @ts-check
import { spawn } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { basename, delimiter, join } from 'node:path'
import { env as processEnv } from 'node:process'

/**
 * @typedef {object} RunOptions
 * @property {string} [cwd]
 * @property {NodeJS.ProcessEnv} [env] Replaces the inherited environment.
 * @property {boolean} [capture] Pipe stdout and stderr and return them instead of printing them.
 * @property {boolean} [allowFailure] Resolve with the exit code instead of rejecting on failure.
 * @property {number} [timeoutMs]
 * @property {string} [label] Names the command in errors; arguments are never echoed (they may hold secrets).
 */

/**
 * @typedef {object} RunResult
 * @property {number} exitCode
 * @property {string} stdout Empty unless `capture` is set.
 * @property {string} stderr Empty unless `capture` is set.
 */

/** A command that could not be started or exited unsuccessfully. */
export class CommandError extends Error {
  /**
   * @param {string} message
   * @param {{ exitCode?: number, stderr?: string }} [details]
   */
  constructor(message, { exitCode, stderr = '' } = {}) {
    super(message)
    this.name = 'CommandError'
    this.exitCode = exitCode
    this.stderr = stderr
  }
}

/**
 * Runs a command without a shell, so arguments reach it verbatim whatever they contain.
 * @param {string} command
 * @param {readonly string[]} args
 * @param {RunOptions} [options]
 * @returns {Promise<RunResult>}
 */
export function run(command, args, options = {}) {
  const { cwd, env, capture = false, allowFailure = false, timeoutMs, label } = options
  const name = label ?? basename(command)
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      timeout: timeoutMs,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.setEncoding('utf8').on('data', (/** @type {string} */ chunk) => {
      stdout += chunk
    })
    child.stderr?.setEncoding('utf8').on('data', (/** @type {string} */ chunk) => {
      stderr += chunk
    })
    child.once('error', (error) => {
      const notFound = /** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT'
      reject(
        new CommandError(notFound ? `${name}: command not found` : `${name}: ${error.message}`)
      )
    })
    child.once('close', (code, signal) => {
      const exitCode = code ?? 1
      if (exitCode === 0 || allowFailure) {
        resolve({ exitCode, stdout, stderr })
        return
      }
      const reason = signal ? `was stopped by ${signal}` : `exited with code ${exitCode}`
      reject(new CommandError(`${name} ${reason}`, { exitCode, stderr }))
    })
  })
}

/**
 * Finds an executable on PATH without running it.
 * @param {string} name
 * @returns {string | undefined}
 */
export function findOnPath(name) {
  for (const directory of (processEnv.PATH ?? '').split(delimiter)) {
    if (!directory) continue
    const candidate = join(directory, name)
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // Not in this directory; keep looking.
    }
  }
  return undefined
}
