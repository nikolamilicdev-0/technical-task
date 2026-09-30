const TEMP_ID_PREFIX = 'temp-'

export function createTempId(): string {
  return `${TEMP_ID_PREFIX}${crypto.randomUUID()}`
}
