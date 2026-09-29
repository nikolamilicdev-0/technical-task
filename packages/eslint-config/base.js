import js from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import turbo from 'eslint-plugin-turbo'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

const JS_FILES = ['**/*.{js,mjs,cjs}']

export const baseRules = defineConfig(
  globalIgnores(['dist/**', '.next/**', 'coverage/**', '.turbo/**', 'node_modules/**']),
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  turbo.configs['flat/recommended'],
  {
    languageOptions: {
      parserOptions: { projectService: true },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // With verbatimModuleSyntax, `import { type A }` would keep a runtime side-effect import.
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-console': ['warn', { allow: ['error'] }],
      eqeqeq: ['error', 'smart'],
    },
  },
  { files: JS_FILES, extends: [tseslint.configs.disableTypeChecked] }
)

export const baseConfig = defineConfig(baseRules, prettier)
