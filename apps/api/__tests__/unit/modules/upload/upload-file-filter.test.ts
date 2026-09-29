import { describe, expect, it, vi } from 'vitest'

import { ApiHttpException } from '../../../../src/common/errors/api-http.exception.js'
import { uploadFileFilter } from '../../../../src/modules/upload/upload-file-filter.js'

type Accept = (error: Error | null, acceptFile: boolean) => void

describe('uploadFileFilter', () => {
  it('lets supported files through', () => {
    const accept = vi.fn<Accept>()

    uploadFileFilter({}, { mimetype: 'application/octet-stream', originalname: 'a.md' }, accept)

    expect(accept).toHaveBeenCalledWith(null, true)
  })

  it('refuses other files with 415 unsupported_media_type', () => {
    const accept = vi.fn<Accept>()

    uploadFileFilter({}, { mimetype: 'application/x-msdownload', originalname: 'a.exe' }, accept)

    const [error, accepted] = accept.mock.lastCall ?? []
    expect(accepted).toBe(false)
    expect(error).toBeInstanceOf(ApiHttpException)
    expect(error).toMatchObject({
      body: {
        code: 'unsupported_media_type',
        messages: ['Only .txt, .md, .pdf files are supported'],
      },
    })
  })
})
