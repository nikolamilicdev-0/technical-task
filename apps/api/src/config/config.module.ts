import { Global, Module } from '@nestjs/common'

import { loadAppConfig } from './app-config.js'
import type { AppConfig } from './app-config.types.js'
import { APP_CONFIG } from './config.constants.js'

// A DI-time factory, not an import-time one: main.ts has loaded the root .env before Nest resolves it.
@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: (): AppConfig => loadAppConfig(process.env) }],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
