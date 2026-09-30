import { Module } from '@nestjs/common'

import { RetrievalRepository } from './retrieval.repository.js'
import { RetrievalService } from './retrieval.service.js'

@Module({
  providers: [RetrievalService, RetrievalRepository],
  exports: [RetrievalService],
})
export class RetrievalModule {}
