import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['__tests__/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['./__tests__/setup.ts'],
    clearMocks: true,
  },
})
