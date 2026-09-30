import { Module } from '@nestjs/common'

import { DocumentsModule } from '../documents/documents.module.js'
import { UploadController } from './upload.controller.js'
import { UploadService } from './upload.service.js'

@Module({
  imports: [DocumentsModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
