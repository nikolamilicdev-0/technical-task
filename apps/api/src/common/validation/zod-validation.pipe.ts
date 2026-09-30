import type { ArgumentMetadata, PipeTransform } from '@nestjs/common'
import type { z } from 'zod'

import { ApiHttpException } from '../errors/api-http.exception.js'
import { DEFAULT_ERROR_MESSAGES } from '../errors/error.constants.js'
import { groupIssues } from './zod-issues.js'

export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<TSchema>
> {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata): z.output<TSchema> {
    const result = this.schema.safeParse(value)
    if (result.success) return result.data
    const prefix = metadata.data === undefined ? [] : [metadata.data]
    const { formErrors, fieldErrors } = groupIssues(result.error.issues, prefix)
    const messages = formErrors.length > 0 ? formErrors : [DEFAULT_ERROR_MESSAGES.invalid_payload]
    const details = Object.keys(fieldErrors).length > 0 ? { errors: fieldErrors } : {}
    throw new ApiHttpException('invalid_payload', messages, details)
  }
}
