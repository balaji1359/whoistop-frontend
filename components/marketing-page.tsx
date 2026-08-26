'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { SiteHeader } from '@/components/header'
import { BidModal, BidPlacedModal, ConnectModal, type BidTarget } from '@/components/modals'
import { useCountdown } from '@/lib/use-countdown'
import { useBoard } from '@/lib/use-board'
import {
  arena,
  categories,
  detectCategoryFromUrl,
  graffiti,
  rowActionLabel,
  takeLeaderLabel,
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
  const leader = entries[0]
  const rows = entries.slice(1)

  const detected = url.trim() ? detectCategoryFromUrl(url) : null

  const filtered = useMemo(() => {
    if (category === 'all') return rows
    return rows.filter((item) => item.category === category)
  }, [category, rows])

  const categoryFloors = useMemo(() => {
    const floors = new Map<string, number>()
    for (const entry of entries) {
      if (!entry.category) continue
      const usd = entry.amount_cents / 100
      const current = floors.get(entry.category)
      if (current === undefined || usd < current) floors.set(entry.category, usd)
    }
    return floors
  }, [entries])

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
          <article className="hero-card hero-card-one" aria-label="No listings yet">
            <div className="hero-card-label">Today&apos;s board is empty</div>
            <p className="desc">Be the first to add your project below.</p>
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
              {categories.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={category === item.id ? 'active' : undefined}
                    aria-current={category === item.id ? 'page' : undefined}
                    onClick={() => setCategory(item.id)}
                  >
                    <span className="cat-label">{item.label}</span>
                    {item.id !== 'all' ? (
                      <span className="num cat-floor">
                        {categoryFloors.has(item.id) ? `— $${categoryFloors.get(item.id)}` : '— open'}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
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

          <div className="board-panel">
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
                {filtered.map((entry) => {
                  const yours = isYours(entry)
                  const bidUsd = entry.amount_cents / 100
                  return (
                    <tr key={entry.product_id} className={yours ? 'row-yours' : undefined}>
                      <td className="rank-cell num">#{entry.rank}</td>
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
                          {rowActionLabel(entry.rank, bidUsd, yours)}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <div className="board-empty">No projects in this category yet — be the first.</div>
            ) : null}
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
        onListed={(entry) => setTarget({ listing: entry, mode: 'raise' })}
        initialUrl={url}
        detectedCategory={detected}
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
