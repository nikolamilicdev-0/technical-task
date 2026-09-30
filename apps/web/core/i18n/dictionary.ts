import en from '@/messages/en.json'

export type Dictionary = typeof en

export function getDictionary(): Dictionary {
  return en
}
