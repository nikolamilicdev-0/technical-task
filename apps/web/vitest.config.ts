import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

import { workspaceAliases } from '../../vitest.shared.js'

export default defineConfig({
  plugins: [react()],
  // `tsconfigPaths` resolves the `@/*` alias natively (Vite 8); workspace packages map to src.
  resolve: { alias: workspaceAliases, tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    include: ['__tests__/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['./__tests__/setup.ts'],
    clearMocks: true,
    // jsdom + user-event tests are slow on small CI runners; 5 s per test is too tight.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
})
