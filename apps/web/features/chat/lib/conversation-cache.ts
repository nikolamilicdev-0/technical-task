import type { Conversation, ConversationList } from '@kb/contracts'

/** A new conversation is the most recently active one, so it goes first. */
export function prependConversation(
  list: ConversationList,
  conversation: Conversation
): ConversationList {
  if (list.items.some((item) => item.id === conversation.id)) return list
  return { ...list, items: [conversation, ...list.items], total: list.total + 1 }
}

export function removeConversation(list: ConversationList, id: string): ConversationList {
  const items = list.items.filter((item) => item.id !== id)
  if (items.length === list.items.length) return list
  return { ...list, items, total: Math.max(list.total - 1, 0) }
}

export function replaceConversation(
  list: ConversationList,
  conversation: Conversation
): ConversationList {
  return {
    ...list,
    items: list.items.map((item) => (item.id === conversation.id ? conversation : item)),
  }
}
