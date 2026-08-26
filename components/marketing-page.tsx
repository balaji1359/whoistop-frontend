'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { SiteHeader } from '@/components/header'
import {
  BidModal,
  BidPlacedModal,
  ConnectModal,
  ListedModal,
  type BidTarget,
} from '@/components/modals'
import { useCountdown } from '@/lib/use-countdown'
import { useBoard } from '@/lib/use-board'
import {
  arena,
  categories,
  categoryLabel,
  DEFAULT_CATEGORY,
  detectCategoryFromUrl,
  graffiti,
  rowActionLabel,
  takeLeaderLabel,
  takePrice,
  valueStrip,
  type MarketingVariant,
} from '@/lib/data'
import type { LeaderboardEntry } from '@/lib/api'
import { useWallet } from '@/components/wallet'

function Mark({ letter, large = false }: { letter: string; large?: boolean }) {
  return (
    <div className={large ? 'mark' : 'mark sm'} aria-hidden="true">
      {letter}
    </div>
  )
}

function BidDelta({ delta }: { delta: number }) {
  if (!delta) return null
  const up = delta > 0
  return (
    <span className={up ? 'delta up' : 'delta down'}>
      {up ? '↑' : '↓'}
      {Math.abs(delta)}
    </span>
  )
}

export function MarketingPage({ variant }: { variant: MarketingVariant }) {
  const copy = variant === 'arena' ? arena : graffiti
  const wallet = useWallet()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { board, error: streamError } = useBoard()
  const [claimOpen, setClaimOpen] = useState(false)
  const [target, setTarget] = useState<BidTarget | null>(null)
  const [listed, setListed] = useState<LeaderboardEntry | null>(null)
  const [placed, setPlaced] = useState<{ domain: string; amount: number; rank: number } | null>(null)
  const [category, setCategory] = useState('all')
  const [url, setUrl] = useState('')
  const clock = useCountdown(board?.ends_in_seconds)

  // Stripe success: /?paid=<domain>&amount=&rank=&name=
  useEffect(() => {
    const paid = searchParams.get('paid')
    if (!paid) return
    wallet.markPaid(paid)
    const amount = Number(searchParams.get('amount') || '0')
    const rank = Number(searchParams.get('rank') || '1')
    setPlaced({ domain: paid, amount: amount || 1, rank: rank || 1 })
    router.replace('/', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const entries = board?.entries ?? []
  const unranked = board?.unranked ?? []
  const slotsPerCategory = board?.slots_per_category ?? 0
  const leader = entries[0]

  const inCategory = (item: LeaderboardEntry) =>
    category === 'all' || (item.category ?? DEFAULT_CATEGORY) === category

  // The #1 entry stays in the table as well as the hero card. Slicing it off
  // meant a board with a single listing rendered as "no projects yet".
  const rankedRows = useMemo(() => entries.filter(inCategory), [category, entries])
  const freeRows = useMemo(() => unranked.filter(inCategory), [category, unranked])

  const detected = url.trim() ? detectCategoryFromUrl(url) : null

  const stats = useMemo(() => {
    const all = [...entries, ...unranked]
    return {
      listings: all.length,
      boardValue: entries.reduce((sum, e) => sum + e.amount_cents, 0) / 100,
      clicks: all.reduce((sum, e) => sum + e.clicks_today, 0),
    }
  }, [entries, unranked])

  /**
   * What it costs to get a ranked slot in each category: $1 while the category
   * still has open slots, otherwise a dollar over its cheapest held slot —
   * that's the one you'd displace.
   */
  const categoryEntryPrice = useMemo(() => {
    const held = new Map<string, number[]>()
    for (const entry of entries) {
      const key = entry.category ?? DEFAULT_CATEGORY
      const list = held.get(key) ?? []
      list.push(entry.amount_cents / 100)
      held.set(key, list)
    }

    const prices = new Map<string, number>()
    for (const [key, amounts] of held) {
      const full = slotsPerCategory > 0 && amounts.length >= slotsPerCategory
      prices.set(key, full ? takePrice(Math.min(...amounts)) : 1)
    }
    return prices
  }, [entries, slotsPerCategory])

  function isYours(entry: LeaderboardEntry) {
    return wallet.paidDomains.includes(entry.domain)
  }

  if (!board) {
    return (
      <>
        <SiteHeader onClaim={() => setClaimOpen(true)} />
        <div className="board-loading" role="status">
          Loading today&apos;s board…
        </div>
      </>
    )
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader onClaim={() => setClaimOpen(true)} />

      <section className="hero" aria-label="Hero">
        <div className="hero-copy">
          <h1>
            Who&apos;s on <span className="accent">top</span> today?
          </h1>
          <p className="lede">{copy.heroSub}</p>
        </div>

        {leader ? (
          <article className="hero-card hero-card-one" aria-label="Today's number one">
            <div className="hero-card-label">Today&apos;s #1</div>
            <div className="hero-card-row">
              <Mark letter={leader.name[0]?.toUpperCase() ?? '?'} large />
              <div className="hero-card-meta">
                <div className="name">{leader.name}</div>
                <p className="desc">{leader.tagline}</p>
              </div>
            </div>
            <div className="hero-card-foot">
              <div className="bid-block">
                <div className="label">Current bid</div>
                <div className="amount num">${leader.amount_cents / 100}</div>
              </div>
              <button type="button" className="btn btn-primary btn-lg" onClick={() => setTarget({ listing: leader, mode: 'take' })}>
                {takeLeaderLabel(leader.amount_cents / 100)} →
              </button>
            </div>
          </article>
        ) : (
          <article className="hero-card hero-card-one" aria-label="No paid listings yet">
            {stats.listings > 0 ? (
              // Free listings are on the board too — calling it "empty" here
              // told people their own listing hadn't landed.
              <>
                <div className="hero-card-label">#1 is unclaimed</div>
                <p className="desc">
                  {stats.listings} {stats.listings === 1 ? 'project is' : 'projects are'} listed
                  today and nobody has bid yet. ${takePrice(0)} takes the top slot.
                </p>
                <div className="hero-card-foot">
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={() => setClaimOpen(true)}
                  >
                    Claim #1 · ${takePrice(0)} →
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="hero-card-label">Today&apos;s board is empty</div>
                <p className="desc">Be the first to add your project below.</p>
              </>
            )}
          </article>
        )}

        <aside className="hero-reset" aria-label="Daily reset">
          <div className="eyebrow">Daily reset in</div>
          <div className="clock num" suppressHydrationWarning>
            {clock.hours}
            <small>hrs</small>
            {clock.minutes}
            <small>min</small>
            {clock.seconds}
            <small>sec</small>
          </div>
          <p className="reset-copy">{copy.resetNote}</p>
          <Link className="text-link" href="#how">
            Learn how it works →
          </Link>
        </aside>
      </section>

      {streamError ? (
        <div className="stream-warning" role="status">
          {streamError}
        </div>
      ) : null}

      <div className="board">
        <aside id="categories" className="side-card cats-card" aria-label="Categories">
          <div className="side-head">
            <div className="eyebrow">Categories</div>
          </div>
          <div className="cats-scroll">
            <ul className="cats">
              {categories.map((item) => {
                const price = categoryEntryPrice.get(item.id)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={category === item.id ? 'active' : undefined}
                      aria-current={category === item.id ? 'page' : undefined}
                      onClick={() => setCategory(item.id)}
                    >
                      <span className="cat-label">{item.label}</span>
                      {item.id !== 'all' ? (
                        <span
                          className="num cat-floor"
                          title={
                            price !== undefined && price > 1
                              ? 'Every slot is held — this is what it costs to displace the cheapest'
                              : 'Slots still open at the minimum bid'
                          }
                        >
                          — ${price ?? 1}
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        <div id="main" className="main-col">
          <div className="entry-card">
            <form
              className="entry"
              onSubmit={(event) => {
                event.preventDefault()
                const trimmed = url.trim()
                if (!trimmed) return
                // Accept bare domains (getitsigned.app) — modal / API add https://
                if (!/^https?:\/\//i.test(trimmed)) {
                  setUrl(`https://${trimmed}`)
                }
                setClaimOpen(true)
              }}
              noValidate
            >
              <label className="field">
                <span className="muted" aria-hidden="true">
                  ⌘
                </span>
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="yoursite.com"
                  aria-label="Project URL"
                />
              </label>
              <button type="submit" className="btn btn-secondary">
                Add for free
              </button>
            </form>
            <p className="entry-hint">
              {copy.entryHint}
              {detected ? (
                <>
                  {' '}
                  · Detected: <strong>{categories.find((c) => c.id === detected)?.label}</strong>
                </>
              ) : null}
            </p>
          </div>

          {stats.listings > 0 || stats.boardValue > 0 || stats.clicks > 0 ? (
            <div className="board-stats" aria-label="Board summary">
              <span>
                <b className="num">{stats.listings}</b> listings
              </span>
              <span className="board-stats-sep" aria-hidden="true">
                ·
              </span>
              <span>
                <b className="num">${stats.boardValue}</b> board value
              </span>
              <span className="board-stats-sep" aria-hidden="true">
                ·
              </span>
              <span>
                <b className="num">{stats.clicks}</b> clicks today
              </span>
            </div>
          ) : null}

          <div className="board-panel">
            {rankedRows.length === 0 && freeRows.length === 0 ? (
              <div className="board-empty">
                {stats.listings > 0 ? (
                  // The board isn't empty — this tab is. Say which, and offer
                  // the way out: a listing filed under another category used
                  // to just look like it had vanished.
                  <>
                    <strong>Nothing in {categoryLabel(category) ?? 'this category'} yet</strong>
                    <p>
                      Today&apos;s board has {stats.listings}{' '}
                      {stats.listings === 1 ? 'listing' : 'listings'} in other categories.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCategory('all')}
                    >
                      Show all listings
                    </button>
                  </>
                ) : (
                  <>
                    <strong>Nothing on today&apos;s board yet</strong>
                    <p>
                      Add your URL above — listing is free, then bid from $1 to take a ranked slot.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <table className="board-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Project</th>
                    <th className="r">Clicks</th>
                    <th className="r">Bid</th>
                    <th className="r act-col">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rankedRows.map((entry, index) => {
                    const yours = isYours(entry)
                    const bidUsd = entry.amount_cents / 100
                    // Under a category tab the position is the position in
                    // that category; under All it's the board-wide rank.
                    const position = category === 'all' ? entry.rank : index + 1
                    return (
                      <tr key={entry.product_id} className={yours ? 'row-yours' : undefined}>
                        <td className="rank-cell num">#{position}</td>
                        <td>
                          <div className="proj">
                            <Mark letter={entry.name[0]?.toUpperCase() ?? '?'} />
                            <div>
                              <b>
                                <span className="proj-name">{entry.name}</span>
                                {yours ? <span className="you-label">You</span> : null}
                              </b>
                              <small>{entry.tagline}</small>
                            </div>
                          </div>
                        </td>
                        <td className="r num">{entry.clicks_today}</td>
                        <td className="r bid-cell num">
                          ${bidUsd}
                          <BidDelta delta={0} />
                        </td>
                        <td className="r act-col">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm btn-block"
                            onClick={() => setTarget({ listing: entry, mode: yours ? 'raise' : 'take' })}
                          >
                            {rowActionLabel(position, bidUsd, yours)}
                          </button>
                        </td>
                      </tr>
                    )
                  })}

                  {freeRows.length > 0 ? (
                    <tr className="board-divider-row">
                      <td colSpan={5}>
                        <div className="board-divider">
                          <span>Also listed today</span>
                          <small>Free listings — no bid yet. $1 moves one into a ranked slot.</small>
                        </div>
                      </td>
                    </tr>
                  ) : null}

                  {freeRows.map((entry, index) => {
                    const yours = isYours(entry)
                    return (
                      <tr
                        key={entry.product_id}
                        className={yours ? 'row-free row-yours' : 'row-free'}
                      >
                        <td className="rank-cell num">#{rankedRows.length + index + 1}</td>
                        <td>
                          <div className="proj">
                            <Mark letter={entry.name[0]?.toUpperCase() ?? '?'} />
                            <div>
                              <b>
                                <span className="proj-name">{entry.name}</span>
                                {yours ? <span className="you-label">You</span> : null}
                              </b>
                              <small>{entry.tagline}</small>
                            </div>
                          </div>
                        </td>
                        <td className="r num">{entry.clicks_today}</td>
                        <td className="r bid-cell">
                          <span className="free-badge">Free</span>
                        </td>
                        <td className="r act-col">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm btn-block"
                            onClick={() => setTarget({ listing: entry, mode: 'raise' })}
                          >
                            Take a slot · ${takePrice(0)}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
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
        onListed={(entry) => {
          // Confirm the free listing landed. Bidding is offered from there,
          // never forced on the way out of a free add.
          setListed(entry)
          setUrl('')
          // Jump the board to where it landed, so closing the confirmation
          // leaves you looking at your own listing rather than at whichever
          // category tab happened to be selected.
          setCategory(entry.category ?? DEFAULT_CATEGORY)
        }}
        initialUrl={url}
      />
      <ListedModal
        entry={listed}
        rankedAt={entries.find((e) => e.product_id === listed?.product_id)?.rank ?? null}
        onClose={() => setListed(null)}
        onBid={(entry) => {
          setListed(null)
          setTarget({ listing: entry, mode: 'raise' })
        }}
      />
      <BidModal target={target} onClose={() => setTarget(null)} />
      <BidPlacedModal
        open={Boolean(placed)}
        domain={placed?.domain ?? ''}
        amount={placed?.amount ?? 0}
        rank={placed?.rank ?? 1}
        onClose={() => setPlaced(null)}
      />
    </>
  )
}
