import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import type { FieldValues, Resolver } from 'react-hook-form'
import type { z } from 'zod'

import { createZodErrorMap } from '@/core/forms/zod-error-map'
import { useT } from '@/core/i18n/useT'

export function useZodResolver<TInput extends FieldValues, TOutput>(
  schema: z.ZodType<TOutput, TInput>
): Resolver<TInput, unknown, TOutput> {
  const { validation } = useT()
  return useMemo(
    () => zodResolver(schema, { error: createZodErrorMap(validation) }),
    [schema, validation]
  )
}
