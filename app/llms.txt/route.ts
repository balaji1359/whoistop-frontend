import { getBoardToday } from '@/lib/api'
import { categoryLabel } from '@/lib/data'

export const revalidate = 30

// llms.txt convention (llmstxt.org): a plain-text summary an AI agent can
// read without executing JavaScript or parsing HTML. Generated from the live
// board rather than hand-maintained — a static file listing yesterday's #1
// as current is worse than no file at all.
export async function GET() {
  const board = await getBoardToday().catch(() => null)
  const top = board?.entries.slice(0, 20) ?? []

  const lines = [
    '# WhoIsTop.lol',
    '',
    '> A daily, pay-to-rank leaderboard for startups, apps, and websites. Anyone can list a',
    '> project for free; the highest paid bid holds the top spot in its category. The board',
    '> resets every day at 00:00 UTC.',
    '',
    '## How ranking works',
    '',
    '- Listing a project is free.',
    '- Paying more than the current top bid in a category takes that rank; the previous holder',
    '  drops but is not removed — nothing is refunded, since displacing a rank is the mechanic,',
    '  not a penalty.',
    '- Ranks are per category, not board-wide.',
    '',
    '## Pages',
    '',
    '- /  — today\'s full leaderboard, all categories',
    '- /category/{id} — one category\'s ranking (see categories below)',
    '- /product/{id} — a single listing\'s detail page',
    '- /sitemap.xml — full list of indexable URLs',
    '',
  ]

  if (top.length > 0) {
    lines.push("## Today's top listings", '')
    for (const e of top) {
      const cat = categoryLabel(e.category) ?? 'Other'
      lines.push(`- #${e.rank} ${e.name} (${cat}, $${e.amount_cents / 100}) — /product/${e.product_id}`)
      if (e.tagline) lines.push(`  ${e.tagline}`)
    }
    lines.push('')
  }

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
