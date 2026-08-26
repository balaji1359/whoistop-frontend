'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { SiteHeader } from '@/components/header'
import {
  ConnectModal,
  DetailsModal,
  ListedModal,
} from '@/components/modals'
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
import type { ActivityItem, BoardView, LeaderboardEntry } from '@/lib/api'
import { getActivity, productGoUrl } from '@/lib/api'
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
          {/* Accent only on the separator that follows the one interactive
              thing in this line — it points at the filter, it isn't decoration. */}
          <span className="meta-dot" aria-hidden="true">
            •
          </span>
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

/**
 * The live pulse of the board, from the rank history the backend already
 * keeps. Only paid moves appear — a listing pushed down by somebody else's bid
 * is not something anyone did, and padding the feed with passive movement
 * would make a quiet board look busy.
 */
function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const [expanded, setExpanded] = useState(false)
  const [extra, setExtra] = useState<ActivityItem[] | null>(null)
  const [loading, setLoading] = useState(false)

  if (items.length === 0) return null

  const shown = expanded && extra ? extra : items

  async function showMore() {
    if (extra) {
      setExpanded(true)
      return
    }
    setLoading(true)
    try {
      setExtra(await getActivity(30))
      setExpanded(true)
    } catch {
      // Leave the inline feed as-is; it is already the most recent slice.
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="activity-card" aria-label="Latest activity">
      <div className="activity-head">
        <h2 className="strip-title">
          <span className="strip-dot" aria-hidden="true" />
          Latest activity
        </h2>
        {!expanded ? (
          <button type="button" className="pill-btn" onClick={showMore} disabled={loading}>
            {loading ? 'Loading…' : 'Show more'}
          </button>
        ) : (
          <button type="button" className="pill-btn" onClick={() => setExpanded(false)}>
            Show less
          </button>
        )}
      </div>
      <ol className={expanded ? 'activity-row is-expanded' : 'activity-row'}>
        {shown.map((item) => (
          <li key={`${item.product_id}-${item.occurred_at}`} className="activity-chip">
            <Mark
              letter={item.name[0]?.toUpperCase() ?? '?'}
              domain={item.domain}
              logoData={item.logo_data}
              logoUrl={item.logo_url}
            />
            <div className="activity-body">
              <span className="activity-name" title={item.name}>
                {item.name}
              </span>
              <span className="activity-line num">
                at #{item.rank} <span aria-hidden="true">·</span> ${item.amount_cents / 100}
              </span>
              <span className="activity-when num" suppressHydrationWarning>
                {formatListedAt(item.occurred_at)}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * A "TOP 10" / "TOP 20" marker cutting across the list.
 *
 * It does two jobs. It breaks an otherwise endless ranking into segments you
 * can hold in your head, and it draws a visible line to be above — which is
 * the actual product: being #11 only means something once #10 is a threshold
 * rather than just the row before you.
 */
function Milestone({ at }: { at: number }) {
  return (
    <div className="milestone" role="separator" aria-label={`Top ${at}`}>
      <span className="milestone-pill num">TOP {at}</span>
    </div>
  )
}

/**
 * The seam where paid ranking stops. Placed once, not repeated per row: this
 * is the spot where the price of a rank is most obvious, because the listing
 * directly below it is holding a position for nothing.
 */
function ClaimSeam({ price, onClaim }: { price: number; onClaim: () => void }) {
  return (
    <div className="claim-seam">
      <button type="button" className="claim-seam-pill" onClick={onClaim}>
        Claim this rank for ${price} ↗
      </button>
    </div>
  )
}

/**
 * The two recency strips. They are windows over the same standing board, not
 * separate boards: a listing here is also somewhere in the main ranking below.
 * Bids are what make the windows move, so a quiet week renders nothing rather
 * than an empty shell.
 */
function TopStrips({ daily, weekly }: { daily: LeaderboardEntry[]; weekly: LeaderboardEntry[] }) {
  if (daily.length === 0 && weekly.length === 0) return null

  return (
    <section className="top-strips" aria-label="Recent top rankings">
      <TopStrip title="Today's top ranking" hint="Bids placed in the last 24 hours" entries={daily} />
      <TopStrip title="This week's top ranking" hint="Bids placed in the last 7 days" entries={weekly} />
    </section>
  )
}

function TopStrip({
  title,
  hint,
  entries,
}: {
  title: string
  hint: string
  entries: LeaderboardEntry[]
}) {
  if (entries.length === 0) return null

  return (
    <div className="strip">
      <div className="strip-head">
        <h2 className="strip-title">
          <span className="strip-dot" aria-hidden="true" />
          {title}
        </h2>
        <span className="strip-hint">{hint}</span>
      </div>
      <ol className="strip-row">
        {entries.map((entry) => (
          <li key={entry.product_id} className={entry.rank === 1 ? 'strip-item is-lead' : 'strip-item'}>
            <span className="strip-rank num">#{entry.rank}</span>
            <Mark
              letter={entry.name[0]?.toUpperCase() ?? '?'}
              domain={entry.domain}
              logoData={entry.logo_data}
              logoUrl={entry.logo_url}
            />
            <a
              className="strip-name proj-link"
              href={productGoUrl(entry.product_id)}
              target="_blank"
              rel="sponsored noopener noreferrer"
              title={entry.name}
            >
              {entry.name}
            </a>
            <span className="strip-amount num">${entry.amount_cents / 100}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function MarketingPage({
  variant,
  initialBoard = null,
}: {
  variant: MarketingVariant
  /** Fetched server-side by the page component — see `lib/use-board.ts`. */
  initialBoard?: BoardView | null
}) {
  const copy = variant === 'arena' ? arena : graffiti
  const wallet = useWallet()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { board, error: streamError } = useBoard(initialBoard)
  const [claimOpen, setClaimOpen] = useState(false)
  const [listed, setListed] = useState<LeaderboardEntry | null>(null)
  const [details, setDetails] = useState<LeaderboardEntry | null>(null)
  // Set when someone clicks a slot they don't own a listing for. The add flow
  // runs first, then redirects to Stripe — a bid is a payment for a product_id.
  const [pendingBidCents, setPendingBidCents] = useState<number | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [category, setCategory] = useState('all')
  const [url, setUrl] = useState('')

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
  // `unranked` mixes two different things: listings nobody has ever paid for,
  // and paid listings that overflowed their category's slots. They price
  // completely differently — outranking a free listing costs $1, outranking a
  // paid one costs its bid plus the increment — so they cannot share a row.
  const overflowRows = useMemo(
    () => unranked.filter((item) => item.amount_cents > 0 && inCategory(item)),
    [category, unranked],
  )
  const freeRows = useMemo(
    () => unranked.filter((item) => item.amount_cents === 0 && inCategory(item)),
    [category, unranked],
  )

  const detected = url.trim() ? detectCategoryFromUrl(url) : null

  const stats = useMemo(() => {
    const all = [...entries, ...unranked]
    return {
      listings: all.length,
      boardValue: all.reduce((sum, e) => sum + e.amount_cents, 0) / 100,
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

        <aside className="hero-side" aria-label="How ranking works">
          <div className="eyebrow">The rule</div>
          <p className="hold-line">
            Highest bid is <span className="accent">#1</span>.
          </p>
          <p className="hold-copy">{copy.holdNote}</p>
          <Link className="text-link" href="#how">
            Learn how it works →
          </Link>
        </aside>
      </section>

      <TopStrips daily={board?.daily_top ?? []} weekly={board?.weekly_top ?? []} />

      <ActivityFeed items={board?.activity ?? []} />

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
            {rankedRows.length === 0 && overflowRows.length === 0 && freeRows.length === 0 ? (
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
                  // Keyed off the displayed position, so it reads correctly
                  // both board-wide and inside a filtered category. Suppressed
                  // on the last row — a marker with nothing beneath it marks
                  // nothing.
                  const milestone =
                    position % 10 === 0 && index < rankedRows.length - 1 ? position : null
                  return (
                    <Fragment key={entry.product_id}>
                    <article
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
                    {milestone ? <Milestone at={milestone} /> : null}
                    </Fragment>
                  )
                })}

                {overflowRows.length > 0 ? (
                  <div className="board-divider">
                    <span>Paid · below the cut</span>
                    <small>
                      These bids are live but sit under their category&apos;s {slotsPerCategory}{' '}
                      ranked slots. Raise one to move it up.
                    </small>
                  </div>
                ) : null}

                {overflowRows.map((entry) => {
                  const yours = isYours(entry)
                  const bidUsd = entry.amount_cents / 100
                  const price = takePrice(bidUsd)
                  return (
                    <article
                      key={entry.product_id}
                      className={['listing-row', 'is-overflow', yours ? 'is-yours' : undefined]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className="listing-rank num is-unranked" aria-label="Below the ranked slots">
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
                          <span className="num">${bidUsd}</span>
                        </div>
                        <button
                          type="button"
                          className="listing-claim"
                          onClick={() => (yours ? void payFor(entry, price * 100) : takeSlot(price))}
                        >
                          {yours ? `Raise · $${price} ↗` : `Outrank for $${price} ↗`}
                        </button>
                      </div>
                    </article>
                  )
                })}

                {freeRows.length > 0 ? (
                  <ClaimSeam price={takePrice(0)} onClaim={() => takeSlot(takePrice(0))} />
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
                          <span className="free-price num">FREE</span>
                        </div>
                        <button
                          type="button"
                          className="listing-claim is-quiet"
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
