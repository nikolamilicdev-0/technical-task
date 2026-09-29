import { EVENT_STREAM_MEDIA_TYPE } from '@kb/contracts'

const MEDIA_RANGE_SEPARATOR = ','
const PARAMETER_SEPARATOR = ';'
const QUALITY_PARAMETER = 'q'
const DEFAULT_QUALITY = 1

/** True when an `Accept` header names Server-Sent Events itself; wildcards alone get JSON. */
export function acceptsEventStream(accept: string | undefined): boolean {
  if (accept === undefined) return false
  return accept.split(MEDIA_RANGE_SEPARATOR).some((range) => {
    const [mediaType = '', ...parameters] = range.split(PARAMETER_SEPARATOR)
    return mediaType.trim().toLowerCase() === EVENT_STREAM_MEDIA_TYPE && qualityOf(parameters) > 0
  })
}

// A malformed `q` reads as 0: an unclear preference must not switch the response to a stream.
function qualityOf(parameters: readonly string[]): number {
  for (const parameter of parameters) {
    const [name = '', rawValue = ''] = parameter.split('=')
    if (name.trim().toLowerCase() !== QUALITY_PARAMETER) continue
    const value = rawValue.trim()
    const quality = Number(value)
    return value !== '' && Number.isFinite(quality) ? quality : 0
  }
  return DEFAULT_QUALITY
}
