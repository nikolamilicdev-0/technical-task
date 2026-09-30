import { Logger } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'

import { SupabaseClientFactory } from '../../../../src/database/supabase-client.factory.js'
import { UsageRecorder } from '../../../../src/modules/usage/usage-recorder.js'
import type { UsageEvent } from '../../../../src/modules/usage/usage.types.js'
import { fakeDatabase, type ScriptedResult } from '../../../fakes/fake-database.js'
import { buildTestConfig, TEST_USER } from '../../../fixtures.js'
import { TEST_DOCUMENT_ID } from '../../../fixtures/documents.js'

const EVENT: UsageEvent = {
  userId: TEST_USER.id,
  kind: 'embedding',
  provider: 'gemini',
  model: 'gemini-embedding-001',
  usage: { promptTokens: 120, completionTokens: 0, totalTokens: 120, estimated: true },
  latencyMs: 250,
  documentId: TEST_DOCUMENT_ID,
}

class ServiceRoleOnly extends SupabaseClientFactory {
  constructor(private readonly serviceDb: ReturnType<typeof fakeDatabase>['db']) {
    super(buildTestConfig())
  }

  override serviceRole() {
    return this.serviceDb
  }
}

function recorderWith(...results: ScriptedResult[]) {
  const { db, queries } = fakeDatabase(...results)
  return { recorder: new UsageRecorder(new ServiceRoleOnly(db)), queries }
}

let warn: MockInstance<Logger['warn']>

beforeEach(() => {
  warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  warn.mockRestore()
})

describe('UsageRecorder', () => {
  it('inserts the event as a usage_events row through the service-role client', async () => {
    const { recorder, queries } = recorderWith({})

    recorder.record(EVENT)
    await recorder.flush()

    expect(queries).toEqual([
      [
        { method: 'from', args: ['usage_events'] },
        {
          method: 'insert',
          args: [
            {
              user_id: TEST_USER.id,
              kind: 'embedding',
              provider: 'gemini',
              model: 'gemini-embedding-001',
              prompt_tokens: 120,
              completion_tokens: 0,
              total_tokens: 120,
              estimated: true,
              latency_ms: 250,
              document_id: TEST_DOCUMENT_ID,
              conversation_id: null,
              message_id: null,
            },
          ],
        },
      ],
    ])
  })

  it('returns before the write settles and drops a failed write without throwing', async () => {
    const { recorder, queries } = recorderWith({ error: { message: 'insert failed' } })

    expect(recorder.record(EVENT)).toBeUndefined()
    await expect(recorder.flush()).resolves.toBeUndefined()
    expect(queries).toHaveLength(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('insert failed'))
  })

  it('also swallows a client that throws', async () => {
    const recorder = new UsageRecorder(
      new (class extends SupabaseClientFactory {
        override serviceRole(): never {
          throw new Error('no client')
        }
      })(buildTestConfig())
    )

    recorder.record(EVENT)
    await expect(recorder.beforeApplicationShutdown()).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no client'))
  })
})
