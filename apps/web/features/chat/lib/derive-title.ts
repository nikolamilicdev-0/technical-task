import { type CreateConversationInput, deriveConversationTitle } from '@kb/contracts'

/**
 * The body that creates a conversation for its first question, titled after that question with
 * the same rule the API applies, so the sidebar shows the title before the answer arrives.
 */
export function newConversationInput(question: string): CreateConversationInput {
  const title = deriveConversationTitle(question)
  return title === null ? {} : { title }
}
