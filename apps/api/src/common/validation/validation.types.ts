import type { FieldErrors } from '@kb/contracts'

/** Validation issues split into problems with the value as a whole and per-field problems. */
export interface GroupedIssues {
  readonly formErrors: string[]
  readonly fieldErrors: FieldErrors
}
