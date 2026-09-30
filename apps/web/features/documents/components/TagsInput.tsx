import { TAG_MAX_LENGTH } from '@kb/contracts'
import { Button, Flex, Input } from '@kb/ui'
import {
  type ChangeEvent,
  type KeyboardEvent,
  type RefCallback,
  useCallback,
  useRef,
  useState,
} from 'react'

import { interpolate } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { TAG_COMMIT_KEYS } from '@/features/documents/constants'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'
import { addTags, hasRoomForTags, removeTag } from '@/features/documents/lib/tags'

// The look of the @kb/ui text fields (their classes are private to the package) on a wrapper.
const TAGS_FIELD_CLASSES = [
  'min-h-10 w-full rounded-md border border-outline bg-surface-container-lowest px-1.5 py-1 shadow-xs transition',
  'hover:border-on-surface-variant focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20',
  'has-[input[aria-invalid=true]]:border-error has-[input[aria-invalid=true]]:focus-within:ring-error/20',
].join(' ')
const TAG_INPUT_CLASSES =
  'h-7 min-w-28 flex-1 border-0 bg-transparent px-1.5 shadow-none hover:border-0 focus-visible:ring-0'
const TAG_CHIP_CLASSES = 'h-7 gap-1 px-2.5 text-xs [&_svg]:size-3.5'

interface TagsInputProps {
  value: readonly string[]
  onChange: (tags: string[]) => void
  onBlur?: () => void
  name?: string
  ref?: RefCallback<HTMLInputElement>
  id?: string
  disabled?: boolean
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

export function TagsInput({
  value,
  onChange,
  onBlur,
  ref,
  disabled,
  ...inputProps
}: TagsInputProps) {
  const strings = getDocumentsStrings(useT())
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const RemoveIcon = icons.remove
  const full = !hasRoomForTags(value)
  const placeholder = full ? strings.form.tagsFull : strings.form.tagsPlaceholder

  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      ref?.(node)
    },
    [ref]
  )

  const commitDraft = () => {
    if (draft.trim() !== '') onChange(addTags(value, draft))
    setDraft('')
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter also confirms an IME composition, which must not add a half-typed tag.
    if (event.nativeEvent.isComposing) return
    if (TAG_COMMIT_KEYS.has(event.key)) {
      event.preventDefault()
      commitDraft()
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)
  // A draft left in the input still counts, so typing a tag and pressing Save keeps it.
  const handleBlur = () => {
    commitDraft()
    onBlur?.()
  }
  const remove = (tag: string) => {
    onChange(removeTag(value, tag))
    inputRef.current?.focus()
  }

  const chips = value.map((tag) => (
    <Button
      key={tag}
      variant="chip"
      className={TAG_CHIP_CLASSES}
      disabled={disabled}
      aria-label={interpolate(strings.form.removeTag, { tag })}
      onClick={() => remove(tag)}
    >
      {tag}
      <RemoveIcon aria-hidden />
    </Button>
  ))

  return (
    <Flex wrap align="center" gap="xs" className={TAGS_FIELD_CLASSES}>
      {chips}
      <Input
        {...inputProps}
        ref={setInputRef}
        value={draft}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
        readOnly={full}
        maxLength={TAG_MAX_LENGTH}
        autoComplete="off"
        enterKeyHint="enter"
        placeholder={placeholder}
        className={TAG_INPUT_CLASSES}
      />
    </Flex>
  )
}
