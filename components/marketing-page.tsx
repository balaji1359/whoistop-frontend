'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { SiteHeader } from '@/components/header'
import { BidModal, ConnectModal } from '@/components/modals'
import { useCountdown } from '@/lib/use-countdown'
import {
  arena,
  categories,
  detectCategoryFromUrl,
  graffiti,
  listings,
  liveActivity,
  rowActionLabel,
  takeLeaderLabel,
  valueStrip,
  viewerListingDomain,
  type Category,
  type Listing,
  type MarketingVariant,
} from '@/lib/data'
import { useWallet } from '@/components/wallet'

function Mark({ letter, large = false }: { letter: string; large?: boolean }) {
  return <div className={large ? 'mark' : 'mark sm'} aria-hidden="true">{letter}</div>
}

function CategoryItem({
  item,
  selected,
  onSelect,
}: {
  item: Category
  selected: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        className={selected ? 'active' : undefined}
        aria-current={selected ? 'page' : undefined}
        onClick={onSelect}
      >
        <span className="cat-label">{item.label}</span>
        <span className="num cat-floor">— ${item.floorBid}</span>
      </button>
    </li>
  )
}

function BidDelta({ delta }: { delta: number }) {
  if (!delta) return null
  const up = delta > 0
  return <span className={up ? 'delta up' : 'delta down'}>{up ? '↑' : '↓'}{Math.abs(delta)}</span>
}

const activeCategories = categories.filter((item) => item.floorBid > 0)
const openCategories = categories.filter((item) => item.floorBid === 0)

export function MarketingPage({ variant }: { variant: MarketingVariant }) {
  const copy = variant === 'arena' ? arena : graffiti
  const session = useWallet()
  const [claimOpen, setClaimOpen] = useState(false)
  const [target, setTarget] = useState<Listing | null>(null)
  const [category, setCategory] = useState('all')
  const [showOpenCategories, setShowOpenCategories] = useState(false)
  const [url, setUrl] = useState('')
  const clock = useCountdown()
  const leader = listings[0]
  const rows = listings.slice(1)

  const detected = url.trim() ? detectCategoryFromUrl(url) : null

  const filtered = useMemo(() => {
    if (category === 'all') return rows
    const label = categories.find((c) => c.id === category)?.label
    if (!label) return rows
    return rows.filter((item) => item.category === label)
  }, [category, rows])

  function isYours(listing: Listing) {
    if (session.claimed && session.domain === listing.domain) return true
    return listing.domain === viewerListingDomain
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader onClaim={() => setClaimOpen(true)} />

      <section className="hero" aria-label="Hero">
        <div className="hero-copy">
          <h1>
            Who&apos;s on <span className="accent">top</span> today?
          </h1>
          <p className="lede">{copy.heroSub}</p>
        </div>

        <article className="hero-card hero-card-one" aria-label="Today's number one">
          <div className="hero-card-label">Today&apos;s #1</div>
          <div className="hero-card-row">
            <Mark letter={leader.mark} large />
            <div className="hero-card-meta">
              <div className="name">{leader.name}</div>
              <p className="desc">{leader.tagline}</p>
            </div>
          </div>
          <div className="hero-card-foot">
            <div className="bid-block">
              <div className="label">Current bid</div>
              <div className="amount num">${leader.bid}</div>
            </div>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setTarget(leader)}>
              {takeLeaderLabel(leader.bid)} →
            </button>
          </div>
        </article>

        <aside className="hero-reset" aria-label="Daily reset">
          <div className="eyebrow">Daily reset in</div>
          <div className="clock num" suppressHydrationWarning>
            {clock.hours}<small>hrs</small>
            {clock.minutes}<small>min</small>
            {clock.seconds}<small>sec</small>
          </div>
          <p className="reset-copy">{copy.resetNote}</p>
          <Link className="text-link" href="#how">Learn how it works →</Link>
        </aside>
      </section>

      <div className="board">
        <aside id="categories" className="side-card cats-card" aria-label="Categories">
          <div className="side-head">
            <div className="eyebrow">Categories</div>
            <span className="side-count num">{activeCategories.length - 1} live</span>
          </div>
          <div className="cats-scroll">
            <ul className="cats">
              {activeCategories.map((item) => (
                <CategoryItem
                  key={item.id}
                  item={item}
                  selected={category === item.id}
                  onSelect={() => setCategory(item.id)}
                />
              ))}
            </ul>

            {showOpenCategories ? (
              <ul className="cats cats-quiet">
                <li className="cats-group" aria-hidden="true">Open · $0</li>
                {openCategories.map((item) => (
                  <CategoryItem
                    key={item.id}
                    item={item}
                    selected={category === item.id}
                    onSelect={() => setCategory(item.id)}
                  />
                ))}
              </ul>
            ) : null}
          </div>
          <button
            type="button"
            className="cats-toggle"
            aria-expanded={showOpenCategories}
            onClick={() => {
              if (showOpenCategories && openCategories.some((item) => item.id === category)) {
                setCategory('all')
              }
              setShowOpenCategories((v) => !v)
            }}
          >
            {showOpenCategories ? 'Show fewer' : `View all ${openCategories.length} open`}
            <span aria-hidden="true">{showOpenCategories ? '↑' : '↓'}</span>
          </button>
        </aside>

        <div id="main" className="main-col">
          <div className="entry-card">
            <form
              className="entry"
              onSubmit={(event) => {
                event.preventDefault()
                setClaimOpen(true)
              }}
            >
              <label className="field">
                <span className="muted" aria-hidden="true">⌘</span>
                <input
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="Your product URL or @handle"
                  aria-label="Project URL"
                />
              </label>
              <button type="submit" className="btn btn-secondary">
                Add for free
              </button>
            </form>
            <p className="entry-hint">
              {copy.entryHint}
              {detected ? <> · Detected: <strong>{detected}</strong></> : null}
            </p>
          </div>

          <div className="board-panel">
            <table className="board-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Project</th>
                  <th className="r">Clicks</th>
                  <th className="r">Bid</th>
                  <th className="r act-col"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((listing) => {
                  const yours = isYours(listing)
                  return (
                    <tr key={listing.domain} className={yours ? 'row-yours' : undefined}>
                      <td className="rank-cell num">#{listing.rank}</td>
                      <td>
                        <div className="proj">
                          <Mark letter={listing.mark} />
                          <div>
                            <b>
                              <span className="proj-name">{listing.name}</span>
                              {yours ? <span className="you-label">You</span> : null}
                            </b>
                            <small>{listing.tagline}</small>
                          </div>
                        </div>
                      </td>
                      <td className="r num">{listing.clicks24h}</td>
                      <td className="r bid-cell num">
                        ${listing.bid}
                        <BidDelta delta={listing.bidDelta} />
                      </td>
                      <td className="r act-col">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm btn-block"
                          onClick={() => setTarget(listing)}
                        >
                          {rowActionLabel(listing, yours)}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="more">
              <button type="button" className="btn btn-ghost">Load more projects ↓</button>
            </div>
          </div>
        </div>

        <aside className="side-card activity-col" aria-label="Live activity">
          <div className="eyebrow">Live activity</div>
          <ul className="activity-list">
            {liveActivity.map((item) => (
              <li key={`${item.name}-${item.time}`}>
                <span className="activity-dot" aria-hidden="true" />
                <div>
                  <p><strong>{item.name}</strong> {item.action}</p>
                  <small>{item.time}</small>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <section id="how" className="value-strip">
        {valueStrip.map((item) => (
          <article key={item.title}>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <ConnectModal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        initialUrl={url}
        detectedCategory={detected}
      />
      <BidModal listing={target} onClose={() => setTarget(null)} />
    </>
  )
}
