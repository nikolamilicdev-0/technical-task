import { createHash } from 'node:crypto'

/** Hex SHA-256 of UTF-8 text: the encoding the documents trigger uses in Postgres. */
export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}
