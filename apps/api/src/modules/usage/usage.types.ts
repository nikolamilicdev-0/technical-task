import type { TokenUsage } from '@kb/ai'
import type { UsageKind } from '@kb/contracts'

/** Token counts to meter; `estimated` when the provider reported none and they were counted here. */
export interface MeteredUsage extends TokenUsage {
  readonly estimated: boolean
}

/** One metered AI call, owned by `userId`; the optional ids link it to what it served. */
export interface UsageEvent {
  readonly userId: string
  readonly kind: UsageKind
  readonly provider: string
  readonly model: string
  readonly usage: MeteredUsage
  readonly latencyMs?: number
  readonly documentId?: string
  readonly conversationId?: string
  readonly messageId?: string
}
