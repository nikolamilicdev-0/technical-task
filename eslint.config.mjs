import { libraryConfig } from '@kb/eslint-config/library'
import { defineConfig, globalIgnores } from 'eslint/config'

// Workspaces lint themselves through turbo; this config covers root-level tooling only.
export default defineConfig(globalIgnores(['apps/**', 'packages/**', 'supabase/**']), {
  files: ['*.{js,mjs,cjs}', 'scripts/**/*.{js,mjs}'],
  extends: [libraryConfig],
})
