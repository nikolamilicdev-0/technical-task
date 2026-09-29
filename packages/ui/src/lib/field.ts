/** Shared look of text controls (Input, Textarea); invalid state follows `aria-invalid`. */
export const FIELD_CLASSES = [
  'w-full min-w-0 rounded-md border border-outline bg-surface-container-lowest px-3 text-sm text-on-surface shadow-xs',
  'transition placeholder:text-on-surface-variant/70 hover:border-on-surface-variant',
  'focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 focus-visible:outline-hidden',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-invalid:border-error aria-invalid:focus-visible:ring-error/20',
].join(' ')
