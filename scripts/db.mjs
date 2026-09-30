#!/usr/bin/env node
// @ts-check
import { argv, stdout } from 'node:process'

import { envFilePaths, findRepoRoot, loadEnvironment } from './lib/env.mjs'
import { log, reportError } from './lib/log.mjs'
import {
  connectionFlags,
  createSupabaseCli,
  DATABASE_TYPES_PATH,
  generateDatabaseTypes,
} from './lib/supabase.mjs'

const USAGE = `Usage: node scripts/db.mjs <command> [supabase flags]

  migrate  Apply pending migrations (supabase migration up)
  push     Push migrations after a confirmation (supabase db push)
  types    Regenerate ${DATABASE_TYPES_PATH} (rewritten only when it changes)

The target is the database .env points at: the local stack when SUPABASE_URL is a loopback
address, otherwise the hosted project behind SUPABASE_DB_URL. Extra flags (e.g. --dry-run)
are passed to the Supabase CLI.
`

/**
 * @param {readonly string[]} args
 * @returns {Promise<number>} The exit code.
 */
async function main([command, ...cliFlags]) {
  if (command === undefined || command === '--help' || command === '-h') {
    stdout.write(USAGE)
    return 0
  }
  const root = findRepoRoot()
  const env = loadEnvironment(envFilePaths(root).env)
  const cli = createSupabaseCli(root)

  switch (command) {
    case 'migrate':
      await cli.run(['migration', 'up', ...connectionFlags(env), ...cliFlags])
      return 0
    case 'push':
      await cli.run(['db', 'push', ...connectionFlags(env), ...cliFlags])
      return 0
    case 'types': {
      const { changed, source } = await generateDatabaseTypes(root, cli, env)
      log.success(
        `${DATABASE_TYPES_PATH} ${changed ? 'updated' : 'is up to date'} (from ${source})`
      )
      return 0
    }
    default:
      log.error(`Unknown command: ${command}`)
      stdout.write(USAGE)
      return 1
  }
}

try {
  process.exitCode = await main(argv.slice(2))
} catch (error) {
  reportError(error)
  process.exitCode = 1
}
