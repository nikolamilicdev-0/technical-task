import { describe, expect, it } from 'vitest'

import { extractPlainText } from '../../../../../src/modules/upload/extractors/plain-text.extractor.js'
import { TextExtractionError } from '../../../../../src/modules/upload/extractors/text-extraction.error.js'

const UTF8_BOM = [0xef, 0xbb, 0xbf]

function bytesOf(text: string, prefix: readonly number[] = []): Uint8Array {
  return Uint8Array.from([...prefix, ...new TextEncoder().encode(text)])
}

describe('extractPlainText', () => {
  it('decodes UTF-8 text as it is', async () => {
    await expect(extractPlainText(bytesOf('# Notes\n\n\tcafé 🌍'))).resolves.toBe(
      '# Notes\n\n\tcafé 🌍'
    )
  })

  it('drops a leading byte-order mark', async () => {
    await expect(extractPlainText(bytesOf('Hello', UTF8_BOM))).resolves.toBe('Hello')
  })

  it('normalises CRLF and lone CR line endings to LF', async () => {
    await expect(extractPlainText(bytesOf('one\r\ntwo\rthree\n'))).resolves.toBe(
      'one\ntwo\nthree\n'
    )
  })

  it('rejects bytes that are not UTF-8', async () => {
    const latin1 = Uint8Array.from([0x63, 0x61, 0x66, 0xe9])

    await expect(extractPlainText(latin1)).rejects.toThrow(TextExtractionError)
  })

  it('rejects binary content that happens to be valid UTF-8', async () => {
    await expect(extractPlainText(bytesOf('MZ\u0000\u0000binary'))).rejects.toThrow(
      'The file is not UTF-8 encoded text'
    )
  })
})
