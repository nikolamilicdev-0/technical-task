// @ts-check
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { env as processEnv } from 'node:process'
import { parseEnv } from 'node:util'

import { findOnPath, run } from './exec.mjs'

/** @typedef {import('./env.mjs').EnvValues} EnvValues */
/** @typedef {import('./exec.mjs').RunOptions} RunOptions */
/** @typedef {import('./exec.mjs').RunResult} RunResult */
/** @typedef {'local' | 'hosted'} DatabaseTarget */

/**
 * @typedef {object} SupabaseCli
 * @property {(args: readonly string[], options?: RunOptions) => Promise<RunResult>} run
 * @property {() => Promise<EnvValues | undefined>} status `supabase status -o env` of the running local stack.
 */

/**
 * @typedef {object} TypesSource
 * @property {string} description
 * @property {string[]} flags
 * @property {NodeJS.ProcessEnv} [env]
 */

export const DATABASE_TYPES_PATH = 'apps/api/src/database/database.types.ts'
const CLI_DOWNLOAD = ['pnpm', 'dlx', 'supabase@2']
const DOCKER_PROBE_TIMEOUT_MS = 15_000
const LOOPBACK_HOSTS = new Set(['localhost', '[::1]', '0.0.0.0'])
const LOOPBACK_IPV4 = /^127(\.\d{1,3}){3}$/

/**
 * Uses the workspace CLI, then a global install, then a one-off `pnpm dlx` download.
 * @param {string} root
 * @returns {SupabaseCli}
 */
export function createSupabaseCli(root) {
  const [command = '', ...prefix] = resolveCliCommand(root)
  /** @type {SupabaseCli} */
  const cli = {
    run: (args, options = {}) =>
      run(command, [...prefix, ...args], {
        cwd: root,
        label: `supabase ${subcommand(args)}`,
        ...options,
      }),
    async status() {
      const result = await cli.run(['status', '-o', 'env'], { capture: true, allowFailure: true })
      return result.exitCode === 0 ? parseEnv(result.stdout) : undefined
    },
  }
  return cli
}

/** @returns {Promise<boolean>} */
export async function isDockerRunning() {
  try {
    const probe = await run('docker', ['info', '--format', '{{.ServerVersion}}'], {
      capture: true,
      allowFailure: true,
      timeoutMs: DOCKER_PROBE_TIMEOUT_MS,
    })
    return probe.exitCode === 0
  } catch {
    return false // Docker is not installed.
  }
}

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isLoopbackUrl(url) {
  const { hostname } = new URL(url)
  return (
    LOOPBACK_HOSTS.has(hostname) || LOOPBACK_IPV4.test(hostname) || hostname.endsWith('.localhost')
  )
}

/**
 * Which database `.env` points at; an empty SUPABASE_URL means the local stack.
 * @param {string | undefined} supabaseUrl
 * @returns {DatabaseTarget}
 */
export function databaseTarget(supabaseUrl) {
  if (!supabaseUrl) return 'local'
  if (!URL.canParse(supabaseUrl)) throw new Error(`SUPABASE_URL is not a valid URL: ${supabaseUrl}`)
  return isLoopbackUrl(supabaseUrl) ? 'local' : 'hosted'
}

/**
 * CLI flags selecting that database; a hosted project is reached through SUPABASE_DB_URL.
 * @param {EnvValues} env
 * @returns {string[]}
 */
export function connectionFlags(env) {
  if (databaseTarget(env.SUPABASE_URL) === 'local') return ['--local']
  const dbUrl = env.SUPABASE_DB_URL
  if (!dbUrl || !URL.canParse(dbUrl)) {
    throw new Error('SUPABASE_DB_URL must be the project\'s "Session pooler" connection string.')
  }
  if (isLoopbackUrl(dbUrl)) {
    throw new Error('SUPABASE_URL is a hosted project but SUPABASE_DB_URL points at localhost.')
  }
  return ['--db-url', dbUrl]
}

/**
 * Regenerates the committed database types; the file is rewritten only when its content changes.
 * @param {string} root
 * @param {SupabaseCli} cli
 * @param {EnvValues} env
 * @returns {Promise<{ source: string, changed: boolean }>}
 */
export async function generateDatabaseTypes(root, cli, env) {
  const source = await resolveTypesSource(cli, env)
  const { stdout } = await cli.run(
    ['gen', 'types', '--lang', 'typescript', '--schema', 'public', ...source.flags],
    { capture: true, env: source.env }
  )
  if (!stdout.trim()) throw new Error('supabase gen types printed nothing')

  const target = join(root, DATABASE_TYPES_PATH)
  const changed = !existsSync(target) || readFileSync(target, 'utf8') !== stdout
  if (changed) {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, stdout)
  }
  return { source: source.description, changed }
}

/**
 * The running local stack first (it mirrors the committed migrations), then the Management API,
 * then a direct connection to the hosted database.
 * @param {SupabaseCli} cli
 * @param {EnvValues} env
 * @returns {Promise<TypesSource>}
 */
async function resolveTypesSource(cli, env) {
  if (await cli.status()) return { description: 'the local database', flags: ['--local'] }
  const { SUPABASE_PROJECT_REF: ref, SUPABASE_ACCESS_TOKEN: token } = env
  if (ref && token) {
    return {
      description: `project ${ref}`,
      flags: ['--project-id', ref],
      env: { ...processEnv, SUPABASE_ACCESS_TOKEN: token },
    }
  }
  if (databaseTarget(env.SUPABASE_URL) === 'hosted' && env.SUPABASE_DB_URL) {
    return { description: 'SUPABASE_DB_URL', flags: connectionFlags(env) }
  }
  throw new Error(
    [
      'No database to generate types from.',
      '  Local:  start Docker Desktop, then run `pnpm db:start`.',
      '  Hosted: set SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN (or SUPABASE_DB_URL) in .env.',
    ].join('\n')
  )
}

/**
 * @param {string} root
 * @returns {readonly string[]} The command and any leading arguments.
 */
function resolveCliCommand(root) {
  const workspaceBin = join(root, 'node_modules', '.bin', 'supabase')
  if (existsSync(workspaceBin)) return [workspaceBin]
  const globalBin = findOnPath('supabase')
  return globalBin ? [globalBin] : CLI_DOWNLOAD
}

/**
 * The words before the first flag (`db push`): names a command without echoing its values.
 * @param {readonly string[]} args
 * @returns {string}
 */
function subcommand(args) {
  const firstFlag = args.findIndex((arg) => arg.startsWith('-'))
  return args.slice(0, firstFlag === -1 ? args.length : firstFlag).join(' ')
}
