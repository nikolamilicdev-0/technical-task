import type {
  ChatSseEvent,
  Citation,
  Conversation,
  ConversationDetail,
  ConversationList,
  Message,
} from '@kb/contracts'

import { DOCUMENT_ID } from '@/__tests__/fixtures/documents'

export const CONVERSATION_ID = 'c0a8012e-7d4b-4c1e-9f2a-3b4c5d6e7f80'
export const OTHER_CONVERSATION_ID = 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b'
export const USER_MESSAGE_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
export const ASSISTANT_MESSAGE_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
export const CREATED_AT = '2026-09-30T10:00:00.000Z'

const CHUNK_IDS = [
  'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f7a',
  'f6a7b8c9-d0e1-4f2a-9b3c-4d5e6f7a8b9c',
  'a7b8c9d0-e1f2-4a3b-8c4d-5e6f7a8b9c0d',
] as const

export function buildCitation(overrides: Partial<Citation> = {}): Citation {
  const index = overrides.index ?? 1
  return {
    index,
    documentId: DOCUMENT_ID,
    documentTitle: 'Onboarding guide',
    chunkId: CHUNK_IDS[(index - 1) % CHUNK_IDS.length] ?? CHUNK_IDS[0],
    chunkIndex: index - 1,
    headingPath: 'Onboarding guide › Setup',
    excerpt: 'Install the CLI, then sign in with your work account.',
    score: 0.032,
    cited: false,
    ...overrides,
  }
}

export function buildCitations(count: number): Citation[] {
  return Array.from({ length: count }, (_, position) => buildCitation({ index: position + 1 }))
}

export function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: USER_MESSAGE_ID,
    conversationId: CONVERSATION_ID,
    role: 'user',
    content: 'How do I set up the CLI?',
    citations: [],
    createdAt: CREATED_AT,
    ...overrides,
  }
}

export function buildConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: CONVERSATION_ID,
    title: 'Setting up the CLI',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  }
}

export function buildConversationDetail(
  messages: Message[] = [],
  conversation: Partial<Conversation> = {}
): ConversationDetail {
  return { conversation: buildConversation(conversation), messages }
}

export function buildConversationList(
  items: Conversation[],
  total = items.length
): ConversationList {
  return { items, total, limit: 200, offset: 0 }
}

export function sseFrame(event: ChatSseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
}
