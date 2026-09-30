import { apiRoutes, idSchema, type ReindexResult } from '@kb/contracts'
import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'

import { CurrentUser } from '../../common/auth/current-user.decorator.js'
import { ZodParam } from '../../common/validation/zod-params.decorators.js'
import type { UserContext } from '../../database/user-context.types.js'
import { DEFAULT_THROTTLER, RATE_LIMIT_WINDOW_MS } from '../../throttling/throttling.constants.js'
import { DOCUMENT_ID_PARAM } from '../documents/documents.constants.js'
import { REINDEX_DOCUMENT_ROUTE, REINDEX_RATE_LIMIT_PER_MINUTE } from './ingestion.constants.js'
import { ReindexService } from './reindex.service.js'

const REINDEX_THROTTLE = {
  [DEFAULT_THROTTLER]: { limit: REINDEX_RATE_LIMIT_PER_MINUTE, ttl: RATE_LIMIT_WINDOW_MS },
}

// POST only, so neither route competes with `GET /documents/:id`.
@Controller()
export class IngestionController {
  constructor(private readonly reindex: ReindexService) {}

  @Post(apiRoutes.documents.reindexAll)
  @HttpCode(HttpStatus.OK)
  @Throttle(REINDEX_THROTTLE)
  reindexAll(@CurrentUser() user: UserContext): Promise<ReindexResult> {
    return this.reindex.reindexAll(user)
  }

  @Post(REINDEX_DOCUMENT_ROUTE)
  @HttpCode(HttpStatus.OK)
  @Throttle(REINDEX_THROTTLE)
  reindexDocument(
    @CurrentUser() user: UserContext,
    @ZodParam(DOCUMENT_ID_PARAM, idSchema) id: string
  ): Promise<ReindexResult> {
    return this.reindex.reindexDocument(user, id)
  }
}
