import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { findWorkspaceRoot, loadRootEnv } from '../../../src/config/root-env.js'

const FROM_FILE = 'KB_ROOT_ENV_TEST_FROM_FILE'
const PRESET = 'KB_ROOT_ENV_TEST_PRESET'
const environment: Record<string, string | undefined> = process.env

const temporaryDirectories: string[] = []

function temporaryWorkspace(envFile?: string): { root: string; nested: string } {
  const root = mkdtempSync(join(tmpdir(), 'kb-root-env-'))
  temporaryDirectories.push(root)
  const nested = join(root, 'apps', 'api', 'dist')
  mkdirSync(nested, { recursive: true })
  writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: [apps/*]\n')
  if (envFile !== undefined) writeFileSync(join(root, '.env'), envFile)
  return { root, nested }
}

afterEach(() => {
  vi.unstubAllEnvs()
  Reflect.deleteProperty(environment, FROM_FILE)
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('findWorkspaceRoot', () => {
  it('walks up to the directory that holds pnpm-workspace.yaml', () => {
    const { root, nested } = temporaryWorkspace()
    expect(findWorkspaceRoot(nested)).toBe(root)
  })

  it('finds this monorepo from the API sources', () => {
    expect(findWorkspaceRoot(import.meta.dirname)).toBe(
      join(import.meta.dirname, '..', '..', '..', '..', '..')
    )
  })

  it('returns undefined outside any workspace', () => {
    const outside = mkdtempSync(join(tmpdir(), 'kb-no-workspace-'))
    temporaryDirectories.push(outside)
    expect(findWorkspaceRoot(outside)).toBeUndefined()
  })
})

describe('loadRootEnv', () => {
  it('loads the root .env without overriding variables that are already set', () => {
    vi.stubEnv(PRESET, 'from-environment')
    const { root, nested } = temporaryWorkspace(`${FROM_FILE}=from-file\n${PRESET}=from-file\n`)

    expect(loadRootEnv(nested)).toBe(join(root, '.env'))
    expect(environment[FROM_FILE]).toBe('from-file')
    expect(environment[PRESET]).toBe('from-environment')
  })

  it('does nothing when the workspace has no .env', () => {
    expect(loadRootEnv(temporaryWorkspace().nested)).toBeUndefined()
  })
})
