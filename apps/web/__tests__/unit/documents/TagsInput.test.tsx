import { MAX_TAGS } from '@kb/contracts'
import { FormField } from '@kb/ui'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/__tests__/helpers/render'
import { TagsInput } from '@/features/documents/components/TagsInput'
import en from '@/messages/en.json'

const { form } = en.documents
const LABEL = 'Tags'

function TagsHarness({ initial = [] }: { initial?: string[] }) {
  const [tags, setTags] = useState(initial)
  return (
    <FormField label={LABEL}>
      <TagsInput value={tags} onChange={setTags} />
    </FormField>
  )
}

function setup(initial?: string[]) {
  const user = userEvent.setup()
  renderWithProviders(<TagsHarness initial={initial} />)
  return { user, input: screen.getByLabelText(LABEL) }
}

const chipNames = () =>
  screen.queryAllByRole('button').map((chip) => chip.getAttribute('aria-label'))

describe('TagsInput', () => {
  it('adds tags on Enter and comma, trimmed and without duplicates', async () => {
    const { user, input } = setup()
    await user.type(input, ' release {Enter}q3,Release,')
    expect(chipNames()).toEqual(['Remove tag release', 'Remove tag q3'])
    expect(input).toHaveValue('')
  })

  it('adds the draft when the input loses focus', async () => {
    const { user, input } = setup()
    await user.type(input, 'research')
    await user.tab()
    expect(chipNames()).toEqual(['Remove tag research'])
  })

  it('removes the last tag with Backspace on an empty input', async () => {
    const { user, input } = setup(['a', 'b'])
    await user.click(input)
    await user.keyboard('{Backspace}')
    expect(chipNames()).toEqual(['Remove tag a'])
  })

  it('removes a tag from its chip and keeps focus in the input', async () => {
    const { user, input } = setup(['a', 'b'])
    await user.click(screen.getByRole('button', { name: 'Remove tag a' }))
    expect(chipNames()).toEqual(['Remove tag b'])
    expect(input).toHaveFocus()
  })

  it('stops taking input at the tag limit', () => {
    const { input } = setup(Array.from({ length: MAX_TAGS }, (_, index) => `tag-${index}`))
    expect(input).toHaveAttribute('readonly')
    expect(input).toHaveAttribute('placeholder', form.tagsFull)
  })
})
