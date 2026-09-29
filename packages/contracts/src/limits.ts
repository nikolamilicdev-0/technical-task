const BYTES_PER_MIB = 1024 * 1024

export const DOCUMENT_TITLE_MAX = 200
export const DOCUMENT_CONTENT_MAX = 500_000
export const TAG_MAX_LENGTH = 40
export const MAX_TAGS = 20

export const MAX_UPLOAD_BYTES = 10 * BYTES_PER_MIB
export const ACCEPTED_UPLOAD_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
] as const
export const ACCEPTED_UPLOAD_EXTENSIONS = ['.txt', '.md', '.pdf'] as const

export const MESSAGE_MAX_LENGTH = 4_000
export const MAX_SCOPE_DOCUMENTS = 20

export const CONVERSATION_TITLE_MAX = 120
export const CONVERSATION_TITLE_DERIVED_MAX = 60

export const PAGE_SIZE_DEFAULT = 50
export const PAGE_SIZE_MAX = 200

export const EMBEDDING_DIMENSIONS_DEFAULT = 1536
