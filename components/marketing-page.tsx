'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { SiteHeader } from '@/components/header'
import {
  ConnectModal,
  DetailsModal,
  ListedModal,
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
  takePrice,
  valueStrip,
  type MarketingVariant,
} from '@/lib/data'
import type { LeaderboardEntry } from '@/lib/api'
import { productGoUrl } from '@/lib/api'
import { checkoutErrorMessage, startCheckout } from '@/lib/checkout'
import { formatCount, formatListedAt } from '@/lib/format'
import { listingMarkSrc } from '@/lib/logo'
import { BidStepper } from '@/components/bid-stepper'
import { useWallet } from '@/components/wallet'

/**
 * Row / hero thumbnail — the website's favicon/app icon, never an OG banner.
 */
function Mark({
  letter,
  domain,
  logoData,
  logoUrl,
  large = false,
}: {
  letter: string
  domain: string
  logoData?: string
  logoUrl?: string
  large?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const src = listingMarkSrc({ domain, logoData, logoUrl })
  const showImage = Boolean(src) && !failed

  return (
    <div
      className={`${large ? 'mark' : 'mark sm'}${showImage ? ' has-image' : ''}`}
      aria-hidden="true"
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        letter
      )}
    </div>
  )
}

/**
 * The middle column of a listing row: thumbnail, headline, metadata line.
 *
 * The metadata line sits outside the click-through anchor rather than inside
 * it. Its category filter and details control are real buttons, and a button
 * nested inside an anchor is invalid HTML that browsers resolve
 * inconsistently — clicking the category would navigate off to the listed
 * site instead of filtering the board.
 */
function ListingBody({
  entry,
  yours,
  onCategory,
  onDetails,
}: {
  entry: LeaderboardEntry
  yours: boolean
  onCategory: (category: string) => void
  onDetails: (entry: LeaderboardEntry) => void
}) {
  const href = productGoUrl(entry.product_id)

  return (
    <div className="listing-main">
      <a className="listing-link" href={href} target="_blank" rel="sponsored noopener noreferrer" tabIndex={-1}>
        <Mark
          letter={entry.name[0]?.toUpperCase() ?? '?'}
          domain={entry.domain}
          logoData={entry.logo_data}
          logoUrl={entry.logo_url}
        />
      </a>
      <div className="listing-copy">
        <a className="listing-headline" href={href} target="_blank" rel="sponsored noopener noreferrer">
          <span className="listing-title">
            <span className="proj-name">{entry.name}</span>
            {yours ? <span className="you-label">You</span> : null}
          </span>
          <span className="listing-desc">{entry.tagline}</span>
        </a>
        <div className="listing-meta">
          <button
            type="button"
            className="listing-cat"
            onClick={() => onCategory(entry.category ?? DEFAULT_CATEGORY)}
          >
            {categoryLabel(entry.category) ?? 'Other'}
          </button>
          <span aria-hidden="true">·</span>
          {/* Viewer-local time; the server prerenders this in UTC. */}
          <span suppressHydrationWarning>{formatListedAt(entry.listed_at)}</span>
          <span aria-hidden="true">·</span>
          <b className="num">{formatCount(entry.clicks_total, 'click')}</b>
          <span aria-hidden="true">·</span>
          <button type="button" className="listing-details" onClick={() => onDetails(entry)}>
            see details
          </button>
        </div>
      </div>
    </div>
  )
}

export function MarketingPage({ variant }: { variant: MarketingVariant }) {
  const copy = variant === 'arena' ? arena : graffiti
  const wallet = useWallet()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { board, error: streamError } = useBoard()
  const [claimOpen, setClaimOpen] = useState(false)
  const [listed, setListed] = useState<LeaderboardEntry | null>(null)
  const [details, setDetails] = useState<LeaderboardEntry | null>(null)
  // Set when someone clicks a slot they don't own a listing for. The add flow
  // runs first, then redirects to Stripe — a bid is a payment for a product_id.
  const [pendingBidCents, setPendingBidCents] = useState<number | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [category, setCategory] = useState('all')
  const [url, setUrl] = useState('')
  const clock = useCountdown(board?.ends_in_seconds)

  // Stripe success: /?paid=<domain>&… — mark the wallet and land on the board.
  // No "bid placed" modal; the live board already shows the new rank.
  useEffect(() => {
    const paid = searchParams.get('paid')
    if (!paid) return
    wallet.markPaid(paid)
    router.replace('/', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function payFor(entry: LeaderboardEntry, amountCents: number) {
    setCheckoutError(null)
    try {
      await startCheckout(entry, amountCents)
    } catch (err) {
      setCheckoutError(checkoutErrorMessage(err))
    }
  }

  const entries = board?.entries ?? []
  const unranked = board?.unranked ?? []
  const slotsPerCategory = board?.slots_per_category ?? 0
  const leader = entries[0]

  // What it takes to outrank #1 right now — the floor for the hero stepper.
  // You can always bid more than this, never less: paying anything under it
  // wouldn't actually take the spot.
  const minHeroBid = leader ? takePrice(leader.amount_cents / 100) : takePrice(0)
  const [heroBidUsd, setHeroBidUsd] = useState(minHeroBid)
  // Ratchet the floor up as the real price moves, but never overwrite a
  // higher amount you've already dialed in yourself.
  useEffect(() => {
    setHeroBidUsd((prev) => Math.max(prev, minHeroBid))
  }, [minHeroBid])

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

  /**
   * Outrank: the row you clicked only sets the price. We always ask for YOUR
   * URL, create/reuse YOUR listing, then bid on that product_id — never on
   * the incumbent's. Their link stays on the board and drops a rank.
   */
  function takeSlot(priceUsd: number) {
    setPendingBidCents(Math.round(priceUsd * 100))
    setClaimOpen(true)
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
              <Mark
                letter={leader.name[0]?.toUpperCase() ?? '?'}
                domain={leader.domain}
                logoData={leader.logo_data}
                logoUrl={leader.logo_url}
                large
              />
              <div className="hero-card-meta">
                <a
                  className="name proj-link"
                  href={productGoUrl(leader.product_id)}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                >
                  {leader.name}
                </a>
                <p className="desc">{leader.tagline}</p>
              </div>
            </div>
            <div className="hero-card-foot">
              <div className="bid-block">
                <div className="label">Current bid</div>
                <div className="amount num">${leader.amount_cents / 100}</div>
              </div>
              <BidStepper value={heroBidUsd} min={minHeroBid} onChange={setHeroBidUsd} />
              <button type="button" className="btn btn-primary btn-lg" onClick={() => takeSlot(heroBidUsd)}>
                Outrank #1 for ${heroBidUsd} →
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
                  <BidStepper value={heroBidUsd} min={minHeroBid} onChange={setHeroBidUsd} />
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={() => takeSlot(heroBidUsd)}
                  >
                    Claim #1 · ${heroBidUsd} →
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

      {checkoutError ? (
        <div className="stream-warning" role="alert">
          {checkoutError}
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
                // Free add only — don't carry a price from a prior "claim rank" click.
                setPendingBidCents(null)
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
              <div className="listing-list">
                {rankedRows.map((entry, index) => {
                  const yours = isYours(entry)
                  const bidUsd = entry.amount_cents / 100
                  const position = category === 'all' ? entry.rank : index + 1
                  const claimPrice = takePrice(bidUsd)
                  return (
                    <article
                      key={entry.product_id}
                      className={[
                        'listing-row',
                        yours ? 'is-yours' : undefined,
                        position === 1 ? 'is-top' : undefined,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div
                        className={`listing-rank num ${position <= 3 ? `top-${position}` : ''}`}
                        aria-label={`Rank ${position}`}
                      >
                        #{position}
                      </div>
                      <ListingBody
                        entry={entry}
                        yours={yours}
                        onCategory={setCategory}
                        onDetails={setDetails}
                      />
                      <div className="listing-side">
                        <div className="listing-bid num">${bidUsd}</div>
                        <button
                          type="button"
                          className="listing-claim"
                          onClick={() =>
                            yours
                              ? void payFor(entry, takePrice(bidUsd) * 100)
                              : takeSlot(takePrice(bidUsd))
                          }
                        >
                          {yours
                            ? rowActionLabel(position, bidUsd, true)
                            : `Outrank for $${claimPrice} ↗`}
                        </button>
                      </div>
                    </article>
                  )
                })}

                {freeRows.length > 0 && rankedRows.length > 0 ? (
                  <div className="board-divider">
                    <span>Also listed today</span>
                    <small>Free listings — no bid yet. $1 moves one into a ranked slot.</small>
                  </div>
                ) : null}

                {freeRows.length > 0 && rankedRows.length === 0 ? (
                  <div className="board-divider">
                    <span>Listed · not ranked yet</span>
                    <small>
                      These are free listings. #1 is empty until someone bids — ${takePrice(0)}{' '}
                      takes it.
                    </small>
                  </div>
                ) : null}

                {freeRows.map((entry) => {
                  const yours = isYours(entry)
                  const claimPrice = takePrice(0)
                  return (
                    <article
                      key={entry.product_id}
                      className={['listing-row', 'is-free', yours ? 'is-yours' : undefined]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div
                        className="listing-rank num is-unranked"
                        aria-label="Unranked free listing"
                      >
                        —
                      </div>
                      <ListingBody
                        entry={entry}
                        yours={yours}
                        onCategory={setCategory}
                        onDetails={setDetails}
                      />
                      <div className="listing-side">
                        <div className="listing-bid">
                          <span className="free-badge">Free</span>
                        </div>
                        <button
                          type="button"
                          className="listing-claim"
                          onClick={() =>
                            yours
                              ? void payFor(entry, takePrice(0) * 100)
                              : takeSlot(takePrice(0))
                          }
                        >
                          {yours
                            ? `Rank yours · $${claimPrice} ↗`
                            : `Outrank for $${claimPrice} ↗`}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
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
        pendingBidCents={pendingBidCents}
        onClose={() => {
          setClaimOpen(false)
          setPendingBidCents(null)
        }}
        onListed={(entry) => {
          setUrl('')
          // Free add only — pay flows go straight to Stripe from the modal.
          setCategory(entry.category ?? DEFAULT_CATEGORY)
          setListed(entry)
        }}
        // Outrank flow: empty field so we never prefill the incumbent's URL.
        // Free-add from the entry bar keeps whatever they typed.
        initialUrl={pendingBidCents !== null ? '' : url}
      />
      <ListedModal
        entry={listed}
        rankedAt={entries.find((e) => e.product_id === listed?.product_id)?.rank ?? null}
        onClose={() => setListed(null)}
        onBid={(entry) => {
          setListed(null)
          void payFor(entry, takePrice(0) * 100)
        }}
      />
      <DetailsModal
        entry={details}
        rank={details && details.amount_cents > 0 ? details.rank : null}
        yours={details ? isYours(details) : false}
        onClose={() => setDetails(null)}
        onBid={(entry) => {
          setDetails(null)
          if (isYours(entry)) {
            void payFor(entry, takePrice(entry.amount_cents / 100) * 100)
            return
          }
          takeSlot(takePrice(entry.amount_cents / 100))
        }}
      />
    </>
  )
}
