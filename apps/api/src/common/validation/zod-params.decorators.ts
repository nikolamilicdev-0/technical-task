import { Body, Param, Query } from '@nestjs/common'
import type { z } from 'zod'

import { ZodValidationPipe } from './zod-validation.pipe.js'

export function ZodBody(schema: z.ZodType): ParameterDecorator {
  return Body(new ZodValidationPipe(schema))
}

/** Query values arrive as text, so number fields need `z.coerce`. */
export function ZodQuery(schema: z.ZodType): ParameterDecorator {
  return Query(new ZodValidationPipe(schema))
}

export function ZodParam(name: string, schema: z.ZodType): ParameterDecorator {
  return Param(name, new ZodValidationPipe(schema))
}
