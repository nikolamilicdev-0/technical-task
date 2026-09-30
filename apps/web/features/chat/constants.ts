import { type Citation, type FinishReason, MESSAGE_MAX_LENGTH, PAGE_SIZE_MAX } from '@kb/contracts'

import type { ConversationsListParams, RenameConversationValues } from '@/features/chat/types'

export const CONVERSATIONS_LIST_PARAMS: ConversationsListParams = { limit: PAGE_SIZE_MAX }

export const PENDING_QUESTION_KEY = 'pending-question'
export const PENDING_ANSWER_KEY = 'pending-answer'

/** Shared by messages without sources, so memoised bubbles keep equal props. */
export const NO_CITATIONS: readonly Citation[] = []

export const COMPOSER_COUNTER_FROM = Math.floor(MESSAGE_MAX_LENGTH * 0.9)

export const PINNED_THRESHOLD_PX = 48

export const FINISH_NOTE_REASONS: ReadonlySet<FinishReason> = new Set([
  'aborted',
  'length',
  'content_filter',
  'error',
])

export const CONVERSATION_SKELETON_ITEMS = 6

export const RENAME_DEFAULT_VALUES: RenameConversationValues = { title: '' }

export const RENAME_FORM_FIELDS = [
  'title',
] as const satisfies readonly (keyof RenameConversationValues)[]
