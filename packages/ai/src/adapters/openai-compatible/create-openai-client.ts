import { OpenAI } from 'openai'

import type { CreateOpenAiClient } from './openai-like-client.types.js'

export const createOpenAiClient: CreateOpenAiClient = (endpoint) =>
  new OpenAI({
    baseURL: endpoint.baseUrl,
    apiKey: endpoint.apiKey,
    defaultHeaders: endpoint.headers,
    timeout: endpoint.timeoutMs,
    maxRetries: endpoint.maxRetries,
    // Explicit nulls stop the SDK from reading OPENAI_ORG_ID / OPENAI_PROJECT_ID and sending
    // OpenAI-only headers to other providers.
    organization: null,
    project: null,
  })
