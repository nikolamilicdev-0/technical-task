/** Every provider profile shipped; `custom` covers any other OpenAI-compatible server. */
export const PROVIDER_IDS = [
  'openai',
  'groq',
  'together',
  'openrouter',
  'gemini',
  'ollama',
  'custom',
] as const
export type ProviderId = (typeof PROVIDER_IDS)[number]
