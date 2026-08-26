import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/lib/json-ld'
import { COMPARISON_AS_OF, comparisonSlugs, comparisons } from '@/lib/comparisons'

type Params = { slug: string }

export function generateStaticParams() {
  return comparisonSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const page = comparisons[slug]
  if (!page) return {}

  return {
    title: page.title.replace(/ · WhoIsTop.*$/i, '').replace(/ \(2026\)$/i, ''),
    description: page.metaDescription,
    alternates: { canonical: `https://whoistop.lol/compare/${slug}` },
    openGraph: {
      title: page.title,
      description: page.metaDescription,
      type: 'article',
      url: `https://whoistop.lol/compare/${slug}`,
    },
    twitter: { card: 'summary', title: page.title, description: page.metaDescription },
  }
}

export default async function ComparePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const page = comparisons[slug]
  if (!page) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.h1,
    description: page.metaDescription,
    url: `https://whoistop.lol/compare/${slug}`,
    dateModified: '2026-08-26',
    isPartOf: { '@type': 'WebSite', name: 'WhoIsTop.lol', url: 'https://whoistop.lol' },
    about: [
      { '@type': 'SoftwareApplication', name: 'WhoIsTop.lol', url: 'https://whoistop.lol' },
      { '@type': 'SoftwareApplication', name: page.competitorName, url: page.competitorUrl },
    ],
  }

  return (
    <main className="compare-page">
      <JsonLd data={jsonLd} />
      <nav className="product-crumbs" aria-label="Breadcrumb">
        <Link href="/">WhoIsTop.lol</Link>
        {' › '}
        <span>Compare</span>
        {' › '}
        <span>{page.competitorName}</span>
      </nav>

      <p className="compare-updated">Last updated {COMPARISON_AS_OF}. We operate WhoIsTop.lol — competitor facts link to their sites.</p>

      <h1>{page.h1}</h1>
      <p className="compare-intro">{page.intro}</p>

      <p className="compare-cta">
        <Link className="btn btn-primary" href="/">
          See today&apos;s board →
        </Link>
      </p>

      <section aria-labelledby="compare-matrix">
        <h2 id="compare-matrix">Feature comparison</h2>
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">WhoIsTop.lol</th>
                <th scope="col">{page.competitorName}</th>
              </tr>
            </thead>
            <tbody>
              {page.features.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.us}</td>
                  <td>{row.them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="compare-columns" aria-labelledby="compare-strengths">
        <h2 id="compare-strengths">Where each wins</h2>
        <div className="compare-grid">
          <article>
            <h3>WhoIsTop.lol</h3>
            <ul>
              {page.ourStrengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article>
            <h3>{page.competitorName}</h3>
            <ul>
              {page.competitorStrengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section aria-labelledby="compare-pricing">
        <h2 id="compare-pricing">Pricing</h2>
        <p className="compare-body">{page.pricingNote}</p>
      </section>

      <section aria-labelledby="compare-verdict">
        <h2 id="compare-verdict">Verdict</h2>
        <p className="compare-body">{page.verdict}</p>
      </section>

      <section aria-labelledby="compare-sources">
        <h2 id="compare-sources">Sources</h2>
        <ul className="compare-sources">
          {page.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>

      {page.relatedSlugs.length > 0 ? (
        <nav className="compare-related" aria-label="Related comparisons">
          <h2>Related</h2>
          <ul>
            {page.relatedSlugs.map((related) => {
              const other = comparisons[related]
              if (!other) return null
              return (
                <li key={related}>
                  <Link href={`/compare/${related}`}>WhoIsTop vs {other.competitorName} →</Link>
                </li>
              )
            })}
            {slug !== 'product-hunt' ? (
              <li>
                <Link href="/alternatives/product-hunt">Product Hunt alternatives →</Link>
              </li>
            ) : (
              <li>
                <Link href="/alternatives/product-hunt">Full alternatives list →</Link>
              </li>
            )}
          </ul>
        </nav>
      ) : null}

      <p className="product-back">
        <Link href="/">← Back to today&apos;s leaderboard</Link>
      </p>
    </main>
  )
}
