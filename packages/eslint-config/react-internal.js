import prettier from 'eslint-config-prettier/flat'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig } from 'eslint/config'
import globals from 'globals'

import { baseRules } from './base.js'

// Pinned instead of 'detect': detection calls context.getFilename(), which ESLint 10 removed.
const REACT_VERSION = '19.3'

export const reactRules = defineConfig(
  baseRules,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
    settings: { react: { version: REACT_VERSION } },
    rules: { 'react/prop-types': 'off' },
  }
)

export const reactInternalConfig = defineConfig(reactRules, prettier)
