import { Text } from '@kb/ui'
import type { Components } from 'react-markdown'

const EXTERNAL_LINK = /^https?:\/\//i

// Document headings sit below the page's own <h1>, so every level shifts down by one.
// Each renderer drops react-markdown's `node` prop before spreading onto the DOM.
export const markdownComponents: Components = {
  h1: ({ node: _node, ...props }) => (
    <Text as="h2" variant="heading" className="mt-8 first:mt-0" {...props} />
  ),
  h2: ({ node: _node, ...props }) => (
    <Text as="h3" variant="subheading" className="mt-6 text-lg first:mt-0" {...props} />
  ),
  h3: ({ node: _node, ...props }) => (
    <Text as="h4" variant="subheading" className="mt-5 first:mt-0" {...props} />
  ),
  h4: ({ node: _node, ...props }) => <Text as="h4" variant="label" className="mt-4" {...props} />,
  h5: ({ node: _node, ...props }) => <Text as="h4" variant="label" className="mt-4" {...props} />,
  h6: ({ node: _node, ...props }) => <Text as="h4" variant="label" className="mt-4" {...props} />,
  p: ({ node: _node, ...props }) => <Text className="leading-7" {...props} />,
  // Prose links stay inline anchors (a Button would break line wrapping inside a sentence).
  a: ({ node: _node, href, children, ...props }) => {
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
  },
  ul: ({ node: _node, ...props }) => (
    <ul className="list-disc space-y-1.5 ps-5 marker:text-on-surface-variant" {...props} />
  ),
  ol: ({ node: _node, ...props }) => (
    <ol className="list-decimal space-y-1.5 ps-5 marker:text-on-surface-variant" {...props} />
  ),
  li: ({ node: _node, ...props }) => <li className="ps-1 leading-7" {...props} />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote className="border-s-2 border-primary/40 ps-4 text-on-surface-variant" {...props} />
  ),
  code: ({ node: _node, className, ...props }) => (
    <Text as="code" variant="code" className={className} {...props} />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre
      className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container p-4 font-mono text-sm leading-6 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit"
      {...props}
    />
  ),
  hr: ({ node: _node, ...props }) => <hr className="my-6 border-outline-variant" {...props} />,
  table: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: ({ node: _node, ...props }) => (
    <th
      className="border-b border-outline-variant bg-surface-container-low px-3 py-2 text-start font-semibold"
      {...props}
    />
  ),
  td: ({ node: _node, ...props }) => (
    <td className="border-b border-outline-variant px-3 py-2 align-top" {...props} />
  ),
}
