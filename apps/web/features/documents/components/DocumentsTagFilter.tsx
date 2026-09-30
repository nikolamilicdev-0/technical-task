import { Badge, Button, Menu, type MenuEntry } from '@kb/ui'

import { pluralize } from '@/core/i18n/interpolate'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'
import { toggleTag } from '@/features/documents/lib/tags'

interface DocumentsTagFilterProps {
  tags: readonly string[]
  selected: readonly string[]
  onChange: (selected: string[]) => void
}

export function DocumentsTagFilter({ tags, selected, onChange }: DocumentsTagFilterProps) {
  const strings = getDocumentsStrings(useT())
  const TagIcon = icons.tag
  const selectedCount = selected.length

  const tagEntries = tags.map((tag): MenuEntry => ({
    type: 'checkbox',
    id: `tag:${tag}`,
    label: tag,
    checked: selected.includes(tag),
    onCheckedChange: (checked) => onChange(toggleTag(selected, tag, checked)),
  }))
  const entries: MenuEntry[] =
    tags.length === 0
      ? [{ type: 'label', id: 'no-tags', label: strings.list.noTags }]
      : [
          ...tagEntries,
          { type: 'separator', id: 'separator' },
          {
            type: 'item',
            id: 'clear',
            label: strings.list.clearTags,
            onSelect: () => onChange([]),
            disabled: selectedCount === 0,
          },
        ]

  const countBadge = selectedCount > 0 ? <Badge tone="primary">{selectedCount}</Badge> : null
  // The count badge alone would read as a bare number, so the name spells it out.
  const triggerLabel =
    selectedCount > 0 ? pluralize(strings.list.tagsSelected, selectedCount) : undefined
  const trigger = (
    <Button variant="outline" aria-label={triggerLabel}>
      <TagIcon aria-hidden />
      {strings.list.tags}
      {countBadge}
    </Button>
  )
  const heading = tags.length > 0 ? strings.list.tagsHeading : undefined

  return (
    <Menu
      trigger={trigger}
      items={entries}
      label={heading}
      align="end"
      className="max-h-80 overflow-y-auto"
    />
  )
}
