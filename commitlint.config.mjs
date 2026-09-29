const WARNING = 1

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      WARNING,
      'always',
      ['repo', 'web', 'api', 'contracts', 'ai', 'ui', 'db', 'ci', 'docs', 'deps'],
    ],
  },
}
