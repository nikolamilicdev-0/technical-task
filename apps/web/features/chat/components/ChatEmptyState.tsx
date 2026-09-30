import { Button, EmptyState, Grid } from '@kb/ui'
import Link from 'next/link'

import { routes } from '@/core/config/routes'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { getChatStrings } from '@/features/chat/lib/chat-strings'

const PROMPT_COLUMNS = { base: 1, sm: 2 } as const

interface ChatEmptyStateProps {
  /** False once the documents have loaded and there are none to ask about. */
  hasDocuments: boolean
  /** Puts an example question into the composer. */
  onPickPrompt: (prompt: string) => void
}

/** A new chat: example questions to start from, or the way to add a first document. */
export function ChatEmptyState({ hasDocuments, onPickPrompt }: ChatEmptyStateProps) {
  const strings = getChatStrings(useT())

  if (!hasDocuments) {
    const addDocuments = (
      <Button asChild variant="outline">
        <Link href={routes.documents.list}>{strings.empty.noDocuments.action}</Link>
      </Button>
    )
    return (
      <EmptyState
        icon={icons.documents}
        title={strings.empty.noDocuments.title}
        description={strings.empty.noDocuments.description}
        action={addDocuments}
        className="py-16"
      />
    )
  }

  const prompts = strings.empty.prompts.map((prompt) => (
    <li key={prompt}>
      <Button
        variant="outline"
        fullWidth
        onClick={() => onPickPrompt(prompt)}
        className="h-full justify-start px-4 py-3 text-start whitespace-normal"
      >
        {prompt}
      </Button>
    </li>
  ))
  const promptList = (
    <Grid
      as="ul"
      columns={PROMPT_COLUMNS}
      gap="sm"
      aria-label={strings.empty.promptsLabel}
      className="mt-2 w-full"
    >
      {prompts}
    </Grid>
  )

  return (
    <EmptyState
      icon={icons.ask}
      title={strings.empty.title}
      description={strings.empty.description}
      action={promptList}
      className="max-w-2xl py-16"
    />
  )
}
