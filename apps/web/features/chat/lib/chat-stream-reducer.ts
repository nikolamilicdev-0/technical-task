import type { ChatSseEvent } from '@kb/contracts'

import { fromErrorEvent } from '@/features/chat/lib/to-stream-error'
import type {
  ChatStreamAction,
  ChatStreamState,
  ChatStreamStatus,
  PendingUserMessage,
} from '@/features/chat/types'

type StreamEventAction = Exclude<ChatStreamAction, { type: 'start' | 'reset' }>

export const INITIAL_CHAT_STREAM_STATE: ChatStreamState = {
  status: 'idle',
  pendingUserMessage: null,
  draft: '',
  citations: [],
  usage: null,
  meta: null,
  done: null,
  error: null,
}

const RECEIVING_STATUSES: ReadonlySet<ChatStreamStatus> = new Set(['connecting', 'streaming'])

/** An answer is on its way: the question is sent and the stream has not settled. */
export function isReceiving(status: ChatStreamStatus): boolean {
  return RECEIVING_STATUSES.has(status)
}

/**
 * The answer in flight. `connecting` lasts until the API has stored the question (`meta`);
 * a settled answer (done, stopped, error) keeps its exchange until the next question or a reset.
 */
export function chatStreamReducer(
  state: ChatStreamState,
  action: ChatStreamAction
): ChatStreamState {
  if (action.type === 'start') return isReceiving(state.status) ? state : startWith(action.message)
  if (action.type === 'reset') return INITIAL_CHAT_STREAM_STATE
  // Frames that arrive after the answer settled (or before any question) change nothing.
  if (!isReceiving(state.status)) return state
  return applyStreamEvent(state, action)
}

/** The action a stream event dispatches; an `error` frame fails the answer. */
export function toStreamAction(event: ChatSseEvent): ChatStreamAction {
  switch (event.type) {
    case 'meta':
      return { type: 'meta', meta: event }
    case 'sources':
      return { type: 'sources', citations: event.citations }
    case 'delta':
      return { type: 'delta', text: event.text }
    case 'usage': {
      const { type: _type, ...usage } = event
      return { type: 'usage', usage }
    }
    case 'done':
      return { type: 'done', done: event }
    case 'error':
      return { type: 'fail', error: fromErrorEvent(event) }
  }
}

function startWith(message: PendingUserMessage): ChatStreamState {
  return { ...INITIAL_CHAT_STREAM_STATE, status: 'connecting', pendingUserMessage: message }
}

function applyStreamEvent(state: ChatStreamState, action: StreamEventAction): ChatStreamState {
  switch (action.type) {
    case 'meta':
      return { ...state, status: 'streaming', meta: action.meta }
    case 'sources':
      return { ...state, citations: action.citations }
    case 'delta':
      return { ...state, status: 'streaming', draft: state.draft + action.text }
    case 'usage':
      return { ...state, usage: action.usage }
    case 'done':
      return { ...state, status: 'done', done: action.done }
    case 'stop':
      return { ...state, status: 'stopped' }
    case 'fail':
      return { ...state, status: 'error', error: action.error }
  }
}
