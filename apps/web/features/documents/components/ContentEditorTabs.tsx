import { Button, Flex } from '@kb/ui'
import type { KeyboardEvent } from 'react'

import { useT } from '@/core/i18n/useT'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'
import type { ContentEditorTab } from '@/features/documents/types'

const EDITOR_TABS = ['write', 'preview'] as const satisfies readonly ContentEditorTab[]

// Arrow keys wrap around, so the pair works the same in either reading direction.
const TAB_MOVES: Readonly<Partial<Record<string, (index: number) => number>>> = {
  ArrowRight: (index) => index + 1,
  ArrowLeft: (index) => index - 1,
  Home: () => 0,
  End: () => EDITOR_TABS.length - 1,
}

const TAB_CLASSES =
  'h-7 px-3 text-on-surface-variant aria-selected:bg-surface-container-lowest aria-selected:text-on-surface aria-selected:shadow-xs'

function nextTab(current: ContentEditorTab, key: string): ContentEditorTab | undefined {
  const move = TAB_MOVES[key]
  if (!move) return undefined
  const count = EDITOR_TABS.length
  return EDITOR_TABS[(move(EDITOR_TABS.indexOf(current)) + count) % count]
}

interface ContentEditorTabsProps {
  active: ContentEditorTab
  onChange: (tab: ContentEditorTab) => void
  tabId: (tab: ContentEditorTab) => string
  panelId: (tab: ContentEditorTab) => string
}

/** Write / Preview switch following the ARIA tabs pattern (roving focus, arrow keys). */
export function ContentEditorTabs({ active, onChange, tabId, panelId }: ContentEditorTabsProps) {
  const strings = getDocumentsStrings(useT())
  const labels: Record<ContentEditorTab, string> = {
    write: strings.form.write,
    preview: strings.form.preview,
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const target = nextTab(active, event.key)
    if (!target) return
    event.preventDefault()
    onChange(target)
    document.getElementById(tabId(target))?.focus()
  }

  const tabs = EDITOR_TABS.map((tab) => (
    <Button
      key={tab}
      id={tabId(tab)}
      role="tab"
      aria-selected={tab === active}
      aria-controls={panelId(tab)}
      tabIndex={tab === active ? 0 : -1}
      variant="ghost"
      size="sm"
      className={TAB_CLASSES}
      onClick={() => onChange(tab)}
      onKeyDown={handleKeyDown}
    >
      {labels[tab]}
    </Button>
  ))

  return (
    <Flex
      role="tablist"
      aria-label={strings.form.contentView}
      gap="xs"
      className="rounded-lg bg-surface-container p-0.5"
    >
      {tabs}
    </Flex>
  )
}
