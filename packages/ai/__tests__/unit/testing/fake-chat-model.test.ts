import { AiProviderError, type ChatRequest, type ChatStreamEvent, FakeChatModel } from '@kb/ai'
import { describe, expect, it } from 'vitest'

import { captureAiError, collect } from '../../fixtures.js'

const REQUEST: ChatRequest = { messages: [{ role: 'user', content: 'Hi' }] }
const USAGE = { promptTokens: 3, completionTokens: 2, totalTokens: 5 }
const RATE_LIMITED = new AiProviderError('rate_limited', 'Slow down', { provider: 'fake' })

describe('FakeChatModel', () => {
  it('streams scripted replies in order, split into chunkSize code points', async () => {
    const model = new FakeChatModel({
      replies: ['Hello world', { text: 'Bye', finishReason: 'length', usage: USAGE }],
      chunkSize: 5,
    })
    expect(await collect(model.stream(REQUEST))).toEqual([
      { type: 'delta', text: 'Hello' },
      { type: 'delta', text: ' worl' },
      { type: 'delta', text: 'd' },
      { type: 'done', finishReason: 'stop', model: 'fake-chat' },
    ])
    expect(await collect(model.stream(REQUEST))).toEqual([
      { type: 'delta', text: 'Bye' },
      { type: 'done', finishReason: 'length', usage: USAGE, model: 'fake-chat' },
    ])
  })

  it('never splits an emoji across deltas', async () => {
    const model = new FakeChatModel({ replies: ['👋🌍'], chunkSize: 1 })
    const deltas = (await collect(model.stream(REQUEST))).filter(({ type }) => type === 'delta')
    expect(deltas).toEqual([
      { type: 'delta', text: '👋' },
      { type: 'delta', text: '🌍' },
    ])
  })

  it('completes with the next scripted reply, then the default one', async () => {
    const model = new FakeChatModel({ replies: ['standalone question'], defaultReply: 'fallback' })
    expect(await model.complete(REQUEST)).toEqual({
      text: 'standalone question',
      finishReason: 'stop',
      model: 'fake-chat',
    })
    expect((await model.complete(REQUEST)).text).toBe('fallback')
  })

  it('records every request in call order', async () => {
    const model = new FakeChatModel()
    const second: ChatRequest = { messages: [{ role: 'user', content: 'Again' }], maxTokens: 10 }
    await model.complete(REQUEST)
    await collect(model.stream(second))
    expect(model.requests).toEqual([REQUEST, second])
  })

  it('throws a scripted error after streaming its text', async () => {
    const model = new FakeChatModel({ replies: [{ text: 'Partial', error: RATE_LIMITED }] })
    const events: ChatStreamEvent[] = []
    const error = await captureAiError(async () => {
      for await (const event of model.stream(REQUEST)) events.push(event)
    })
    expect(events).toEqual([{ type: 'delta', text: 'Partial' }])
    expect(error).toBe(RATE_LIMITED)
  })

  it('rejects complete() with a scripted error', async () => {
    const model = new FakeChatModel({ replies: [{ error: RATE_LIMITED }] })
    await expect(model.complete(REQUEST)).rejects.toBe(RATE_LIMITED)
  })

  it('throws aborted once the signal aborts mid-stream', async () => {
    const controller = new AbortController()
    const model = new FakeChatModel({ replies: ['one two three'], chunkSize: 4 })
    const events: ChatStreamEvent[] = []
    const error = await captureAiError(async () => {
      for await (const event of model.stream({ ...REQUEST, signal: controller.signal })) {
        events.push(event)
        controller.abort()
      }
    })
    expect(events).toEqual([{ type: 'delta', text: 'one ' }])
    expect(error).toMatchObject({
      code: 'aborted',
      details: { provider: 'fake', model: 'fake-chat' },
    })
  })

  it('throws aborted for a signal that is already aborted', async () => {
    const model = new FakeChatModel()
    const request = { ...REQUEST, signal: AbortSignal.abort() }
    expect((await captureAiError(() => model.complete(request))).code).toBe('aborted')
    expect((await captureAiError(() => collect(model.stream(request)))).code).toBe('aborted')
  })

  it('produces identical events for identical scripts', async () => {
    const script = { replies: ['Deterministic answer [1].'], chunkSize: 3 }
    const first = await collect(new FakeChatModel(script).stream(REQUEST))
    const second = await collect(new FakeChatModel(script).stream(REQUEST))
    expect(first).toEqual(second)
  })

  it.each([0, -1, 1.5])('rejects a chunk size of %s', (chunkSize) => {
    expect(() => new FakeChatModel({ chunkSize })).toThrow(RangeError)
  })
})
