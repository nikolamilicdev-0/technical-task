import { MAX_UPLOAD_BYTES } from '@kb/contracts'
import { describe, expect, it } from 'vitest'

import { validateUpload } from '@/features/documents/lib/validate-upload'

const file = (name: string, type: string, size = 1_024) => ({ name, type, size })

describe('validateUpload', () => {
  it.each([
    ['notes.txt', 'text/plain'],
    ['notes.md', 'text/markdown'],
    ['report.pdf', 'application/pdf'],
    ['export.data', 'Text/Plain; charset=utf-8'],
    ['README.MD', ''],
    ['notes.md', 'application/octet-stream'],
  ])('accepts %s sent as "%s"', (name, type) => {
    expect(validateUpload(file(name, type))).toEqual({ ok: true })
  })

  it.each([
    ['setup.exe', 'application/x-msdownload'],
    ['photo.png', 'image/png'],
    ['.md', ''],
    ['Makefile', ''],
  ])('rejects %s sent as "%s"', (name, type) => {
    expect(validateUpload(file(name, type))).toEqual({ ok: false, reason: 'unsupportedType' })
  })

  it('rejects empty files', () => {
    expect(validateUpload(file('empty.txt', 'text/plain', 0))).toEqual({
      ok: false,
      reason: 'empty',
    })
  })

  it('accepts files up to the size limit and rejects larger ones', () => {
    expect(validateUpload(file('big.pdf', 'application/pdf', MAX_UPLOAD_BYTES))).toEqual({
      ok: true,
    })
    expect(validateUpload(file('huge.pdf', 'application/pdf', MAX_UPLOAD_BYTES + 1))).toEqual({
      ok: false,
      reason: 'tooLarge',
    })
  })

  it('reports an unsupported type before the size', () => {
    const video = file('talk.mp4', 'video/mp4', MAX_UPLOAD_BYTES * 3)
    expect(validateUpload(video)).toEqual({ ok: false, reason: 'unsupportedType' })
  })
})
