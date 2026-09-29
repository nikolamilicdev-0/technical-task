import prettier from 'eslint-config-prettier/flat'
import { defineConfig } from 'eslint/config'
import globals from 'globals'

import { baseRules } from './base.js'

export const nestConfig = defineConfig(
  baseRules,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      // Nest lifecycle hooks and interface methods are often async without awaiting.
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  prettier
)
