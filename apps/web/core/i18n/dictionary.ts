import en from '@/messages/en.json'

/** Every user-facing string, typed from `messages/en.json`. */
export type Dictionary = typeof en

/** Server entry point for copy; client components read the same object through `useT()`. */
export function getDictionary(): Dictionary {
  return en
}
