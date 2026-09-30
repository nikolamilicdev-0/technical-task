import { MESSAGE_MAX_LENGTH } from '@kb/contracts'
import { Button, Flex, Text, Textarea, VisuallyHidden } from '@kb/ui'
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useId,
} from 'react'

import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { COMPOSER_COUNTER_FROM } from '@/features/chat/constants'
import { useAutosizeTextarea } from '@/features/chat/hooks/useAutosizeTextarea'
import { isReceiving } from '@/features/chat/lib/chat-stream-reducer'
import { describeCharacterCount, getChatStrings } from '@/features/chat/lib/chat-strings'
import { shouldSubmitOnKey } from '@/features/chat/lib/should-submit-on-key'
import type { ChatStreamStatus } from '@/features/chat/types'

// The card draws the field's border and focus ring; the textarea inside only holds the text.
const COMPOSER_CLASSES =
  'rounded-xl border border-outline bg-surface-container-lowest shadow-sm transition focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20'
const TEXTAREA_CLASSES =
  'max-h-60 min-h-12 resize-none border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0'

interface ComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onStop: () => void
  status: ChatStreamStatus
  textareaRef: RefObject<HTMLTextAreaElement | null>
  /** Holds sending back, e.g. while the conversation is still loading. */
  disabled?: boolean
  /** Controls at the start of the toolbar, such as the document scope. */
  tools?: ReactNode
}

/** The question field: Enter sends, Shift+Enter adds a line, Stop ends an answer early. */
export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  status,
  textareaRef,
  disabled = false,
  tools,
}: ComposerProps) {
  const strings = getChatStrings(useT())
  const hintId = useId()
  const counterId = useId()
  useAutosizeTextarea(textareaRef, value)
  const SendIcon = icons.send
  const StopIcon = icons.stop

  const receiving = isReceiving(status)
  const canSubmit = !disabled && !receiving && value.trim() !== ''
  const showCounter = value.length >= COMPOSER_COUNTER_FROM
  const describedBy = showCounter ? `${hintId} ${counterId}` : hintId

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!shouldSubmitOnKey(event.nativeEvent)) return
    event.preventDefault()
    if (canSubmit) onSubmit()
  }
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (canSubmit) onSubmit()
    textareaRef.current?.focus()
  }

  const counter = showCounter ? (
    <Text
      id={counterId}
      variant="caption"
      tone={value.length >= MESSAGE_MAX_LENGTH ? 'error' : 'muted'}
      className="tabular-nums"
    >
      {describeCharacterCount(strings, value.length)}
    </Text>
  ) : null
  // Stop waits for the API to store the question, so a stopped answer always has one to follow.
  const action = receiving ? (
    <Button
      variant="outline"
      size="icon"
      aria-label={strings.composer.stop}
      onClick={onStop}
      disabled={status === 'connecting'}
    >
      <StopIcon aria-hidden className="fill-current" />
    </Button>
  ) : (
    <Button type="submit" size="icon" aria-label={strings.composer.send} disabled={!canSubmit}>
      <SendIcon aria-hidden />
    </Button>
  )

  return (
    <Flex as="form" direction="column" onSubmit={handleSubmit} className={COMPOSER_CLASSES}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={1}
        maxLength={MESSAGE_MAX_LENGTH}
        enterKeyHint="send"
        aria-label={strings.composer.label}
        aria-describedby={describedBy}
        placeholder={strings.composer.placeholder}
        className={TEXTAREA_CLASSES}
      />
      <Flex align="center" justify="between" gap="sm" className="px-2 pb-2">
        <Flex align="center" gap="xs" className="min-w-0">
          {tools}
        </Flex>
        <Flex align="center" gap="sm" className="shrink-0">
          {counter}
          {action}
        </Flex>
      </Flex>
      <VisuallyHidden id={hintId}>{strings.composer.hint}</VisuallyHidden>
    </Flex>
  )
}
