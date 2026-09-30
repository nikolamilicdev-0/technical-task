import type { UseFormSetError } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/core/api/api-error'
import {
  applyFieldErrors,
  getServerError,
  SERVER_ERROR_KEY,
  setServerError,
} from '@/core/api/form-errors'

interface DocumentFormValues {
  title: string
  content: string
  tags: string[]
}

const FIELDS = ['title', 'content', 'tags'] as const

function invalidPayload(fieldErrors: Record<string, string[]>): ApiError {
  return new ApiError({ status: 422, code: 'invalid_payload', fieldErrors })
}

function setup() {
  // Typed like `form.setError` so the generic is inferred as it is in real forms.
  const setError: UseFormSetError<DocumentFormValues> = vi.fn()
  return { setError }
}

describe('applyFieldErrors', () => {
  it('puts each message on its field', () => {
    const { setError } = setup()
    const applied = applyFieldErrors(
      invalidPayload({ title: ['Too long'], content: ['Required'] }),
      setError,
      FIELDS
    )
    expect(applied).toBe(true)
    expect(setError).toHaveBeenCalledWith('title', { type: 'server', message: 'Too long' })
    expect(setError).toHaveBeenCalledWith('content', { type: 'server', message: 'Required' })
  })

  it('maps nested paths to their field and keeps the first message', () => {
    const { setError } = setup()
    applyFieldErrors(
      invalidPayload({ 'tags.1': ['Tag too long'], 'tags.3': ['Duplicate'] }),
      setError,
      FIELDS
    )
    expect(setError).toHaveBeenCalledOnce()
    expect(setError).toHaveBeenCalledWith('tags', { type: 'server', message: 'Tag too long' })
  })

  it('sends errors for unknown fields to the root', () => {
    const { setError } = setup()
    applyFieldErrors(
      invalidPayload({ '': ['Payload rejected'], owner: ['Nope'] }),
      setError,
      FIELDS
    )
    expect(setError).toHaveBeenCalledOnce()
    expect(setError).toHaveBeenCalledWith(SERVER_ERROR_KEY, {
      type: 'server',
      message: 'Payload rejected',
    })
  })

  it('does nothing when the error carries no field errors', () => {
    const { setError } = setup()
    const applied = applyFieldErrors(
      new ApiError({ status: 500, code: 'internal_error' }),
      setError,
      FIELDS
    )
    expect(applied).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })

  it('skips fields whose message list is empty', () => {
    const { setError } = setup()
    expect(applyFieldErrors(invalidPayload({ title: [] }), setError, FIELDS)).toBe(false)
  })
})

describe('server errors', () => {
  it('writes to and reads from root.server', () => {
    const { setError } = setup()
    setServerError(setError, 'Email or password is incorrect.')
    expect(setError).toHaveBeenCalledWith('root.server', {
      type: 'server',
      message: 'Email or password is incorrect.',
    })
    expect(getServerError({ root: { server: { type: 'server', message: 'Down' } } })).toBe('Down')
    expect(getServerError({})).toBeUndefined()
  })
})
