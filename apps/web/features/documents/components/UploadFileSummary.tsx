import { Button, Card, Flex, Text } from '@kb/ui'

import { interpolate } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { formatBytes, formatPercent } from '@/core/utils/format-number'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'

// Native <progress>, restyled with theme tokens: WebKit and Firefox expose different parts.
const PROGRESS_CLASSES = [
  'h-1.5 w-full appearance-none overflow-hidden rounded-full bg-surface-container-highest',
  '[&::-webkit-progress-bar]:bg-surface-container-highest [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary [&::-webkit-progress-value]:transition-[width]',
  '[&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary',
].join(' ')

const UPLOAD_COMPLETE = 1

interface UploadFileSummaryProps {
  file: File
  uploading: boolean
  progress: number
  onRemove: () => void
}

/** At 100 % the server is still reading the text. */
export function UploadFileSummary({ file, uploading, progress, onRemove }: UploadFileSummaryProps) {
  const strings = getDocumentsStrings(useT())
  const FileIcon = icons.file
  const RemoveIcon = icons.remove
  const removeLabel = interpolate(strings.upload.remove, { filename: file.name })
  const size = formatBytes(file.size)

  const status =
    progress >= UPLOAD_COMPLETE
      ? strings.upload.processing
      : interpolate(strings.upload.progress, { percent: formatPercent(progress) })
  const progressRow = uploading ? (
    <Flex direction="column" gap="xs">
      <progress
        value={progress}
        max={UPLOAD_COMPLETE}
        aria-label={status}
        className={PROGRESS_CLASSES}
      />
      <Text variant="caption" tone="muted">
        {status}
      </Text>
    </Flex>
  ) : null
  const removeButton = uploading ? null : (
    <Button variant="ghost" size="iconSm" aria-label={removeLabel} onClick={onRemove}>
      <RemoveIcon aria-hidden />
    </Button>
  )

  return (
    <Card padding="sm" className="bg-surface-container-low">
      <Flex direction="column" gap="sm">
        <Flex align="center" gap="sm">
          <Flex
            align="center"
            justify="center"
            className="size-10 shrink-0 rounded-lg bg-surface-container-high text-on-surface-variant"
          >
            <FileIcon aria-hidden className="size-5" />
          </Flex>
          <Flex direction="column" className="min-w-0 flex-1">
            <Text variant="label" truncate>
              {file.name}
            </Text>
            <Text variant="caption" tone="muted">
              {size}
            </Text>
          </Flex>
          {removeButton}
        </Flex>
        {progressRow}
      </Flex>
    </Card>
  )
}
