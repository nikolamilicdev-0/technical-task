const segment = (value: string): string => encodeURIComponent(value)

export const routes = {
  home: '/',
  login: '/login',
  signup: '/signup',
  documents: {
    list: '/documents',
    new: '/documents/new',
    detail: (id: string) => `/documents/${segment(id)}`,
  },
  chat: {
    index: '/chat',
    conversation: (id: string) => `/chat/${segment(id)}`,
  },
  usage: '/usage',
} as const

/** Signed-in areas: each prefix also covers its nested routes. */
export const PROTECTED_PREFIXES: readonly string[] = [
  routes.documents.list,
  routes.chat.index,
  routes.usage,
]

/** Pages a signed-in user is sent away from. */
export const AUTH_ROUTES: readonly string[] = [routes.login, routes.signup]

export const DEFAULT_AUTHENTICATED_ROUTE = routes.documents.list

export const AUTH_SEARCH_PARAMS = {
  next: 'next',
  reason: 'reason',
} as const

export const SESSION_EXPIRED_REASON = 'expired'
