import { type Citation, type FinishReason, MESSAGE_MAX_LENGTH, PAGE_SIZE_MAX } from '@kb/contracts'

import type { ConversationsListParams, RenameConversationValues } from '@/features/chat/types'

/** One request loads the most recently active conversations. */
export const CONVERSATIONS_LIST_PARAMS: ConversationsListParams = { limit: PAGE_SIZE_MAX }

/** Keys of the exchange in flight until the API confirms its message ids. */
export const PENDING_QUESTION_KEY = 'pending-question'
export const PENDING_ANSWER_KEY = 'pending-answer'

/** Shared by messages without sources, so memoised bubbles keep equal props. */
export const NO_CITATIONS: readonly Citation[] = []

/** The composer shows its character count from this many characters on. */
export const COMPOSER_COUNTER_FROM = Math.floor(MESSAGE_MAX_LENGTH * 0.9)

/** How close to the bottom (px) still counts as following the newest message. */
export const PINNED_THRESHOLD_PX = 48

/** How often relative times in the conversation list are recomputed. */
export const LIST_TIME_REFRESH_MS = 60_000

/** Activity younger than this reads as "just now". */
export const JUST_NOW_MS = 60_000

/** Finish reasons that get a note under the answer; a normal stop needs none. */
export const FINISH_NOTE_REASONS: ReadonlySet<FinishReason> = new Set([
  'aborted',
  'length',
  'content_filter',
  'error',
])

export const CONVERSATION_SKELETON_ITEMS = 6

/** API field errors on these paths are shown on the rename form's field. */
export const RENAME_FORM_FIELDS = [
  'title',
] as const satisfies readonly (keyof RenameConversationValues)[]
