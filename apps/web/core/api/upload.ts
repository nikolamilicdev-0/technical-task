import { networkError } from '@/core/api/api-error'
import { parseJsonSafely } from '@/core/api/json'
import type { XhrUploadRequest, XhrUploadResult } from '@/core/api/types'

const ABORT_ERROR_NAME = 'AbortError'

function abortError(): DOMException {
  return new DOMException('The upload was aborted.', ABORT_ERROR_NAME)
}

/** Multipart POST over XMLHttpRequest, the only browser API that reports upload progress. */
export function xhrUpload({
  url,
  formData,
  token,
  signal,
  onProgress,
}: XhrUploadRequest): Promise<XhrUploadResult> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError())
      return
    }

    const xhr = new XMLHttpRequest()
    const abort = (): void => xhr.abort()
    const settle = (): void => signal?.removeEventListener('abort', abort)

    xhr.open('POST', url)
    xhr.setRequestHeader('Accept', 'application/json')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      settle()
      resolve({
        status: xhr.status,
        body: parseJsonSafely(xhr.responseText),
        retryAfter: xhr.getResponseHeader('Retry-After'),
      })
    }
    xhr.onerror = () => {
      settle()
      reject(networkError())
    }
    xhr.onabort = () => {
      settle()
      reject(abortError())
    }

    signal?.addEventListener('abort', abort, { once: true })
    xhr.send(formData)
  })
}
