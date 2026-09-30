import type { ComponentProps } from 'react'
import type { ExtraProps } from 'react-markdown'

const EXTERNAL_LINK = /^https?:\/\//i

export type MarkdownLinkProps = ComponentProps<'a'> & ExtraProps

/**
 * How Markdown renders a link; overrides of `a` fall back to it for ordinary links. Prose links
 * stay inline anchors (a Button would break line wrapping inside a sentence).
 */
export function MarkdownLink({ node: _node, href, children, ...props }: MarkdownLinkProps) {
  const external = href ? EXTERNAL_LINK.test(href) : false
  const target = external ? '_blank' : undefined
  const rel = external ? 'noreferrer' : undefined
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
      {...props}
    >
      {children}
    </a>
  )
}
