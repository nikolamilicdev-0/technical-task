import { Module } from '@nestjs/common'

import { UsageModule } from '../usage/usage.module.js'
import { IngestionController } from './ingestion.controller.js'
import { IngestionRepository } from './ingestion.repository.js'
import { IngestionService } from './ingestion.service.js'
import { IngestionWorker } from './ingestion.worker.js'
import { ReindexService } from './reindex.service.js'

/** The durable ingestion queue: worker, chunking and embedding pipeline, and the reindex routes. */
@Module({
  imports: [UsageModule],
  controllers: [IngestionController],
  providers: [IngestionRepository, IngestionService, IngestionWorker, ReindexService],
})
export class IngestionModule {}
