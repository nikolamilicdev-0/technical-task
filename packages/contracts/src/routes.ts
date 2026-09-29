export const API_PREFIX = '/api'

const segment = (id: string): string => encodeURIComponent(id)

export const apiRoutes = {
  health: '/health',
  healthReady: '/health/ready',
  documents: {
    collection: '/documents',
    item: (id: string) => `/documents/${segment(id)}`,
    upload: '/documents/upload',
    reindex: (id: string) => `/documents/${segment(id)}/reindex`,
    reindexAll: '/documents/reindex-all',
  },
  conversations: {
    collection: '/conversations',
    item: (id: string) => `/conversations/${segment(id)}`,
    messages: (id: string) => `/conversations/${segment(id)}/messages`,
  },
  usage: {
    summary: '/usage/summary',
  },
} as const
