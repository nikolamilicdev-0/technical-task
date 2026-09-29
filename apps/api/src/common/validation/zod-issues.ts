import type { z } from 'zod'

import type { GroupedIssues } from './validation.types.js'

/** Dotted issue path such as `tags.0`; empty for the value itself. */
export function formatIssuePath(path: readonly PropertyKey[]): string {
  return path.map(String).join('.')
}

/** Groups zod issues by field; `prefix` roots bare values, such as one route parameter, at a name. */
export function groupIssues(
  issues: readonly z.core.$ZodIssue[],
  prefix: readonly PropertyKey[] = []
): GroupedIssues {
  const formErrors: string[] = []
  // A Map, because user-controlled keys such as `__proto__` must not touch an object's prototype.
  const byField = new Map<string, string[]>()
  for (const issue of issues) {
    const path = formatIssuePath([...prefix, ...issue.path])
    if (path === '') formErrors.push(issue.message)
    else byField.set(path, [...(byField.get(path) ?? []), issue.message])
  }
  return { formErrors, fieldErrors: Object.fromEntries(byField) }
}
