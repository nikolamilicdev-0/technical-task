import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { USAGE_BY_MODEL } from '@/__tests__/fixtures/usage'
import { renderWithProviders } from '@/__tests__/helpers/render'
import { UsageByModelTable } from '@/features/usage/components/UsageByModelTable'
import en from '@/messages/en.json'

const { byModel, kinds } = en.usage

/** jsdom has no ResizeObserver, which the table's always-shown scrollbar measures with. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
})

function renderTable() {
  renderWithProviders(<UsageByModelTable models={USAGE_BY_MODEL} />)
  return screen.getByRole('table', { name: byModel.heading })
}

describe('UsageByModelTable', () => {
  it('has a column for provider, model, kind and every count', () => {
    const table = renderTable()
    const headers = within(table).getAllByRole('columnheader')
    expect(headers.map((header) => header.textContent)).toEqual([
      byModel.columns.provider,
      byModel.columns.model,
      byModel.columns.kind,
      byModel.columns.promptTokens,
      byModel.columns.completionTokens,
      byModel.columns.totalTokens,
      byModel.columns.requests,
    ])
  })

  it('lists each model and kind with formatted counts, the model naming its row', () => {
    const table = renderTable()
    const [, ...bodyRows] = within(table).getAllByRole<HTMLTableRowElement>('row')
    const cells = bodyRows.map((row) => Array.from(row.cells, (cell) => cell.textContent))
    expect(cells).toEqual([
      ['gemini', 'gemini-3.5-flash-lite', kinds.chat, '7,445', '737', '8,182', '13'],
      ['gemini', 'gemini-3.5-flash-lite', kinds.query_rewrite, '3,692', '144', '3,836', '10'],
      ['gemini', 'gemini-embedding-001', kinds.embedding, '394', '0', '394', '17'],
    ])
    expect(within(table).getAllByRole('rowheader')[2]).toHaveTextContent('gemini-embedding-001')
  })

  it('lets keyboard users focus the table region to scroll it sideways', async () => {
    renderTable()
    await userEvent.tab()
    expect(screen.getByRole('region', { name: byModel.heading })).toHaveFocus()
  })
})
