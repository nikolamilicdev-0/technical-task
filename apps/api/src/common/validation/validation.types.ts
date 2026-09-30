import type { FieldErrors } from '@kb/contracts'

export interface GroupedIssues {
  readonly formErrors: string[]
  readonly fieldErrors: FieldErrors
}
