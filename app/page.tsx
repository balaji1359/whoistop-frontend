import { Suspense } from 'react'
import { MarketingPage } from '@/components/marketing-page'
import { getBoardToday } from '@/lib/api'
import { JsonLd } from '@/lib/json-ld'

export const revalidate = 30

export default async function Page() {
  // Fetched here, not just client-side: this is what a crawler that doesn't
  // execute JavaScript actually sees in the response body. Falls back to a
  // null board (client refetches on mount) rather than failing the page if
  // the API is briefly unreachable at request time.
  const board = await getBoardToday().catch(() => null)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: "Today's top listings on WhoIsTop.lol",
    itemListElement: (board?.entries ?? []).map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://whoistop.lol/product/${e.product_id}`,
      name: e.name,
    })),
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <Suspense>
        <MarketingPage variant="graffiti" initialBoard={board} />
      </Suspense>
    </>
  )
}
