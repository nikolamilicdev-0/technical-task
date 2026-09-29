import { MAX_UPLOAD_BYTES } from '@kb/contracts'
import { Flex, Text } from '@kb/ui'
import { type ChangeEvent, type DragEvent, type Ref, useId, useState } from 'react'

import { interpolate } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { formatBytes } from '@/core/utils/format-number'
import { UPLOAD_ACCEPT } from '@/features/documents/constants'
import { formatUploadError, getDocumentsStrings } from '@/features/documents/lib/documents-strings'
import { validateUpload } from '@/features/documents/lib/validate-upload'

const DROPZONE_CLASSES = [
  'cursor-pointer rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-lowest px-6 py-10 text-center transition-colors',
  'hover:border-outline hover:bg-surface-container-low',
  'data-dragging:border-primary data-dragging:bg-primary-container/40',
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
].join(' ')

interface UploadDropzoneProps {
  /** Receives a file that passed the size and type checks. */
  onFileAccepted: (file: File) => void
  inputRef?: Ref<HTMLInputElement>
}

/** Drop target and file picker in one: the whole area is the picker's label. */
export function UploadDropzone({ onFileAccepted, inputRef }: UploadDropzoneProps) {
  const strings = getDocumentsStrings(useT())
  const inputId = useId()
  const errorId = useId()
  const [dragging, setDragging] = useState(false)
  const [rejection, setRejection] = useState<string | null>(null)
  const DropIcon = icons.dropFile

  const receive = (file: File | undefined) => {
    if (!file) return
    const validation = validateUpload(file)
    if (!validation.ok) {
      setRejection(formatUploadError(strings, validation.reason))
      return
    }
    setRejection(null)
    onFileAccepted(file)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    receive(event.target.files?.[0])
    // Cleared so that picking the same file again still fires a change.
    event.target.value = ''
  }
  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(true)
  }
  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    setDragging(false)
  }
  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    receive(event.dataTransfer.files[0])
  }

  const formats = interpolate(strings.upload.formats, { maximum: formatBytes(MAX_UPLOAD_BYTES) })
  const rejectionText = rejection ? (
    <Text id={errorId} role="alert" variant="caption" tone="error">
      {rejection}
    </Text>
  ) : null

  return (
    <Flex direction="column" gap="sm">
      <Flex
        as="label"
        htmlFor={inputId}
        direction="column"
        align="center"
        gap="sm"
        data-dragging={dragging || undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={DROPZONE_CLASSES}
      >
        <Flex
          align="center"
          justify="center"
          className="size-11 rounded-full bg-surface-container-high text-on-surface-variant"
        >
          <DropIcon aria-hidden className="size-5" />
        </Flex>
        <Text as="span" variant="label">
          {strings.upload.dropzone}
        </Text>
        <Text as="span" variant="caption" tone="muted">
          {formats}
        </Text>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={UPLOAD_ACCEPT}
          aria-describedby={rejection ? errorId : undefined}
          aria-invalid={rejection ? true : undefined}
          onChange={handleChange}
          className="sr-only"
        />
      </Flex>
      {rejectionText}
    </Flex>
  )
}
