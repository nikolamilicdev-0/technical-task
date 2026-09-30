import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { markdownComponents } from '@/core/components/markdown/markdown-components'

const REMARK_PLUGINS = [remarkGfm]

interface MarkdownContentProps {
  content: string
  components?: Components
}

/** Raw HTML in the Markdown is never interpreted (there is no rehype-raw). */
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
