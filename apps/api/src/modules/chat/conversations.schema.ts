import { createConversationSchema } from '@kb/contracts'

/** A POST without a body (Express leaves it undefined) creates an untitled conversation. */
export const createConversationBodySchema = createConversationSchema.prefault({})
