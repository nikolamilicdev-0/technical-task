import type { TokenUsage } from '@kb/ai'
import type { UsageKind } from '@kb/contracts'

export interface MeteredUsage extends TokenUsage {
  readonly estimated: boolean
}

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
  readonly timezone: string
}
