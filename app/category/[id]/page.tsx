import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getBoardToday } from '@/lib/api'
import { categoryLabel, DEFAULT_CATEGORY, selectableCategories } from '@/lib/data'
import { formatUsd } from '@/lib/format'
import { JsonLd } from '@/lib/json-ld'

export const revalidate = 30

type Params = { id: string }

function isValidCategory(id: string) {
  return selectableCategories.some((c) => c.id === id)
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params
  if (!isValidCategory(id)) return {}
  const label = categoryLabel(id)

  // Root layout's title template (`%s · WhoIsTop`) appends the brand suffix —
  // OG/Twitter titles aren't templated, so those keep the full branded form.
  const title = `Top ${label} Today`
  const ogTitle = `Top ${label} Today — WhoIsTop.lol`
  const description = `Discover ${label} startups and tools competing for the top positions on WhoIsTop.lol. Rankings are determined by verified bids — a slot holds until somebody outbids it.`

  return {
    title,
    description,
    alternates: { canonical: `https://whoistop.lol/category/${id}` },
    openGraph: { title: ogTitle, description, type: 'website' },
    twitter: { card: 'summary', title: ogTitle, description },
  }
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { id } = await params
  if (!isValidCategory(id)) notFound()

  const label = categoryLabel(id)
  const board = await getBoardToday().catch(() => null)
  const ranked = board?.entries.filter((e) => (e.category ?? DEFAULT_CATEGORY) === id) ?? []
  const free = board?.unranked.filter((e) => (e.category ?? DEFAULT_CATEGORY) === id) ?? []

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Top ${label} Today`,
    itemListElement: ranked.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://whoistop.lol/product/${e.product_id}`,
      name: e.name,
    })),
  }

  return (
    <main className="category-page">
      <JsonLd data={jsonLd} />
      <nav className="product-crumbs" aria-label="Breadcrumb">
        <Link href="/">WhoIsTop.lol</Link>
        {' › '}
        <span>{label}</span>
      </nav>

      <h1>Top {label} Today</h1>
      <p className="category-intro">
        Discover {label} startups and tools competing for the top positions on WhoIsTop.lol.
        Rankings are determined by verified bids — a slot holds until somebody outbids it.
      </p>

      {ranked.length === 0 && free.length === 0 ? (
        <p className="category-empty">Nothing listed in {label} yet — be the first.</p>
      ) : (
        <ol className="category-list">
          {ranked.map((e) => (
            <li key={e.product_id}>
              <span className="category-rank">#{e.rank}</span>
              <Link href={`/product/${e.product_id}`}>{e.name}</Link>
              <span className="category-bid">{formatUsd(e.amount_cents / 100)}</span>
            </li>
          ))}
          {free.map((e) => (
            <li key={e.product_id}>
              <span className="category-rank">—</span>
              <Link href={`/product/${e.product_id}`}>{e.name}</Link>
              <span className="category-bid">Free</span>
            </li>
          ))}
        </ol>
      )}

      <nav className="category-nav" aria-label="Other categories">
        <h2>Browse other categories</h2>
        <ul>
          {selectableCategories
            .filter((c) => c.id !== id)
            .map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.id}`}>{c.label}</Link>
              </li>
            ))}
        </ul>
      </nav>

      <p className="product-back">
        <Link href="/">← Back to today&apos;s leaderboard</Link>
      </p>
    </main>
  )
}
