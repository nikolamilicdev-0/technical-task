import { defineConfig } from 'vitest/config'

import { workspaceAliases } from '../../vitest.shared.js'

export default defineConfig({
  resolve: { alias: workspaceAliases },
  test: {
    environment: 'node',
    include: ['__tests__/unit/**/*.test.ts'],
  },
})
