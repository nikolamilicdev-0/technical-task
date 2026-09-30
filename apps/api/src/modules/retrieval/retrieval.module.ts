import { Module } from '@nestjs/common'

import { RetrievalRepository } from './retrieval.repository.js'
import { RetrievalService } from './retrieval.service.js'

/** Hybrid chunk retrieval over the caller's ready documents. */
@Module({
  providers: [RetrievalService, RetrievalRepository],
  exports: [RetrievalService],
})
export class RetrievalModule {}
