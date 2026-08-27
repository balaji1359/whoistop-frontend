'use client'

import { Fragment, Suspense, useEffect, useMemo, useState } from 'react'
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
  boardPeriods,
  categories,
  categoryLabel,
  DEFAULT_CATEGORY,
  detectCategoryFromUrl,
  graffiti,
  rowActionLabel,
  takePrice,
  valueStrip,
  type BoardPeriod,
  type MarketingVariant,
} from '@/lib/data'
import type { ActivityItem, BoardView, LeaderboardEntry } from '@/lib/api'
import { getActivity, productGoUrl } from '@/lib/api'
import { checkoutErrorMessage, startCheckout } from '@/lib/checkout'
import { formatCount, formatListedAt } from '@/lib/format'
import { listingMarkCandidates } from '@/lib/logo'
import { BidStepper } from '@/components/bid-stepper'
import { useWallet } from '@/components/wallet'

/**
 * Row / hero thumbnail — the website's favicon/app icon, never an OG banner.
 * Cascades through stored thumbnail → favicon → letter so a blank Google tile
 * doesn't leave a white square on the #1 row.
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
  const candidates = listingMarkCandidates({ domain, logoData, logoUrl })
  const [index, setIndex] = useState(0)
  const src = candidates[index]
  const showImage = Boolean(src)

  return (
    <div
      className={`${large ? 'mark' : 'mark sm'}${showImage ? ' has-image' : ''}`}
      aria-hidden="true"
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setIndex((i) => i + 1)}
        />
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

function filterRedundantActivity(items: ActivityItem[], leader?: LeaderboardEntry) {
  if (!leader || items.length === 0) return items
  if (items.length === 1 && items[0].product_id === leader.product_id && items[0].rank === 1) {
    return []
  }
  return items
}

/**
 * Drop a period strip that only restates all-time #1 on a quiet board.
 */
function filterPeriodStrip(entries: LeaderboardEntry[], leader?: LeaderboardEntry) {
  if (!leader || entries.length === 0) return entries
  if (entries.length === 1 && entries[0].product_id === leader.product_id && entries[0].rank === 1) {
    return []
  }
  return entries
}

function PeriodRankStrip({
  title,
  entries,
  onSeeAll,
}: {
  title: string
  entries: LeaderboardEntry[]
  onSeeAll: () => void
}) {
  if (entries.length === 0) return null
  const shown = entries.slice(0, 3)

  return (
    <section className="rank-strip">
      <div className="rank-strip-head">
        <h3 className="rank-strip-title">
          <span className="rank-strip-dot" aria-hidden="true" />
          {title}
        </h3>
        <button type="button" className="rank-strip-all" onClick={onSeeAll}>
          See all <span aria-hidden="true">→</span>
        </button>
      </div>
      <ol className="rank-strip-cards">
        {shown.map((entry) => (
          <li key={entry.product_id}>
            <a
              className={entry.rank === 1 ? 'rank-card is-lead' : 'rank-card'}
              href={productGoUrl(entry.product_id)}
              target="_blank"
              rel="sponsored noopener noreferrer"
            >
              <span className="rank-card-place num">#{entry.rank}</span>
              <Mark
                letter={entry.name[0]?.toUpperCase() ?? '?'}
                domain={entry.domain}
                logoData={entry.logo_data}
                logoUrl={entry.logo_url}
              />
              <span className="rank-card-name" title={entry.name}>
                {entry.name}
              </span>
              <span className="rank-card-bid num">${entry.amount_cents / 100}</span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * Creative period strips + activity under the main list — only on All-time so
 * Today/Week tabs stay the full list, not a duplicated strip.
 */
function BoardPulse({
  daily,
  weekly,
  activity,
  leader,
  onPeriod,
}: {
  daily: LeaderboardEntry[]
  weekly: LeaderboardEntry[]
  activity: ActivityItem[]
  leader?: LeaderboardEntry
  onPeriod: (period: BoardPeriod) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [extra, setExtra] = useState<ActivityItem[] | null>(null)
  const [loading, setLoading] = useState(false)

  const dailyShown = filterPeriodStrip(daily, leader)
  let weeklyShown = filterPeriodStrip(weekly, leader)
  if (
    dailyShown.length > 0 &&
    weeklyShown.length === dailyShown.length &&
    weeklyShown.every((e, i) => e.product_id === dailyShown[i]?.product_id)
  ) {
    weeklyShown = []
  }
  const activityShown = filterRedundantActivity(activity, leader)

  if (dailyShown.length === 0 && weeklyShown.length === 0 && activityShown.length === 0) return null

  const shown = expanded && extra ? extra : activityShown

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
      // Keep the inline slice.
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="board-pulse" aria-label="Board activity">
      {(dailyShown.length > 0 || weeklyShown.length > 0) && (
        <div className="rank-strips">
          <PeriodRankStrip
            title="Today's top ranking"
            entries={dailyShown}
            onSeeAll={() => onPeriod('day')}
          />
          <PeriodRankStrip
            title="Week's top ranking"
            entries={weeklyShown}
            onSeeAll={() => onPeriod('week')}
          />
        </div>
      )}
      {activityShown.length > 0 ? (
        <div className="pulse-activity">
          <div className="pulse-activity-head">
            <span className="pulse-label">Latest activity</span>
            {!expanded ? (
              <button type="button" className="pulse-more" onClick={showMore} disabled={loading}>
                {loading ? 'Loading…' : 'Show more'}
              </button>
            ) : (
              <button type="button" className="pulse-more" onClick={() => setExpanded(false)}>
                Show less
              </button>
            )}
          </div>
          <ol className={expanded ? 'pulse-row is-expanded' : 'pulse-row'}>
            {shown.map((item) => (
              <li key={`${item.product_id}-${item.occurred_at}`} className="pulse-chip">
                <Mark
                  letter={item.name[0]?.toUpperCase() ?? '?'}
                  domain={item.domain}
                  logoData={item.logo_data}
                  logoUrl={item.logo_url}
                />
                <span className="pulse-chip-name" title={item.name}>
                  {item.name}
                </span>
                <span className="pulse-chip-meta num">
                  #{item.rank} · ${item.amount_cents / 100}
                </span>
                <span className="pulse-chip-when num" suppressHydrationWarning>
                  {formatListedAt(item.occurred_at)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
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
 * Handles the `?paid=<domain>` hand-back from Stripe Checkout. Renders nothing.
 *
 * It exists only to quarantine `useSearchParams`. That hook opts its subtree
 * out of server rendering, and the bailout stops at the nearest Suspense
 * boundary — so with the whole board inside that boundary the page shipped an
 * empty <body>, and every crawler that doesn't run JavaScript saw nothing at
 * all. Isolated here, the bailout costs us this component and nothing else.
 *
 * Keep this component tiny, and never move a hook that reads the URL up into
 * MarketingPage: that single line is the difference between a server-rendered
 * board and a blank page for GPTBot, ClaudeBot, PerplexityBot and CCBot.
 */
function PaidRedirect({ onPaid }: { onPaid: (domain: string) => void }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const paid = searchParams.get('paid')
    if (!paid) return
    onPaid(paid)
    // No "bid placed" modal; the live board already shows the new rank.
    router.replace('/', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return null
}

/**
 * The seam where paid ranking stops. Placed once, not repeated per row: this
 * is the spot where the price of a rank is most obvious, because the listing
 * directly below it is holding a position for nothing.
 *
 * Copy must not say "this rank" — sitting under #1 that reads as "take #1 for
 * $1" while the hero correctly says #1 costs more.
 */
function ClaimSeam({ price, onClaim }: { price: number; onClaim: () => void }) {
  return (
    <div className="claim-seam">
      <button type="button" className="claim-seam-pill" onClick={onClaim}>
        Get ranked for ${price} ↗
      </button>
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
  const { board, error: streamError, refresh, upsertUnranked } = useBoard(initialBoard)
  const [claimOpen, setClaimOpen] = useState(false)
  const [listed, setListed] = useState<LeaderboardEntry | null>(null)
  const [details, setDetails] = useState<LeaderboardEntry | null>(null)
  // Set when someone clicks a slot they don't own a listing for. The add flow
  // runs first, then redirects to Stripe — a bid is a payment for a product_id.
  const [pendingBidCents, setPendingBidCents] = useState<number | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [category, setCategory] = useState('all')
  const [period, setPeriod] = useState<BoardPeriod>('all')
  const [url, setUrl] = useState('')
  const [heroCategory, setHeroCategory] = useState(DEFAULT_CATEGORY)

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
  const dailyTop = board?.daily_top ?? []
  const weeklyTop = board?.weekly_top ?? []
  const slotsPerCategory = board?.slots_per_category ?? 0
  const leader = entries[0]
  const isStandingPeriod = period === 'all'

  // What it takes to outrank #1 right now — the floor for the hero stepper.
  // You can always bid more than this, never less: paying anything under it
  // wouldn't actually take the spot. Always from all-time — that is the real board.
  const minHeroBid = leader ? takePrice(leader.amount_cents / 100) : takePrice(0)
  const [heroBidUsd, setHeroBidUsd] = useState(minHeroBid)
  // Ratchet the floor up as the real price moves, but never overwrite a
  // higher amount you've already dialed in yourself.
  useEffect(() => {
    setHeroBidUsd((prev) => Math.max(prev, minHeroBid))
  }, [minHeroBid])

  const inCategory = (item: LeaderboardEntry) =>
    category === 'all' || (item.category ?? DEFAULT_CATEGORY) === category

  // Period source: All-time = standing board; Today/Week = standing bids placed
  // in the rolling window. If a window is empty, fall back to All-time so #1
  // never disappears the way it does on a quiet day (outbids always keeps a list).
  const periodSource = period === 'day' ? dailyTop : period === 'week' ? weeklyTop : entries
  const periodEmpty = !isStandingPeriod && periodSource.length === 0
  const periodEntries = periodEmpty ? entries : periodSource
  const showingAllTimeFallback = periodEmpty
  const rankedRows = useMemo(() => periodEntries.filter(inCategory), [category, periodEntries])
  // Free / overflow / claim seam only on the real standing board (not a window fallback).
  const showStandingExtras = isStandingPeriod || showingAllTimeFallback
  const overflowRows = useMemo(
    () => (showStandingExtras ? unranked.filter((item) => item.amount_cents > 0 && inCategory(item)) : []),
    [category, showStandingExtras, unranked],
  )
  const freeRows = useMemo(
    () => (showStandingExtras ? unranked.filter((item) => item.amount_cents === 0 && inCategory(item)) : []),
    [category, showStandingExtras, unranked],
  )

  const detected = url.trim() ? detectCategoryFromUrl(url) : null

  useEffect(() => {
    if (detected) setHeroCategory(detected)
  }, [detected])

  function openClaim(options: { bidCents: number | null; fromHero?: boolean }) {
    if (options.fromHero) {
      const trimmed = url.trim()
      if (trimmed && !/^https?:\/\//i.test(trimmed)) {
        setUrl(`https://${trimmed}`)
      }
    }
    setPendingBidCents(options.bidCents)
    setClaimOpen(true)
  }

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
        <SiteHeader onClaim={() => openClaim({ bidCents: null })} />
        <div className="board-loading" role="status">
          Loading the board…
        </div>
      </>
    )
  }

  return (
    <>
      <Suspense fallback={null}>
        <PaidRedirect onPaid={wallet.markPaid} />
      </Suspense>

      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader onClaim={() => openClaim({ bidCents: null })} />

      {/*
        On mobile, `.home-stack` puts the board first — WhoIsTop is the product,
        not the submission form. Desktop keeps the full hero above the list.
      */}
      <div className="home-stack">
      <section className="hero-cta" aria-label="Claim a rank">
        {stats.listings > 0 || stats.boardValue > 0 || stats.clicks > 0 ? (
          <p className="hero-live num" role="status">
            <span className="hero-live-dot" aria-hidden="true" />
            {stats.listings} {stats.listings === 1 ? 'listing' : 'listings'}
            <span aria-hidden="true"> · </span>
            ${stats.boardValue} board value
            <span aria-hidden="true"> · </span>
            {stats.clicks} clicks today
            <span aria-hidden="true"> · </span>
            live board
          </p>
        ) : null}

        <h1 className="hero-hook">{copy.heroHook}</h1>
        <p className="hero-pitch">{copy.heroPitch}</p>
        <p className="hero-price-line">
          <span>#1 currently costs </span>
          <BidStepper variant="hero" value={heroBidUsd} min={minHeroBid} onChange={setHeroBidUsd} />
        </p>

        <form
          className="hero-form"
          onSubmit={(event) => {
            event.preventDefault()
            openClaim({ bidCents: Math.round(heroBidUsd * 100), fromHero: true })
          }}
          noValidate
        >
          <label className="hero-field">
            <span className="hero-field-icon muted" aria-hidden="true">
              ⌘
            </span>
            <input
              type="text"
              inputMode="url"
              autoComplete="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Paste your product URL here…"
              aria-label="Project URL"
            />
          </label>
          <button type="submit" className="btn btn-primary hero-outbid">
            {leader ? 'Outbid them' : 'List my product'}
          </button>
        </form>

        {/* Mobile: no URL/category form — open the claim modal instead so the board can lead. */}
        <div className="hero-mobile-actions">
          <button
            type="button"
            className="btn btn-primary hero-outbid"
            onClick={() => openClaim({ bidCents: Math.round(heroBidUsd * 100), fromHero: true })}
          >
            {leader ? `Outbid #1 · $${heroBidUsd}` : 'Claim your spot'}
          </button>
          <button type="button" className="hero-free" onClick={() => openClaim({ bidCents: null, fromHero: true })}>
            {copy.entryHintFree}
          </button>
        </div>

        <p className="hero-foot">
          <span className="hero-foot-hint">
            {copy.entryHint}{' '}
            <button type="button" className="hero-free" onClick={() => openClaim({ bidCents: null, fromHero: true })}>
              {copy.entryHintFree}
            </button>
          </span>
        </p>
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
        <div className="period-bar" role="tablist" aria-label="Board period">
          {boardPeriods.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={period === item.id}
              className={period === item.id ? 'active' : undefined}
              onClick={() => setPeriod(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <aside id="categories" className="side-card cats-card" aria-label="Categories">
          <div className="side-head">
            <div className="eyebrow">Categories</div>
          </div>
          {/* Mobile: one select. Desktop: chip list. 28 chips must not eat the first screen. */}
          <label className="cats-select-wrap">
            <span className="sr-only">Category</span>
            <select
              className="cats-select"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => {
                const price = categoryEntryPrice.get(item.id)
                const suffix =
                  item.id === 'all' ? '' : ` — $${price ?? 1}`
                return (
                  <option key={item.id} value={item.id}>
                    {item.label}
                    {suffix}
                  </option>
                )
              })}
            </select>
          </label>
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
          <div className="board-panel">
            {rankedRows.length === 0 && overflowRows.length === 0 && freeRows.length === 0 ? (
              <div className="board-empty">
                {stats.listings > 0 || periodEntries.length > 0 ? (
                  <>
                    <strong>Nothing in {categoryLabel(category) ?? 'this category'} yet</strong>
                    <p>The board has listings in other categories.</p>
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
                    <strong>Nothing on the board yet</strong>
                    <p>Listing is free — then bid from $1 to take a ranked slot.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="listing-list">
                {showingAllTimeFallback ? (
                  <p className="period-fallback" role="status">
                    {period === 'day'
                      ? 'No standing bids in the last 24 hours — showing All-time.'
                      : 'No standing bids in the last 7 days — showing All-time.'}
                  </p>
                ) : null}
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
            {period === 'all' ? (
              <BoardPulse
                daily={dailyTop}
                weekly={weeklyTop}
                activity={board?.activity ?? []}
                leader={leader}
                onPeriod={setPeriod}
              />
            ) : (
              <BoardPulse
                daily={[]}
                weekly={[]}
                activity={board?.activity ?? []}
                leader={leader}
                onPeriod={setPeriod}
              />
            )}
          </div>
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
          setCategory('all')
          upsertUnranked(entry)
          setListed(entry)
          // Defer refresh so the optimistic row commits first; mergeBoard
          // keeps it if the server snapshot is briefly behind.
          window.setTimeout(() => {
            void refresh()
          }, 0)
        }}
        initialUrl={pendingBidCents !== null ? url : url}
        initialCategory={heroCategory || detected || ''}
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
