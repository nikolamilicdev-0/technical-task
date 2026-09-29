import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { markdownComponents } from '@/core/components/markdown/markdown-components'

const REMARK_PLUGINS = [remarkGfm]

interface MarkdownContentProps {
  content: string
  /** Per-use overrides, e.g. rendering `#cite-n` links as citation chips. */
  components?: Components
}

/** Renders user Markdown with theme typography; raw HTML is never interpreted. */
export function MarkdownContent({ content, components }: MarkdownContentProps) {
  const resolvedComponents = components
    ? { ...markdownComponents, ...components }
    : markdownComponents

  return (
    <div className="space-y-4 text-sm leading-7 break-words text-on-surface">
      <Markdown remarkPlugins={REMARK_PLUGINS} components={resolvedComponents}>
        {content}
      </Markdown>
    </div>
  )
}
