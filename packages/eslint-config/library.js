import prettier from 'eslint-config-prettier/flat'
import { defineConfig } from 'eslint/config'
import globals from 'globals'

import { baseRules } from './base.js'

export const libraryConfig = defineConfig(
  baseRules,
  { languageOptions: { globals: { ...globals.node } } },
  prettier
)
