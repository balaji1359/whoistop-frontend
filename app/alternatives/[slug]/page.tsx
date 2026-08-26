import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/lib/json-ld'
import { alternatives, alternativesSlugs, COMPARISON_AS_OF } from '@/lib/comparisons'

type Params = { slug: string }

export function generateStaticParams() {
  return alternativesSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const page = alternatives[slug]
  if (!page) return {}

  return {
    title: page.title.replace(/ · WhoIsTop.*$/i, '').replace(/ \(2026\)$/i, ''),
    description: page.metaDescription,
    alternates: { canonical: `https://whoistop.lol/alternatives/${slug}` },
    openGraph: {
      title: page.title,
      description: page.metaDescription,
      type: 'article',
      url: `https://whoistop.lol/alternatives/${slug}`,
    },
    twitter: { card: 'summary', title: page.title, description: page.metaDescription },
  }
}

export default async function AlternativesPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const page = alternatives[slug]
  if (!page) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: page.h1,
    description: page.metaDescription,
    itemListOrder: 'https://schema.org/ItemListUnordered',
    numberOfItems: page.entries.length,
    itemListElement: page.entries.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      url: entry.url,
    })),
  }

  return (
    <main className="compare-page">
      <JsonLd data={jsonLd} />
      <nav className="product-crumbs" aria-label="Breadcrumb">
        <Link href="/">WhoIsTop.lol</Link>
        {' › '}
        <span>Alternatives</span>
        {' › '}
        <span>{page.targetName}</span>
      </nav>

      <p className="compare-updated">Last updated {COMPARISON_AS_OF}. {page.methodology}</p>

      <h1>{page.h1}</h1>
      <p className="compare-intro">{page.intro}</p>

      <p className="compare-cta">
        <Link className="btn btn-primary" href="/">
          Try WhoIsTop.lol →
        </Link>
      </p>

      <ol className="alt-list">
        {page.entries.map((entry, index) => (
          <li key={entry.name} className={entry.isUs ? 'alt-item is-us' : 'alt-item'}>
            <div className="alt-rank num">#{index + 1}</div>
            <article className="alt-card">
              <header className="alt-head">
                <h2>
                  {entry.isUs ? (
                    <Link href="/">{entry.name}</Link>
                  ) : (
                    <a href={entry.url} target="_blank" rel="noopener noreferrer">
                      {entry.name}
                    </a>
                  )}
                  {entry.isUs ? <span className="alt-you"> (us)</span> : null}
                </h2>
                <span className="alt-pricing num">{entry.pricing}</span>
              </header>
              <p className="alt-summary">{entry.summary}</p>
              <p className="alt-best">
                <strong>Best for:</strong> {entry.bestFor}
              </p>
              <div className="alt-pros-cons">
                <div>
                  <h3>Pros</h3>
                  <ul>
                    {entry.pros.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Cons</h3>
                  <ul>
                    {entry.cons.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ol>

      <nav className="compare-related" aria-label="Related pages">
        <h2>Related</h2>
        <ul>
          <li>
            <Link href="/compare/product-hunt">WhoIsTop vs Product Hunt →</Link>
          </li>
          <li>
            <Link href="/compare/outbid">WhoIsTop vs Outbid.lol →</Link>
          </li>
        </ul>
      </nav>

      <p className="product-back">
        <Link href="/">← Back to today&apos;s leaderboard</Link>
      </p>
    </main>
  )
}
