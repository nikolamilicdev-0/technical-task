import { API_PREFIX } from '@kb/contracts'
import type { NestExpressApplication } from '@nestjs/platform-express'

import { RETRY_AFTER_HEADER } from './common/errors/error.constants.js'
import {
  CORS_ALLOWED_HEADERS,
  CORS_METHODS,
  JSON_BODY_LIMIT,
} from './common/http/http.constants.js'
import { assignRequestId } from './common/http/request-id.middleware.js'
import { logRequests } from './common/http/request-logging.middleware.js'
import type { AppConfig } from './config/app-config.types.js'

export function configureHttp(app: NestExpressApplication, config: AppConfig): void {
  app.use(assignRequestId, logRequests)
  app.enableCors({
    origin: config.app.webOrigin,
    methods: CORS_METHODS,
    allowedHeaders: CORS_ALLOWED_HEADERS,
    exposedHeaders: [RETRY_AFTER_HEADER],
    credentials: false,
  })
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT })
  app.setGlobalPrefix(API_PREFIX)
}
