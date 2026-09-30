import { readFileSync } from 'node:fs'

import { z } from 'zod'

// src/ and dist/ mirror each other, so the manifest sits two levels up from either copy.
const MANIFEST_URL = new URL('../../package.json', import.meta.url)
const manifestSchema = z.object({ version: z.string().min(1) })

export function readPackageVersion(): string {
  const manifest: unknown = JSON.parse(readFileSync(MANIFEST_URL, 'utf8'))
  return manifestSchema.parse(manifest).version
}
