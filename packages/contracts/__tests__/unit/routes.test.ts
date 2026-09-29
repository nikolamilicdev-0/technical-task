import { API_PREFIX, apiRoutes } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { IDS } from '../fixtures.js'

type RouteTree = { [key: string]: string | ((id: string) => string) | RouteTree }

function collectPaths(tree: RouteTree): string[] {
  return Object.values(tree).flatMap((route) => {
    if (typeof route === 'string') return [route]
    if (typeof route === 'function') return [route(IDS.document)]
    return collectPaths(route)
  })
}

describe('apiRoutes', () => {
  it.each([
    ['health', apiRoutes.health, '/health'],
    ['readiness', apiRoutes.healthReady, '/health/ready'],
    ['documents', apiRoutes.documents.collection, '/documents'],
    ['document', apiRoutes.documents.item(IDS.document), `/documents/${IDS.document}`],
    ['upload', apiRoutes.documents.upload, '/documents/upload'],
    [
      'reindex one',
      apiRoutes.documents.reindex(IDS.document),
      `/documents/${IDS.document}/reindex`,
    ],
    ['reindex all', apiRoutes.documents.reindexAll, '/documents/reindex-all'],
    ['conversations', apiRoutes.conversations.collection, '/conversations'],
    [
      'conversation',
      apiRoutes.conversations.item(IDS.conversation),
      `/conversations/${IDS.conversation}`,
    ],
    [
      'messages',
      apiRoutes.conversations.messages(IDS.conversation),
      `/conversations/${IDS.conversation}/messages`,
    ],
    ['usage summary', apiRoutes.usage.summary, '/usage/summary'],
  ])('%s → %s', (_, actual, expected) => {
    expect(actual).toBe(expected)
  })

  it('keeps every path relative to API_PREFIX', () => {
    expect(API_PREFIX).toBe('/api')
    for (const path of collectPaths(apiRoutes)) {
      expect(path).toMatch(/^\/[a-z]/)
      expect(path).not.toMatch(/\/$/)
      expect(path.startsWith(API_PREFIX)).toBe(false)
    }
  })

  it('encodes ids so they cannot add path segments', () => {
    expect(apiRoutes.documents.item('../usage')).toBe('/documents/..%2Fusage')
    expect(apiRoutes.conversations.messages('a b')).toBe('/conversations/a%20b/messages')
  })
})
