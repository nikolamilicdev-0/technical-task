import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { EventEmitterModule } from '@nestjs/event-emitter'

import { AiModule } from './ai/ai.module.js'
import { AuthGuard } from './auth/auth.guard.js'
import { AuthModule } from './auth/auth.module.js'
import { ApiExceptionFilter } from './common/errors/api-exception.filter.js'
import { AppConfigModule } from './config/config.module.js'
import { DatabaseModule } from './database/database.module.js'
import { DocumentsModule } from './modules/documents/documents.module.js'
import { HealthModule } from './modules/health/health.module.js'
import { UploadModule } from './modules/upload/upload.module.js'
import { ThrottlingModule } from './throttling/throttling.module.js'
import { UserThrottlerGuard } from './throttling/user-throttler.guard.js'

@Module({
  imports: [
    AppConfigModule,
    EventEmitterModule.forRoot(),
    DatabaseModule,
    AuthModule,
    AiModule,
    ThrottlingModule,
    HealthModule,
    DocumentsModule,
    UploadModule,
  ],
  providers: [
    // Global guards run in this order: identify the caller, then rate-limit per user.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
