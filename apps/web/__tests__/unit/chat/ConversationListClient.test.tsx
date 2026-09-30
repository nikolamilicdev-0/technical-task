import type { ConversationList } from '@kb/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildConversation,
  buildConversationList,
  CONVERSATION_ID,
  OTHER_CONVERSATION_ID,
} from '@/__tests__/fixtures/chat'
import { renderWithProviders } from '@/__tests__/helpers/render'
import { ConversationListClient } from '@/features/chat/components/ConversationListClient'
import { CONVERSATIONS_LIST_PARAMS } from '@/features/chat/constants'
import { conversationsKeys } from '@/features/chat/lib/conversations-keys'
import { conversationsService } from '@/features/chat/services/conversations-service'
import en from '@/messages/en.json'

const navigation = vi.hoisted(() => ({ pathname: '/chat', replace: vi.fn(), push: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace, push: navigation.push }),
}))
vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => <a {...props}>{children}</a>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/chat/services/conversations-service', () => ({
  conversationsService: { list: vi.fn(), remove: vi.fn(), rename: vi.fn() },
}))

// Radix's scroll area measures its viewport with ResizeObserver, which jsdom lacks.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const service = vi.mocked(conversationsService)
const LIST_KEY = conversationsKeys.list(CONVERSATIONS_LIST_PARAMS)
const SETUP = buildConversation({ id: CONVERSATION_ID, title: 'Setting up the CLI' })
const UNTITLED = buildConversation({ id: OTHER_CONVERSATION_ID, title: null })

function setup(list: ConversationList = buildConversationList([SETUP, UNTITLED])) {
  const user = userEvent.setup()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  })
  queryClient.setQueryData(LIST_KEY, list)
  renderWithProviders(
    <QueryClientProvider client={queryClient}>
      <ConversationListClient />
    </QueryClientProvider>
  )
  return { user, queryClient }
}

const listedTitles = () =>
  within(screen.getByRole('navigation'))
    .queryAllByRole('link')
    .map((link) => link.textContent)

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  navigation.pathname = `/chat/${CONVERSATION_ID}`
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ConversationListClient', () => {
  it('lists conversations, names untitled ones and marks the open one', () => {
    setup()
    const open = screen.getByRole('link', { name: /Setting up the CLI/ })
    expect(open).toHaveAttribute('aria-current', 'page')
    expect(open).toHaveAttribute('href', `/chat/${CONVERSATION_ID}`)
    expect(screen.getByRole('link', { name: new RegExp(en.chat.untitled) })).not.toHaveAttribute(
      'aria-current'
    )
    expect(screen.getByRole('link', { name: en.chat.newChat })).toHaveAttribute('href', '/chat')
  })

  it('deletes a conversation after confirmation, removing it at once', async () => {
    service.remove.mockReturnValue(new Promise(() => {}))
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: `Delete “${en.chat.untitled}”` }))
    const dialog = await screen.findByRole('dialog', { name: `Delete “${en.chat.untitled}”?` })
    await user.click(within(dialog).getByRole('button', { name: en.chat.delete.confirm }))

    expect(service.remove).toHaveBeenCalledWith(OTHER_CONVERSATION_ID)
    await waitFor(() =>
      expect(listedTitles()).not.toContainEqual(expect.stringMatching(/Untitled/))
    )
    expect(navigation.replace).not.toHaveBeenCalled()
  })

  it('starts a new chat when the open conversation is deleted', async () => {
    service.remove.mockResolvedValue(undefined)
    service.list.mockResolvedValue(buildConversationList([UNTITLED]))
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: 'Delete “Setting up the CLI”' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: en.chat.delete.confirm }))

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/chat'))
  })

  it('keeps the conversation when the confirmation is cancelled', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: 'Delete “Setting up the CLI”' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: en.common.cancel }))

    expect(service.remove).not.toHaveBeenCalled()
    expect(listedTitles()).toContainEqual(expect.stringMatching(/Setting up the CLI/))
  })

  it('says so when there are no conversations yet', () => {
    setup(buildConversationList([]))
    expect(screen.getByText(en.chat.list.empty.title)).toBeInTheDocument()
  })
})
