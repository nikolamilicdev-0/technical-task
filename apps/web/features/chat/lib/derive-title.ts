import { type CreateConversationInput, deriveConversationTitle } from '@kb/contracts'

/** The API's own title rule, so the sidebar shows the title before the answer arrives. */
export function newConversationInput(question: string): CreateConversationInput {
  const title = deriveConversationTitle(question)
  return title === null ? {} : { title }
}
