import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { buildUsageSummary, buildUsageTotals } from '@/__tests__/fixtures/usage'
import { renderWithProviders } from '@/__tests__/helpers/render'
import { UsageStatTiles } from '@/features/usage/components/UsageStatTiles'
import en from '@/messages/en.json'

const { totals } = en.usage
const { from, to } = buildUsageSummary()

function renderTiles(estimatedRequests: number) {
  renderWithProviders(
    <UsageStatTiles totals={buildUsageTotals({ estimatedRequests })} from={from} to={to} />
  )
  return screen.getByRole('heading', { name: totals.heading }).closest('section') ?? document.body
}

/** Each term with the details that follow it, as a screen reader pairs them. */
function readTerms(section: HTMLElement) {
  return within(section)
    .getAllByRole('term')
    .map((term) => [term.textContent, term.nextElementSibling?.textContent])
}

describe('UsageStatTiles', () => {
  it('labels the four totals and formats their values', () => {
    const section = renderTiles(0)
    expect(readTerms(section)).toEqual([
      [totals.totalTokens, '12,412'],
      [totals.promptTokens, '11,531'],
      [totals.completionTokens, '881'],
      [totals.requests, '40'],
    ])
    expect(within(section).getByText('Sep 1 – 30, 2026')).toBeVisible()
  })

  it('says how many requests were estimated, and nothing when none were', () => {
    renderTiles(1)
    expect(screen.getByText('Includes estimates for 1 request')).toBeVisible()
  })

  it('leaves the estimate note out when the provider reported every count', () => {
    renderTiles(0)
    expect(screen.queryByText(/Includes estimates/)).not.toBeInTheDocument()
  })
})
