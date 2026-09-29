/** DI tokens of the `@kb/ai` ports; application code never sees an adapter class. */
export const CHAT_MODEL = Symbol('CHAT_MODEL')
export const EMBEDDING_MODEL = Symbol('EMBEDDING_MODEL')
/** Whether the `AI_*` variables formed a usable configuration at startup (`AiStatus`). */
export const AI_STATUS = Symbol('AI_STATUS')
/** Both ports come from one `createAiClients` call; internal to AiModule. */
export const AI_CLIENTS = Symbol('AI_CLIENTS')

/** Provider and model name the stand-in ports report while AI is not configured. */
export const UNCONFIGURED_MODEL = 'unconfigured'
