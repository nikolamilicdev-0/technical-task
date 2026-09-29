import { Module } from '@nestjs/common'

import { DocumentsController } from './documents.controller.js'
import { DocumentsRepository } from './documents.repository.js'
import { DocumentsService } from './documents.service.js'

/** Document CRUD; exports the service so uploads take the same create path. */
@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsRepository],
  exports: [DocumentsService],
})
export class DocumentsModule {}
