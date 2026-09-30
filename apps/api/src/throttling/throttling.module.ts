import { Module } from '@nestjs/common'
import { ThrottlerModule, type ThrottlerModuleOptions } from '@nestjs/throttler'

import type { AppConfig } from '../config/app-config.types.js'
import { APP_CONFIG } from '../config/config.constants.js'
import { DEFAULT_THROTTLER, RATE_LIMIT_WINDOW_MS } from './throttling.constants.js'

function throttlerOptions({ rateLimit }: AppConfig): ThrottlerModuleOptions {
  return {
    throttlers: [
      { name: DEFAULT_THROTTLER, ttl: RATE_LIMIT_WINDOW_MS, limit: rateLimit.defaultPerMinute },
    ],
  }
}

@Module({
  imports: [ThrottlerModule.forRootAsync({ inject: [APP_CONFIG], useFactory: throttlerOptions })],
})
export class ThrottlingModule {}
