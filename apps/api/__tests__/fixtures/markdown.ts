const TOPICS = ['onboarding', 'deployment', 'incident', 'security', 'billing', 'support'] as const

/** A distinct sentence of about fifteen tokens; `seed` keeps sentences unique within a document. */
export function sentence(seed: number, topic = 'ingestion'): string {
  return `Note ${seed} explains how the ${topic} process handles case ${seed} without surprises.`
}

export function paragraph(firstSeed: number, count: number, topic?: string): string {
  return Array.from({ length: count }, (_, index) => sentence(firstSeed + index, topic)).join(' ')
}

/** About 2,000 words, with a fenced code block whose `#` comment must not become a heading. */
export function buildHandbook(): string {
  const sections = TOPICS.map((topic, index) => {
    const seed = (index + 1) * 1_000
    return [
      `## ${capitalize(topic)}`,
      paragraph(seed, 9, topic),
      paragraph(seed + 100, 8, topic),
      `### ${capitalize(topic)} checklist`,
      Array.from(
        { length: 5 },
        (_, item) => `- Step ${item + 1}: ${sentence(seed + 200 + item, topic)}`
      ).join('\n'),
      paragraph(seed + 300, 7, topic),
    ].join('\n\n')
  })
  const code = [
    '```sh',
    '# fake heading: deploy the stack',
    'pnpm install --frozen-lockfile',
    'pnpm build',
    '```',
  ].join('\n')
  const table = [
    '| Severity | Response time |',
    '| --- | --- |',
    '| S1 | 15 minutes |',
    '| S2 | 1 hour |',
  ].join('\n')
  return [
    '# Team handbook',
    paragraph(1, 3),
    ...sections,
    '## Runbook',
    code,
    table,
    paragraph(9_000, 6),
  ].join('\n\n')
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
