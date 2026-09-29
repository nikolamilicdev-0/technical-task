import { type BeforeApplicationShutdown, Injectable, Logger } from '@nestjs/common'

import { describeError } from '../../common/errors/describe-error.js'
import { DATABASE_RELATIONS } from '../../database/database.constants.js'
import type { TablesInsert } from '../../database/database.types.js'
import { SupabaseClientFactory } from '../../database/supabase-client.factory.js'
import type { UsageEvent } from './usage.types.js'

/** Meters AI calls into `usage_events` through the service-role client, off the hot path (DEC-004). */
@Injectable()
export class UsageRecorder implements BeforeApplicationShutdown {
  readonly #logger = new Logger(UsageRecorder.name)
  readonly #pending = new Set<Promise<void>>()

  constructor(private readonly clients: SupabaseClientFactory) {}

  /** Stores the event in the background; a failed write is logged and dropped, never thrown. */
  record(event: UsageEvent): void {
    const write: Promise<void> = this.#insert(event).finally(() => this.#pending.delete(write))
    this.#pending.add(write)
  }

  /** Resolves once every write started so far has settled. */
  async flush(): Promise<void> {
    await Promise.all(this.#pending)
  }

  // Runs after every onModuleDestroy, so the ingestion worker's last batch is metered too.
  async beforeApplicationShutdown(): Promise<void> {
    await this.flush()
  }

  async #insert(event: UsageEvent): Promise<void> {
    try {
      const { error } = await this.clients
        .serviceRole()
        .from(DATABASE_RELATIONS.usageEvents)
        .insert(toUsageEventRow(event))
      if (error) this.#drop(event, error.message)
    } catch (error) {
      this.#drop(event, describeError(error))
    }
  }

  #drop(event: UsageEvent, reason: string): void {
    this.#logger.warn(`Dropped a ${event.kind} usage event of user ${event.userId}: ${reason}`)
  }
}

function toUsageEventRow({ usage, ...event }: UsageEvent): TablesInsert<'usage_events'> {
  return {
    user_id: event.userId,
    kind: event.kind,
    provider: event.provider,
    model: event.model,
    prompt_tokens: usage.promptTokens,
    completion_tokens: usage.completionTokens,
    total_tokens: usage.totalTokens,
    estimated: usage.estimated,
    latency_ms: event.latencyMs ?? null,
    document_id: event.documentId ?? null,
    conversation_id: event.conversationId ?? null,
    message_id: event.messageId ?? null,
  }
}
