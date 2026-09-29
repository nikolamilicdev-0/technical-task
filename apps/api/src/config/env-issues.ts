import type { z } from 'zod'

import { formatIssuePath } from '../common/validation/zod-issues.js'

/** `NAME: message` per issue on one line, for log lines and error messages. */
export function describeEnvIssues(issues: readonly z.core.$ZodIssue[]): string {
  return issues
    .map((issue) => {
      const name = formatIssuePath(issue.path)
      return name === '' ? issue.message : `${name}: ${issue.message}`
    })
    .join('; ')
}
