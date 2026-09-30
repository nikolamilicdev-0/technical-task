import { Button, Callout, Dialog, Flex } from '@kb/ui'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { toast } from 'sonner'

import { isAbortError } from '@/core/api/abort'
import { routes } from '@/core/config/routes'
import { interpolate } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { UploadDropzone } from '@/features/documents/components/UploadDropzone'
import { UploadFileSummary } from '@/features/documents/components/UploadFileSummary'
import { useUploadDocument } from '@/features/documents/hooks/useUploadDocument'
import {
  getDocumentsStrings,
  getUploadErrorMessage,
} from '@/features/documents/lib/documents-strings'

interface UploadDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Where focus goes on close; by default it returns to whatever opened the dialog. */
  onCloseAutoFocus?: (event: Event) => void
}

/** Pick or drop one file, upload it with progress, then offer to open the new document. */
export function UploadDocumentDialog({
  open,
  onOpenChange,
  onCloseAutoFocus,
}: UploadDocumentDialogProps) {
  const t = useT()
  const strings = getDocumentsStrings(t)
  const router = useRouter()
  const upload = useUploadDocument()
  const [file, setFile] = useState<File | null>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<HTMLInputElement>(null)
  const UploadIcon = icons.upload

  // Closing mid-upload cancels it; the dialog always reopens empty.
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      upload.cancel()
      upload.reset()
      setFile(null)
    }
    onOpenChange(nextOpen)
  }
  // The control just used disappears, so focus moves on to the next step.
  const chooseFile = (next: File) => {
    upload.reset()
    flushSync(() => setFile(next))
    submitRef.current?.focus()
  }
  const removeFile = () => {
    upload.reset()
    flushSync(() => setFile(null))
    pickerRef.current?.focus()
  }
  const submit = () => {
    if (!file) return
    upload.mutate(file, {
      onSuccess: (document) => {
        const openDocument = () => router.push(routes.documents.detail(document.id))
        toast.success(interpolate(strings.upload.uploaded, { title: document.title }), {
          action: { label: strings.upload.open, onClick: openDocument },
        })
        handleOpenChange(false)
      },
    })
  }

  const failure =
    upload.isError && !isAbortError(upload.error) ? getUploadErrorMessage(t, upload.error) : null
  const failureNotice = failure ? (
    <Callout tone="error" icon={icons.error} role="alert">
      {failure}
    </Callout>
  ) : null
  const picker = file ? (
    <UploadFileSummary
      file={file}
      uploading={upload.isPending}
      progress={upload.progress}
      onRemove={removeFile}
    />
  ) : (
    <UploadDropzone onFileAccepted={chooseFile} inputRef={pickerRef} />
  )
  const cancel = () => handleOpenChange(false)
  // Opening starts at the file picker rather than the close button.
  const focusPicker = (event: Event) => {
    event.preventDefault()
    pickerRef.current?.focus()
  }
  const footer = (
    <>
      <Button variant="outline" onClick={cancel}>
        {t.common.cancel}
      </Button>
      <Button ref={submitRef} onClick={submit} disabled={!file} loading={upload.isPending}>
        <UploadIcon aria-hidden />
        {strings.upload.submit}
      </Button>
    </>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={strings.upload.title}
      description={strings.upload.description}
      closeLabel={t.common.close}
      footer={footer}
      onOpenAutoFocus={focusPicker}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <Flex direction="column" gap="md">
        {picker}
        {failureNotice}
      </Flex>
    </Dialog>
  )
}
