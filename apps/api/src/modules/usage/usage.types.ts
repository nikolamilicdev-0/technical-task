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

/** The period a usage summary covers, `[from, to)`, with days counted in `timezone`. */
export interface UsageWindow {
  readonly from: string
  readonly to: string
  /** IANA name, such as `Europe/Paris`; it decides where each day starts. */
  readonly timezone: string
}
