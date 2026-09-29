#!/usr/bin/env node
// @ts-check
// `pnpm bootstrap` entry. It checks the Node version before loading modules that need Node 22
// built-ins, so older runtimes get a clear message instead of an import error.
const MIN_NODE_MAJOR = 22
const MIN_NODE_MINOR = 22
const [major = 0, minor = 0] = process.versions.node.split('.').map(Number)

if (major < MIN_NODE_MAJOR || (major === MIN_NODE_MAJOR && minor < MIN_NODE_MINOR)) {
  console.error(
    `Node.js ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}+ is required (found ${process.version}). ` +
      'Run: nvm install 22 && nvm use 22'
  )
  process.exit(1)
}

const { reportError } = await import('./lib/log.mjs')
const { bootstrap } = await import('./setup/main.mjs')
try {
  await bootstrap(process.argv.slice(2))
} catch (error) {
  reportError(error)
  process.exitCode = 1
}
