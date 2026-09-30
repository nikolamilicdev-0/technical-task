import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

const WORKSPACE_MARKER = 'pnpm-workspace.yaml'
const ENV_FILE_NAME = '.env'

export function findWorkspaceRoot(start: string): string | undefined {
  let directory = start
  while (!existsSync(join(directory, WORKSPACE_MARKER))) {
    const parent = dirname(directory)
    if (parent === directory) return undefined
    directory = parent
  }
  return directory
}

/** Variables already set in the environment win over the root `.env` (DEC-010). */
export function loadRootEnv(start: string = import.meta.dirname): string | undefined {
  const root = findWorkspaceRoot(start)
  const path = root === undefined ? undefined : join(root, ENV_FILE_NAME)
  if (path === undefined || !existsSync(path)) return undefined
  process.loadEnvFile(path)
  return path
}
