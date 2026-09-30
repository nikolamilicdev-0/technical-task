import type { FieldErrors, FieldPath, FieldValues, UseFormSetError } from 'react-hook-form'

import type { ApiError } from '@/core/api/api-error'

const SERVER_ERROR_NAME = 'server'
const SERVER_ERROR_TYPE = 'server'
const FIELD_PATH_SEPARATOR = '.'

export const SERVER_ERROR_KEY = `root.${SERVER_ERROR_NAME}` as const

export function setServerError<TFieldValues extends FieldValues>(
  setError: UseFormSetError<TFieldValues>,
  message: string
): void {
  setError(SERVER_ERROR_KEY, { type: SERVER_ERROR_TYPE, message })
}

export function getServerError<TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>
): string | undefined {
  return errors.root?.[SERVER_ERROR_NAME]?.message
}

function matchField<TFieldValues extends FieldValues>(
  path: string,
  fields: readonly FieldPath<TFieldValues>[]
): FieldPath<TFieldValues> | undefined {
  return fields.find(
    (field) => path === field || path.startsWith(`${field}${FIELD_PATH_SEPARATOR}`)
  )
}

// `tags.0` lands on `tags` and a field's first message wins; paths no field matches go to the
// root error. Returns whether anything was shown.
export function applyFieldErrors<TFieldValues extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<TFieldValues>,
  fields: readonly NoInfer<FieldPath<TFieldValues>>[]
): boolean {
  const assigned = new Set<string>()
  let rootMessage: string | undefined

  for (const [path, messages] of Object.entries(error.fieldErrors)) {
    const [message] = messages
    if (!message) continue
    const field = matchField(path, fields)
    if (!field) {
      rootMessage ??= message
      continue
    }
    if (assigned.has(field)) continue
    assigned.add(field)
    setError(field, { type: SERVER_ERROR_TYPE, message })
  }

  if (rootMessage) setServerError(setError, rootMessage)
  return assigned.size > 0 || rootMessage !== undefined
}
