import type { z } from 'zod'

import type { Dictionary } from '@/core/i18n/dictionary'
import { interpolate } from '@/core/i18n/interpolate'

type ValidationMessages = Dictionary['validation']
type ZodRawIssue = z.core.$ZodRawIssue
type IssueOf<TCode extends ZodRawIssue['code']> = Extract<ZodRawIssue, { code: TCode }>

const COLLECTION_ORIGINS: ReadonlySet<string> = new Set(['array', 'set'])

const FORMAT_MESSAGE_KEYS: Readonly<Partial<Record<string, keyof ValidationMessages>>> = {
  email: 'email',
  url: 'url',
}

/**
 * Maps zod issues to dictionary copy. Messages set on a schema still win, and a refinement can
 * pick copy with `params: { messageKey: '<validation key>' }`.
 */
export function createZodErrorMap(messages: ValidationMessages): z.core.$ZodErrorMap {
  return (issue) => messageForIssue(issue, messages)
}

function messageForIssue(issue: ZodRawIssue, messages: ValidationMessages): string | undefined {
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined || issue.input === null
        ? messages.required
        : messages.invalid
    case 'too_small':
      return tooSmallMessage(issue, messages)
    case 'too_big':
      return tooBigMessage(issue, messages)
    case 'invalid_format':
      return invalidFormatMessage(issue, messages)
    case 'invalid_value':
      return messages.invalidOption
    case 'custom':
      return customMessage(issue, messages)
    // Structural issues that forms never surface keep zod's own message.
    case 'not_multiple_of':
    case 'unrecognized_keys':
    case 'invalid_union':
    case 'invalid_key':
    case 'invalid_element':
      return undefined
  }
}

function tooSmallMessage(issue: IssueOf<'too_small'>, messages: ValidationMessages): string {
  const minimum = Number(issue.minimum)
  if (issue.origin === 'string') {
    // An empty field is simply missing, whatever its minimum length.
    if (minimum <= 1 || issue.input === '') return messages.required
    return interpolate(messages.tooShort, { minimum })
  }
  if (COLLECTION_ORIGINS.has(issue.origin)) return interpolate(messages.tooFewItems, { minimum })
  return interpolate(messages.tooSmall, { minimum })
}

function tooBigMessage(issue: IssueOf<'too_big'>, messages: ValidationMessages): string {
  const maximum = Number(issue.maximum)
  if (issue.origin === 'string') return interpolate(messages.tooLong, { maximum })
  if (COLLECTION_ORIGINS.has(issue.origin)) return interpolate(messages.tooManyItems, { maximum })
  return interpolate(messages.tooBig, { maximum })
}

function invalidFormatMessage(issue: IssueOf<'invalid_format'>, messages: ValidationMessages) {
  if (issue.input === '') return messages.required
  const key = FORMAT_MESSAGE_KEYS[issue.format]
  return key ? messages[key] : messages.invalid
}

function customMessage(issue: IssueOf<'custom'>, messages: ValidationMessages): string {
  const key: unknown = issue.params?.messageKey
  return isValidationKey(key, messages) ? messages[key] : messages.invalid
}

function isValidationKey(
  key: unknown,
  messages: ValidationMessages
): key is keyof ValidationMessages {
  return typeof key === 'string' && Object.hasOwn(messages, key)
}
