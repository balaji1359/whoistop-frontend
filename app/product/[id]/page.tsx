import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getBoardToday, getProduct, productGoUrl, type LeaderboardEntry } from '@/lib/api'
import { categoryLabel } from '@/lib/data'
import { formatAge, formatListedAt, formatUsd } from '@/lib/format'
import { JsonLd } from '@/lib/json-ld'

export const revalidate = 30

type Params = { id: string }

/**
 * Rank/bid/click counts only exist in board context (computed at read time,
 * never stored on the product itself) — so a listing is looked up by finding
 * it on today's board first. Falls back to the bare product record for one
 * not listed today (still real content: name, tagline, domain, category),
 * and only 404s if the product truly doesn't exist.
 */
async function loadListing(id: string): Promise<{ entry: LeaderboardEntry | null; name: string; domain: string; tagline: string; category?: string } | null> {
  const board = await getBoardToday().catch(() => null)
  const entry = board ? [...board.entries, ...board.unranked].find((e) => e.product_id === id) : undefined
  if (entry) return { entry, name: entry.name, domain: entry.domain, tagline: entry.tagline, category: entry.category }

  const product = await getProduct(id).catch(() => null)
  if (!product) return null
  return { entry: null, name: product.name, domain: product.domain, tagline: product.tagline, category: product.category }
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params
  const listing = await loadListing(id)
  if (!listing) return {}

  const rankPart = listing.entry && listing.entry.rank > 0 ? ` — #${listing.entry.rank} today` : ''
  // Root layout's title template (`%s · WhoIsTop`) already appends the brand
  // suffix — repeating "WhoIsTop.lol" here would double it in the tab title.
  const title = `${listing.name}${rankPart}`
  const ogTitle = `${listing.name}${rankPart} on WhoIsTop.lol`
  const description = listing.tagline || `${listing.name} — a listing on WhoIsTop.lol, the pay-to-rank leaderboard for startups.`

  return {
    title,
    description,
    alternates: { canonical: `https://whoistop.lol/product/${id}` },
    openGraph: { title: ogTitle, description, type: 'website' },
    twitter: { card: 'summary', title: ogTitle, description },
  }
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { id } = await params
  const listing = await loadListing(id)
  if (!listing) notFound()

  const { entry, name, domain, tagline, category } = listing
  const ranked = Boolean(entry && entry.rank > 0)
  const host = hostOf(domain)
  const goUrl = productGoUrl(id)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: tagline,
    url: `https://whoistop.lol/product/${id}`,
    category: categoryLabel(category) ?? undefined,
    ...(entry && entry.amount_cents > 0
      ? {
          offers: {
            '@type': 'Offer',
            price: (entry.amount_cents / 100).toFixed(2),
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  }

  return (
    <main className="product-page">
      <JsonLd data={jsonLd} />
      <nav className="product-crumbs" aria-label="Breadcrumb">
        <Link href="/">WhoIsTop.lol</Link>
        {category ? (
          <>
            {' › '}
            <Link href={`/category/${category}`}>{categoryLabel(category)}</Link>
          </>
        ) : null}
        {' › '}
        <span>{name}</span>
      </nav>

      <article>
        <h1>{name}</h1>
        <p className="product-tagline">{tagline}</p>

        <dl className="product-facts">
          {ranked && entry ? (
            <>
              <div>
                <dt>Rank today</dt>
                <dd>#{entry.rank}</dd>
              </div>
              <div>
                <dt>Current bid</dt>
                <dd>{formatUsd(entry.amount_cents / 100)}</dd>
              </div>
            </>
          ) : (
            <div>
              <dt>Status</dt>
              <dd>Free listing — not yet ranked today</dd>
            </div>
          )}
          {category ? (
            <div>
              <dt>Category</dt>
              <dd>
                <Link href={`/category/${category}`}>{categoryLabel(category)}</Link>
              </dd>
            </div>
          ) : null}
          {entry ? (
            <>
              <div>
                <dt>Clicks today</dt>
                <dd>{entry.clicks_today.toLocaleString('en-US')}</dd>
              </div>
              <div>
                <dt>Clicks all-time</dt>
                <dd>{entry.clicks_total.toLocaleString('en-US')}</dd>
              </div>
              <div>
                <dt>Listed</dt>
                <dd>
                  {formatListedAt(entry.listed_at)} ({formatAge(entry.listed_at)})
                </dd>
              </div>
            </>
          ) : null}
          <div>
            <dt>Site</dt>
            <dd>
              <a href={goUrl} target="_blank" rel="sponsored noopener noreferrer">
                {host} ↗
              </a>
            </dd>
          </div>
        </dl>

        <p className="product-back">
          <Link href="/">← Back to today&apos;s leaderboard</Link>
        </p>
      </article>
    </main>
  )
}
