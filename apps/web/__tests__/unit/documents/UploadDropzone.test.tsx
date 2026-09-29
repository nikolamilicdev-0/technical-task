import { MAX_UPLOAD_BYTES } from '@kb/contracts'
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/__tests__/helpers/render'
import { UploadDropzone } from '@/features/documents/components/UploadDropzone'
import en from '@/messages/en.json'

const { upload } = en.documents

function setup() {
  const onFileAccepted = vi.fn()
  // Browsers only filter by `accept` in the picker; dropped files arrive unfiltered.
  const user = userEvent.setup({ applyAccept: false })
  renderWithProviders(<UploadDropzone onFileAccepted={onFileAccepted} />)
  const input = screen.getByLabelText(upload.dropzone, { exact: false })
  return { user, input, onFileAccepted }
}

function sizedFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('UploadDropzone', () => {
  it('accepts a supported file', async () => {
    const { user, input, onFileAccepted } = setup()
    const notes = new File(['# Notes'], 'notes.md', { type: 'text/markdown' })
    await user.upload(input, notes)
    expect(onFileAccepted).toHaveBeenCalledWith(notes)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('rejects an unsupported type with an explanation', async () => {
    const { user, input, onFileAccepted } = setup()
    await user.upload(input, new File(['MZ'], 'setup.exe', { type: 'application/x-msdownload' }))
    expect(screen.getByRole('alert')).toHaveTextContent(upload.errors.unsupportedType)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(onFileAccepted).not.toHaveBeenCalled()
  })

  it('rejects files over the size limit and empty files', async () => {
    const { user, input, onFileAccepted } = setup()
    await user.upload(input, sizedFile('huge.pdf', 'application/pdf', MAX_UPLOAD_BYTES + 1))
    expect(screen.getByRole('alert')).toHaveTextContent('This file is larger than 10 MB.')
    await user.upload(input, sizedFile('empty.txt', 'text/plain', 0))
    expect(screen.getByRole('alert')).toHaveTextContent(upload.errors.empty)
    expect(onFileAccepted).not.toHaveBeenCalled()
  })

  it('accepts a dropped file and clears an earlier rejection', async () => {
    const { user, input, onFileAccepted } = setup()
    await user.upload(input, new File(['x'], 'photo.png', { type: 'image/png' }))
    const report = new File(['%PDF'], 'report.pdf', { type: 'application/pdf' })
    const dropzone = screen.getByText(upload.dropzone).closest('label')
    if (!dropzone) throw new Error('The dropzone should be a label')
    fireEvent.drop(dropzone, { dataTransfer: { files: [report] } })
    expect(onFileAccepted).toHaveBeenCalledWith(report)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
