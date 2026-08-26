import { Suspense } from 'react'
import type { Metadata } from 'next'
import { MarketingPage } from '@/components/marketing-page'
import { getBoardToday } from '@/lib/api'

export const revalidate = 30

// Same listings as "/", different visual skin — without a canonical pointing
// back to "/", search engines see two pages of identical content and split
// ranking signal between them instead of consolidating it on one URL.
export const metadata: Metadata = {
  alternates: { canonical: 'https://whoistop.lol/' },
}

export default async function ArenaPage() {
  const board = await getBoardToday().catch(() => null)

  return (
    <Suspense>
      <MarketingPage variant="arena" initialBoard={board} />
    </Suspense>
  )
}
