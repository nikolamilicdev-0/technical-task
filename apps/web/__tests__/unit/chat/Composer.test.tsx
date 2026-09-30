import { MESSAGE_MAX_LENGTH } from '@kb/contracts'
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/__tests__/helpers/render'
import { Composer } from '@/features/chat/components/Composer'
import type { ChatStreamStatus } from '@/features/chat/types'
import en from '@/messages/en.json'

const { composer } = en.chat

interface HarnessProps {
  status?: ChatStreamStatus
  initial?: string
  onSubmit: () => void
  onStop?: () => void
}

function ComposerHarness({
  status = 'idle',
  initial = '',
  onSubmit,
  onStop = vi.fn(),
}: HarnessProps) {
  const [value, setValue] = useState(initial)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  return (
    <Composer
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      onStop={onStop}
      status={status}
      textareaRef={textareaRef}
    />
  )
}

function setup(props: Partial<HarnessProps> = {}) {
  const user = userEvent.setup()
  const onSubmit = vi.fn()
  const onStop = vi.fn()
  renderWithProviders(<ComposerHarness onSubmit={onSubmit} onStop={onStop} {...props} />)
  return { user, onSubmit, onStop, field: screen.getByRole('textbox', { name: composer.label }) }
}

describe('Composer', () => {
  it('sends on Enter', async () => {
    const { user, onSubmit, field } = setup()
    await user.type(field, 'How do I set up?{Enter}')
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(field).toHaveValue('How do I set up?')
  })

  it('adds a new line on Shift+Enter instead of sending', async () => {
    const { user, onSubmit, field } = setup()
    await user.type(field, 'First line{Shift>}{Enter}{/Shift}second line')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(field).toHaveValue('First line\nsecond line')
  })

  it('does not send while an input method is composing', () => {
    const { onSubmit, field } = setup({ initial: 'こんにちは' })
    fireEvent.keyDown(field, { key: 'Enter', isComposing: true })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not send a blank message', async () => {
    const { user, onSubmit, field } = setup()
    await user.type(field, '   {Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: composer.send })).toBeDisabled()
  })

  it('offers Stop instead of Send while the answer streams', async () => {
    const { user, onSubmit, onStop, field } = setup({ status: 'streaming', initial: 'Next?' })
    expect(screen.queryByRole('button', { name: composer.send })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: composer.stop }))
    expect(onStop).toHaveBeenCalledOnce()

    await user.type(field, '{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('holds Stop back until the question is stored', () => {
    setup({ status: 'connecting' })
    expect(screen.getByRole('button', { name: composer.stop })).toBeDisabled()
  })

  it('counts characters near the limit', () => {
    setup({ initial: 'x'.repeat(MESSAGE_MAX_LENGTH - 10) })
    expect(screen.getByText('3,990 / 4,000')).toBeInTheDocument()
  })
})
