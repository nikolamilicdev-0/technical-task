// @ts-check
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

import { loadEnvironment, upsertEnvFile } from '../lib/env.mjs'
import { log } from '../lib/log.mjs'
import {
  connectionFlags,
  generateDatabaseTypes,
  isDockerRunning,
  isLoopbackUrl,
} from '../lib/supabase.mjs'
import { ask } from './prompt.mjs'

/** @typedef {import('../lib/env.mjs').EnvValues} EnvValues */
/** @typedef {import('../lib/log.mjs').TableRows} TableRows */

/**
 * @typedef {object} DatabaseContext
 * @property {string} root
 * @property {string} envPath
 * @property {import('../lib/supabase.mjs').SupabaseCli} cli
 * @property {boolean} interactive
 * @property {boolean} yes
 */

/**
 * @typedef {object} HostedField
 * @property {string} key
 * @property {string} label
 * @property {string} expected
 * @property {boolean} secret
 * @property {(value: string) => boolean} isValid
 */

const JWT = /^[\w-]+\.[\w-]+\.[\w-]+$/
const PROJECT_URL = /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/
const HTTP_PROTOCOLS = ['https:', 'http:']
const POSTGRES_PROTOCOLS = ['postgresql:', 'postgres:']

/** @type {readonly HostedField[]} */
const HOSTED_FIELDS = [
  {
    key: 'SUPABASE_URL',
    label: 'Project URL',
    expected: 'https://<project-ref>.supabase.co',
    secret: false,
    isValid: (value) => isRemoteUrl(value, HTTP_PROTOCOLS),
  },
  {
    key: 'SUPABASE_PUBLISHABLE_KEY',
    label: 'Publishable key',
    expected: 'sb_publishable_… or the legacy anon JWT',
    secret: false,
    isValid: (value) => value.startsWith('sb_publishable_') || JWT.test(value),
  },
  {
    key: 'SUPABASE_SECRET_KEY',
    label: 'Secret key',
    expected: 'sb_secret_… or the legacy service_role JWT',
    secret: true,
    isValid: (value) => value.startsWith('sb_secret_') || JWT.test(value),
  },
  {
    key: 'SUPABASE_DB_URL',
    label: 'Session pooler connection string',
    expected: 'postgresql://postgres.<ref>:<percent-encoded password>@<host>:5432/postgres',
    secret: true,
    isValid: (value) => isRemoteUrl(value, POSTGRES_PROTOCOLS),
  },
]

/**
 * Starts the local stack when needed, writes its URLs and keys to .env, applies pending
 * migrations and regenerates the database types.
 * @param {DatabaseContext} context
 * @returns {Promise<TableRows>}
 */
export async function setupLocalDatabase({ root, envPath, cli }) {
  log.section('Local Supabase')
  if (!(await isDockerRunning())) {
    throw new Error(
      'Docker is not running. Start Docker Desktop (`open -a Docker`) and re-run, or use --hosted.'
    )
  }
  let status = await cli.status()
  if (status) {
    log.success('Supabase is already running')
  } else {
    log.info('Starting Supabase; the first run downloads Docker images and takes several minutes.')
    await cli.run(['start'])
    status = await cli.status()
  }
  if (!status) {
    throw new Error('Supabase started, but `supabase status` fails; see `pnpm db:status`.')
  }

  reportEnvUpdate(upsertEnvFile(envPath, localSupabaseEnv(status)))
  await cli.run(['migration', 'up', '--local'])
  const types = await generateDatabaseTypes(root, cli, loadEnvironment(envPath))
  log.success(`Database types ${types.changed ? 'regenerated' : 'unchanged'}`)
  return [
    ['Database', `local Supabase at ${status.API_URL ?? ''}, migrations up to date`],
    ['Studio', status.STUDIO_URL ?? ''],
    ['DB types', types.changed ? 'regenerated' : 'unchanged'],
  ]
}

/**
 * Collects the project's URLs and keys (from .env, asking for what is missing when interactive)
 * and pushes the migrations to it. The committed types are kept unless a token allows a refresh.
 * @param {DatabaseContext} context
 * @returns {Promise<TableRows>}
 */
export async function setupHostedDatabase({ root, envPath, cli, interactive, yes }) {
  log.section('Hosted Supabase project')
  log.info('Values: Project Settings → API keys and Data API; Connect → Session pooler.')
  const current = loadEnvironment(envPath)
  /** @type {Record<string, string>} */
  const values = {}
  const invalid = []
  for (const field of HOSTED_FIELDS) {
    const existing = current[field.key] ?? ''
    const known = field.isValid(existing) ? existing : ''
    const value = interactive ? await askField(field, known) : known
    if (field.isValid(value)) values[field.key] = value
    else invalid.push(field.key)
  }
  if (invalid.length > 0) {
    throw new Error(`Missing or invalid: ${invalid.join(', ')}. Set them in .env and re-run.`)
  }
  const projectRef = PROJECT_URL.exec(values.SUPABASE_URL ?? '')?.[1]
  if (projectRef && !current.SUPABASE_PROJECT_REF) values.SUPABASE_PROJECT_REF = projectRef
  reportEnvUpdate(upsertEnvFile(envPath, values))

  const env = loadEnvironment(envPath)
  await cli.run(['db', 'push', ...connectionFlags(env), ...(yes ? ['--yes'] : [])])
  const canRefreshTypes = Boolean(env.SUPABASE_PROJECT_REF && env.SUPABASE_ACCESS_TOKEN)
  const types = canRefreshTypes ? await generateDatabaseTypes(root, cli, env) : undefined
  log.warn(
    'Turn off "Confirm email" (Authentication → Sign In / Providers → Email) for instant sign-up.'
  )
  return [
    ['Database', `hosted project ${projectRef ?? values.SUPABASE_URL ?? ''}, migrations pushed`],
    ['DB types', types ? (types.changed ? 'regenerated' : 'unchanged') : 'committed copy kept'],
  ]
}

/**
 * @param {string} root
 * @returns {TableRows}
 */
export function describeManualSetup(root) {
  log.section('Database skipped')
  const migrations = readdirSync(join(root, 'supabase', 'migrations'))
    .filter((name) => name.endsWith('.sql'))
    .sort()
  log.info('To create the schema without the Supabase CLI, in the Supabase Dashboard:')
  log.info('1. SQL Editor: run each file below, in this order.')
  for (const name of migrations) log.info(`     supabase/migrations/${name}`)
  log.info(
    '2. Project Settings → API keys: copy the URL and both keys into the SUPABASE_* entries of .env.'
  )
  log.info('3. Authentication → Sign In / Providers → Email: turn off "Confirm email".')
  log.info('Or re-run with `pnpm bootstrap --local` (Docker) or `pnpm bootstrap --hosted`.')
  return [['Database', 'skipped (apply supabase/migrations in the SQL editor)']]
}

/**
 * Maps `supabase status -o env` onto our names, preferring the current key generation.
 * @param {EnvValues} status
 * @returns {Record<string, string>}
 */
function localSupabaseEnv(status) {
  const values = {
    SUPABASE_URL: status.API_URL,
    SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY || status.ANON_KEY,
    SUPABASE_SECRET_KEY: status.SECRET_KEY || status.SERVICE_ROLE_KEY,
    SUPABASE_DB_URL: status.DB_URL,
  }
  /** @type {Record<string, string>} */
  const resolved = {}
  const missing = []
  for (const [key, value] of Object.entries(values)) {
    if (value) resolved[key] = value
    else missing.push(key)
  }
  if (missing.length > 0) throw new Error(`supabase status did not report ${missing.join(', ')}`)
  return resolved
}

/**
 * @param {HostedField} field
 * @param {string} known A valid current value, or ''.
 * @returns {Promise<string>}
 */
async function askField(field, known) {
  const hint = known ? (field.secret ? 'Enter keeps the current value' : known) : field.expected
  for (;;) {
    const value = await ask(`${field.label} (${hint})`, { fallback: known, secret: field.secret })
    if (field.isValid(value)) return value
    log.warn(`Expected ${field.expected}`)
  }
}

/**
 * @param {string} value
 * @param {readonly string[]} protocols
 * @returns {boolean}
 */
function isRemoteUrl(value, protocols) {
  return URL.canParse(value) && protocols.includes(new URL(value).protocol) && !isLoopbackUrl(value)
}

/** @param {string[]} changedKeys */
function reportEnvUpdate(changedKeys) {
  log.success(
    changedKeys.length > 0 ? `.env updated: ${changedKeys.join(', ')}` : '.env already up to date'
  )
}
