import { type DocumentSummary, MAX_SCOPE_DOCUMENTS } from '@kb/contracts'
import { Badge, Button, Flex, Menu, type MenuEntry, Text } from '@kb/ui'

import { interpolate } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { describeScope, getChatStrings } from '@/features/chat/lib/chat-strings'
import { isScopeFull, toggleScope } from '@/features/chat/lib/scope'

interface DocumentScopePickerProps {
  /** Documents chat can answer from right now. */
  documents: readonly DocumentSummary[]
  selected: readonly string[]
  onChange: (selected: string[]) => void
}

/** Narrows answers to picked documents; nothing picked means every ready document. */
export function DocumentScopePicker({ documents, selected, onChange }: DocumentScopePickerProps) {
  const strings = getChatStrings(useT())
  const ScopeIcon = icons.scope
  const ClearIcon = icons.remove
  const full = isScopeFull(selected)
  const summary = describeScope(strings, selected.length)
  const clear = () => onChange([])

  const documentEntries = documents.map((document): MenuEntry => ({
    type: 'checkbox',
    id: document.id,
    label: (
      <Text as="span" truncate>
        {document.title}
      </Text>
    ),
    checked: selected.includes(document.id),
    disabled: full && !selected.includes(document.id),
    onCheckedChange: (checked) => onChange(toggleScope(selected, document.id, checked)),
  }))
  const limitNote = interpolate(strings.scope.limit, { maximum: MAX_SCOPE_DOCUMENTS })
  const entries: MenuEntry[] =
    documents.length === 0
      ? [{ type: 'label', id: 'none', label: strings.scope.none }]
      : [
          ...documentEntries,
          { type: 'separator', id: 'separator' },
          { type: 'label', id: 'limit', label: limitNote },
          {
            type: 'item',
            id: 'clear',
            label: strings.scope.clear,
            onSelect: clear,
            disabled: selected.length === 0,
          },
        ]

  // Picked documents read as a badge, so a narrowed answer is visible at a glance.
  const scopeLabel =
    selected.length > 0 ? (
      <Badge tone="primary">{summary}</Badge>
    ) : (
      <Text as="span" tone="inherit" truncate>
        {summary}
      </Text>
    )
  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      aria-label={interpolate(strings.scope.label, { scope: summary })}
      className="min-w-0 text-on-surface-variant"
    >
      <ScopeIcon aria-hidden />
      {scopeLabel}
    </Button>
  )
  const clearButton =
    selected.length > 0 ? (
      <Button variant="ghost" size="iconSm" aria-label={strings.scope.clear} onClick={clear}>
        <ClearIcon aria-hidden />
      </Button>
    ) : null

  return (
    <Flex align="center" gap="xs" className="min-w-0">
      <Menu
        trigger={trigger}
        items={entries}
        label={strings.scope.heading}
        align="start"
        side="top"
        className="max-h-80 overflow-y-auto"
      />
      {clearButton}
    </Flex>
  )
}
