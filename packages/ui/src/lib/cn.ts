import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Custom theme sizes must be registered, otherwise tailwind-merge reads `text-code` as a colour.
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ['code'] } },
})

/** Joins class names and resolves Tailwind conflicts so the last class wins. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
