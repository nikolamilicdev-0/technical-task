import { API_PREFIX } from '@kb/contracts'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'

import { AppModule } from './app.module.js'
import { configureHttp } from './app.setup.js'
import type { AppConfig } from './config/app-config.types.js'
import { APP_CONFIG } from './config/config.constants.js'
import { loadRootEnv } from './config/root-env.js'

loadRootEnv()

const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  bufferLogs: true,
  // Rethrow bootstrap errors (an invalid .env, say) instead of calling process.abort().
  abortOnError: false,
  // Open SSE streams and keep-alive sockets would otherwise stall shutdown and watch-mode restarts.
  forceCloseConnections: true,
}).catch(() => {
  // Nest has already logged why; exiting here keeps Node from printing it a second time.
  process.exit(1)
})
const config = app.get<AppConfig>(APP_CONFIG)
app.useLogger(config.app.logLevels)
configureHttp(app, config)
app.enableShutdownHooks()
await app.listen(config.app.port)

new Logger('Bootstrap').log(`API listening on http://localhost:${config.app.port}${API_PREFIX}`)
