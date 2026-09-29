import { Body, Param, Query } from '@nestjs/common'
import type { z } from 'zod'

import { ZodValidationPipe } from './zod-validation.pipe.js'

/** The request body, parsed with a contracts schema. */
export function ZodBody(schema: z.ZodType): ParameterDecorator {
  return Body(new ZodValidationPipe(schema))
}

/** The query string, parsed with a contracts schema (numbers arrive as text, so use `z.coerce`). */
export function ZodQuery(schema: z.ZodType): ParameterDecorator {
  return Query(new ZodValidationPipe(schema))
}

/** One route parameter, parsed with a contracts schema; issues are reported under its name. */
export function ZodParam(name: string, schema: z.ZodType): ParameterDecorator {
  return Param(name, new ZodValidationPipe(schema))
}
