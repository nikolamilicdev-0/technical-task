import { AiProviderError } from './ai-provider-error.js'
import type { ProviderCallContext } from './ai-provider-error.types.js'

export function abortError(context: ProviderCallContext, cause?: unknown): AiProviderError {
  const message = `The ${context.kind} request to ${context.provider} was aborted by the caller`
  return new AiProviderError('aborted', message, {
    provider: context.provider,
    model: context.model,
    cause,
  })
}
