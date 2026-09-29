// @ts-check
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { env as processEnv, stdout, versions } from 'node:process'
import { parseArgs } from 'node:util'

import { ensureEnvFile, envFilePaths, findRepoRoot, loadEnvironment } from '../lib/env.mjs'
import { run } from '../lib/exec.mjs'
import { log } from '../lib/log.mjs'
import { createSupabaseCli } from '../lib/supabase.mjs'
import { describeManualSetup, setupHostedDatabase, setupLocalDatabase } from './database.mjs'
import { choose, isInteractive } from './prompt.mjs'

/** @typedef {'local' | 'hosted' | 'skip-db'} DatabaseMode */
/** @typedef {import('../lib/log.mjs').TableRows} TableRows */
/** @typedef {import('./database.mjs').DatabaseContext} DatabaseContext */

const USAGE = `Usage: pnpm bootstrap [options]

Installs dependencies, creates .env and prepares the Supabase database. Safe to re-run.

Database (asked for when omitted; unattended runs skip it):
  --local         Local Supabase stack in Docker
  --hosted        Existing Supabase project (values from .env, asked for when missing)
  --skip-db       Print how to create the schema in the Supabase SQL editor instead

Options:
  -y, --yes       Never prompt: read values from .env and confirm Supabase CLI prompts
  --force-env     Recreate .env from .env.example (the previous file is kept as .env.backup)
  --skip-install  Skip pnpm install and the internal package build
  -h, --help      Show this help
`

const OPTIONS = /** @type {const} */ ({
  local: { type: 'boolean', default: false },
  hosted: { type: 'boolean', default: false },
  'skip-db': { type: 'boolean', default: false },
  yes: { type: 'boolean', short: 'y', default: false },
  'force-env': { type: 'boolean', default: false },
  'skip-install': { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false },
})

/** @type {ReadonlyArray<import('./prompt.mjs').Choice<DatabaseMode>>} */
const MODE_CHOICES = [
  { value: 'local', label: 'Local Supabase (Docker)' },
  { value: 'hosted', label: 'Hosted Supabase project' },
  { value: 'skip-db', label: 'Skip the database for now' },
]
const ENV_OUTCOMES = {
  created: 'created from .env.example',
  kept: 'kept (existing file)',
  replaced: 'recreated from .env.example (previous copy in .env.backup)',
}
const MIN_PNPM_MAJOR = 10
const PNPM_USER_AGENT = /^pnpm\/(\S+)/
const AI_CREDENTIAL = /^AI_\w+_API_KEY$/
const DEFAULT_WEB_URL = 'http://localhost:3000'
const DEFAULT_API_URL = 'http://localhost:4000'

/**
 * `pnpm bootstrap`: preflight → install → .env → database → package build → summary.
 * @param {readonly string[]} argv
 * @returns {Promise<void>}
 */
export async function bootstrap(argv) {
  const flags = parseFlags(argv)
  if (flags.help) {
    stdout.write(USAGE)
    return
  }
  const flaggedMode = modeFromFlags(flags)
  const root = findRepoRoot()
  const paths = envFilePaths(root)
  const interactive = isInteractive() && !flags.yes
  /** @type {Array<readonly [string, string]>} */
  const summary = []

  await preflight()
  if (flags['skip-install']) {
    summary.push(['Dependencies', 'skipped (--skip-install)'])
  } else {
    await installDependencies(root)
    summary.push(['Dependencies', 'installed'])
  }

  const envOutcome = ensureEnvFile(paths, flags['force-env'])
  log.success(`.env ${ENV_OUTCOMES[envOutcome]}`)
  summary.push(['.env', ENV_OUTCOMES[envOutcome]])

  const mode = flaggedMode ?? (await askMode(interactive))
  /** @type {DatabaseContext} */
  const context = {
    root,
    envPath: paths.env,
    cli: createSupabaseCli(root),
    interactive,
    yes: flags.yes,
  }
  summary.push(...(await setupDatabase(mode, context)))

  if (!flags['skip-install']) {
    log.section('Internal packages')
    await run('pnpm', ['build:packages'], { cwd: root })
    summary.push(['Packages', 'built'])
  }
  printSummary(summary, loadEnvironment(paths.env))
}

/** @param {readonly string[]} argv */
function parseFlags(argv) {
  try {
    return parseArgs({ args: [...argv], options: OPTIONS, strict: true }).values
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`${reason}\n  Run \`pnpm bootstrap --help\` for the options.`, {
      cause: error,
    })
  }
}

/**
 * @param {Record<DatabaseMode, boolean>} flags
 * @returns {DatabaseMode | undefined}
 */
function modeFromFlags(flags) {
  const chosen = MODE_CHOICES.map(({ value }) => value).filter((mode) => flags[mode])
  if (chosen.length > 1) throw new Error('Pass only one of --local, --hosted and --skip-db.')
  return chosen[0]
}

/**
 * @param {boolean} interactive
 * @returns {Promise<DatabaseMode>}
 */
async function askMode(interactive) {
  if (interactive) {
    log.section('Database')
    return choose('Where should the database run?', MODE_CHOICES)
  }
  log.warn('No database mode given and nobody to ask: skipping it (pass --local or --hosted).')
  return 'skip-db'
}

/**
 * @param {DatabaseMode} mode
 * @param {DatabaseContext} context
 * @returns {Promise<TableRows>}
 */
async function setupDatabase(mode, context) {
  switch (mode) {
    case 'local':
      return setupLocalDatabase(context)
    case 'hosted':
      return setupHostedDatabase(context)
    case 'skip-db':
      return describeManualSetup(context.root)
  }
}

async function preflight() {
  log.section('Preflight')
  log.success(`Node.js ${versions.node}`)
  const pnpmVersion = await detectPnpmVersion()
  if (!pnpmVersion) throw new Error('pnpm was not found. Enable it with `corepack enable pnpm`.')
  if (Number.parseInt(pnpmVersion, 10) < MIN_PNPM_MAJOR) {
    throw new Error(
      `pnpm ${MIN_PNPM_MAJOR}+ is required (found ${pnpmVersion}): corepack enable pnpm`
    )
  }
  log.success(`pnpm ${pnpmVersion}`)
  try {
    await run('git', ['--version'], { capture: true })
    log.success('git')
  } catch {
    log.warn('git was not found, so the commit hooks will not be installed.')
  }
}

/** @returns {Promise<string | undefined>} */
async function detectPnpmVersion() {
  const fromUserAgent = PNPM_USER_AGENT.exec(processEnv.npm_config_user_agent ?? '')?.[1]
  if (fromUserAgent) return fromUserAgent
  try {
    return (await run('pnpm', ['--version'], { capture: true })).stdout.trim()
  } catch {
    return undefined
  }
}

/** @param {string} root */
async function installDependencies(root) {
  log.section('Dependencies')
  const hasLockfile = existsSync(join(root, 'pnpm-lock.yaml'))
  await run('pnpm', ['install', ...(hasLockfile ? ['--frozen-lockfile'] : [])], { cwd: root })
}

/**
 * @param {TableRows} rows
 * @param {import('../lib/env.mjs').EnvValues} env
 */
function printSummary(rows, env) {
  const emptyAiKeys = Object.keys(env).filter((key) => AI_CREDENTIAL.test(key) && !env[key])
  log.section('Summary')
  log.table([
    ...rows,
    ['AI keys', emptyAiKeys.length > 0 ? `still empty: ${emptyAiKeys.join(', ')}` : 'set'],
  ])
  log.section('Next')
  if (emptyAiKeys.length > 0) {
    log.info(
      'Add your provider key to .env, e.g. AI_CHAT_API_KEY=sk-… (.env.example lists the options)'
    )
  }
  const apiUrl = env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL
  log.info(`pnpm dev   web ${env.WEB_ORIGIN || DEFAULT_WEB_URL} · API ${apiUrl}/api/health`)
}
