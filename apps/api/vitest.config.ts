import { defineConfig } from 'vitest/config'

import { workspaceAliases } from '../../vitest.shared.js'

export default defineConfig({
  resolve: { alias: workspaceAliases },
  test: {
    environment: 'node',
    include: ['__tests__/unit/**/*.test.ts'],
    // Booting AppModule builds the cl100k rank table, which is slow on small CI runners.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
})
