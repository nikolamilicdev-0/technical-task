const TEMP_ID_PREFIX = 'temp-'

/** Id for an optimistic row until the server assigns its real UUID. */
export function createTempId(): string {
  return `${TEMP_ID_PREFIX}${crypto.randomUUID()}`
}

export function isTempId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX)
}
