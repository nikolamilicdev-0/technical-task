import { fileURLToPath } from 'node:url'

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

// Anchored so subpath imports such as `@kb/ui/theme.css` are left untouched.
export const workspaceAliases = [
  { find: /^@kb\/contracts$/, replacement: fromRoot('./packages/contracts/src/index.ts') },
  { find: /^@kb\/ai$/, replacement: fromRoot('./packages/ai/src/index.ts') },
  { find: /^@kb\/ui$/, replacement: fromRoot('./packages/ui/src/index.ts') },
]
