import type { CreateDocumentInput } from '@kb/contracts'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/__tests__/helpers/render'
import { ApiError, networkError } from '@/core/api/api-error'
import { DocumentForm } from '@/features/documents/components/DocumentForm'
import { EMPTY_DOCUMENT_FORM_VALUES } from '@/features/documents/constants'
import en from '@/messages/en.json'

const { form } = en.documents
const SAVED_VALUES = { title: 'Notes', content: '# Hello\n\nSome *text*', tags: ['a'] }

function setup(props: Partial<ComponentProps<typeof DocumentForm>> = {}) {
  const onSubmit = vi.fn<(values: CreateDocumentInput) => Promise<unknown>>()
  onSubmit.mockResolvedValue(undefined)
  const user = userEvent.setup()
  renderWithProviders(
    <DocumentForm
      defaultValues={EMPTY_DOCUMENT_FORM_VALUES}
      submitLabel={form.create}
      onSubmit={onSubmit}
      {...props}
    />
  )
  return { user, onSubmit: props.onSubmit ?? onSubmit }
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(form.title), 'Release notes')
  await user.type(screen.getByLabelText(form.content), '# Notes')
}

describe('DocumentForm', () => {
  it('shows required errors and does not submit an empty form', async () => {
    const { user, onSubmit } = setup()
    await user.click(screen.getByRole('button', { name: form.create }))
    expect(await screen.findAllByText(en.validation.required)).toHaveLength(2)
    expect(screen.getByLabelText(form.title)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(form.content)).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the values the schema produced', async () => {
    const { user, onSubmit } = setup()
    await user.type(screen.getByLabelText(form.title), '  Release notes  ')
    await user.type(screen.getByLabelText(form.tags), 'release{Enter}q3,')
    await user.type(screen.getByLabelText(form.content), '# Notes')
    await user.click(screen.getByRole('button', { name: form.create }))
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Release notes',
      content: '# Notes',
      tags: ['release', 'q3'],
    })
  })

  it('shows an API field error under its field', async () => {
    const rejected = new ApiError({
      status: 422,
      code: 'invalid_payload',
      fieldErrors: { title: ['A document with this title already exists.'] },
    })
    const { user } = setup({ onSubmit: vi.fn(() => Promise.reject(rejected)) })
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: form.create }))
    const title = screen.getByLabelText(form.title)
    expect(await screen.findByText('A document with this title already exists.')).toBeVisible()
    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(title).toHaveAccessibleDescription('A document with this title already exists.')
  })

  it('shows failures without field errors above the form', async () => {
    const { user } = setup({ onSubmit: vi.fn(() => Promise.reject(networkError())) })
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: form.create }))
    expect(await screen.findByRole('alert')).toHaveTextContent(en.errors.network)
  })

  it('offers Save only once something changed, and Discard restores the saved values', async () => {
    const { user, onSubmit } = setup({
      defaultValues: SAVED_VALUES,
      submitLabel: form.save,
      editing: true,
    })
    const save = screen.getByRole('button', { name: form.save })
    expect(save).toHaveAttribute('aria-disabled', 'true')
    await user.click(save)
    expect(onSubmit).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(form.title), ' v2')
    expect(save).not.toHaveAttribute('aria-disabled')
    await user.click(screen.getByRole('button', { name: form.discard }))
    expect(screen.getByLabelText(form.title)).toHaveValue('Notes')
    expect(save).toHaveAttribute('aria-disabled', 'true')
    expect(save).toHaveFocus()
  })

  it('becomes clean again after a successful save, keeping focus on Save', async () => {
    const { user, onSubmit } = setup({
      defaultValues: SAVED_VALUES,
      submitLabel: form.save,
      editing: true,
    })
    await user.type(screen.getByLabelText(form.title), ' v2')
    const save = screen.getByRole('button', { name: form.save })
    await user.click(save)
    expect(onSubmit).toHaveBeenCalledOnce()
    await waitFor(() => expect(save).toHaveAttribute('aria-disabled', 'true'))
    expect(save).toHaveFocus()
    expect(screen.getByLabelText(form.title)).toHaveValue('Notes v2')
  })

  it('keeps text typed while a save is in flight, measured against the saved values', async () => {
    let finishSave: () => void = () => undefined
    const onSubmit = vi.fn(
      () => new Promise<void>((resolve) => (finishSave = () => resolve(undefined)))
    )
    const { user } = setup({
      defaultValues: SAVED_VALUES,
      submitLabel: form.save,
      editing: true,
      onSubmit,
    })
    const title = screen.getByLabelText(form.title)
    await user.type(title, ' v2')
    await user.click(screen.getByRole('button', { name: form.save }))
    await user.type(title, ' draft')
    finishSave()

    const save = screen.getByRole('button', { name: form.save })
    await waitFor(() => expect(save).not.toHaveAttribute('aria-busy'))
    expect(title).toHaveValue('Notes v2 draft')
    expect(screen.getByText(form.unsaved)).toBeVisible()
    expect(save).not.toHaveAttribute('aria-disabled')
    // Discard goes back to what was saved, not to the values the form opened with.
    await user.click(screen.getByRole('button', { name: form.discard }))
    expect(title).toHaveValue('Notes v2')
  })

  it('keeps the textarea in view while the user fixes a content error found from Preview', async () => {
    const { user } = setup({
      defaultValues: { ...SAVED_VALUES, content: '' },
      submitLabel: form.save,
      editing: true,
    })
    await user.type(screen.getByLabelText(form.title), ' v2')
    await user.click(screen.getByRole('tab', { name: form.preview }))
    await user.click(screen.getByRole('button', { name: form.save }))

    const content = await screen.findByLabelText(form.content)
    expect(content).toBeVisible()
    await user.type(content, '# Fixed')
    expect(screen.getByLabelText(form.content)).toBeVisible()
    expect(screen.getByRole('tab', { name: form.write })).toHaveAttribute('aria-selected', 'true')
  })

  it('renders the Markdown in the preview tab', async () => {
    const { user } = setup({ defaultValues: SAVED_VALUES, submitLabel: form.save, editing: true })
    await user.click(screen.getByRole('tab', { name: form.preview }))
    expect(screen.getByRole('tab', { name: form.preview })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    expect(screen.getByText('text').tagName).toBe('EM')
  })

  it('moves between the editor tabs with the arrow keys', async () => {
    const { user } = setup({ defaultValues: SAVED_VALUES, submitLabel: form.save, editing: true })
    const writeTab = screen.getByRole('tab', { name: form.write })
    writeTab.focus()
    await user.keyboard('{ArrowRight}')
    const previewTab = screen.getByRole('tab', { name: form.preview })
    expect(previewTab).toHaveFocus()
    expect(previewTab).toHaveAttribute('aria-selected', 'true')
  })
})
