import { apiRoutes, type Document } from '@kb/contracts'
import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { memoryStorage } from 'multer'

import { CurrentUser } from '../../common/auth/current-user.decorator.js'
import { ZodBody } from '../../common/validation/zod-params.decorators.js'
import type { UserContext } from '../../database/user-context.types.js'
import { DEFAULT_THROTTLER, RATE_LIMIT_WINDOW_MS } from '../../throttling/throttling.constants.js'
import {
  UPLOAD_FILE_FIELD,
  UPLOAD_FILENAME_CHARSET,
  UPLOAD_LIMITS,
  UPLOAD_RATE_LIMIT_PER_MINUTE,
} from './upload.constants.js'
import { uploadFileFilter } from './upload-file-filter.js'
import { uploadFieldsSchema } from './upload.schema.js'
import { UploadService } from './upload.service.js'
import type { UploadedDocumentFile, UploadFields } from './upload.types.js'

@Controller()
export class UploadController {
  constructor(private readonly uploads: UploadService) {}

  @Post(apiRoutes.documents.upload)
  @Throttle({
    [DEFAULT_THROTTLER]: { limit: UPLOAD_RATE_LIMIT_PER_MINUTE, ttl: RATE_LIMIT_WINDOW_MS },
  })
  @UseInterceptors(
    FileInterceptor(UPLOAD_FILE_FIELD, {
      storage: memoryStorage(),
      limits: UPLOAD_LIMITS,
      defParamCharset: UPLOAD_FILENAME_CHARSET,
      fileFilter: uploadFileFilter,
    })
  )
  upload(
    @CurrentUser() user: UserContext,
    @UploadedFile() file: UploadedDocumentFile | undefined,
    @ZodBody(uploadFieldsSchema) fields: UploadFields
  ): Promise<Document> {
    return this.uploads.upload(user, file, fields)
  }
}
