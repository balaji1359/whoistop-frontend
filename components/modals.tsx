'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  categoryLabel,
  detectCategoryFromUrl,
  selectableCategories,
  takePrice,
} from '@/lib/data'
import { formatAge, formatListedAt, formatUsd } from '@/lib/format'
import { ApiError, createBidIntent, createProduct, type LeaderboardEntry } from '@/lib/api'
import { checkoutErrorMessage, startCheckout } from '@/lib/checkout'
import { fetchLinkPreview, type LinkPreview } from '@/lib/link-preview'
import { isAppStoreUrl, websiteLogoUrl } from '@/lib/logo'
import { BidStepper } from '@/components/bid-stepper'

/**
 * A payment about to be made against a listing that already exists.
 *
 * A bid is always "pay this much for that listing" — `/bids/intent` needs a
 * product_id, and Stripe's hosted page collects only an email, so the listing
 * can never be established during or after checkout. It used to be collected
 * in two places: a URL field inside this modal for "take" actions, and the
 * add-for-free bar for everything else. Now there is one place a listing is
 * created, and this type only ever describes a payment.
 */
export type BidTarget = {
  listing: LeaderboardEntry
  /**
   * What to charge, in cents. The caller sets it, because the price depends
   * on the slot being bought — moving into #3 costs more than this listing's
   * own current bid plus an increment.
   */
  amountCents: number
  /** Drives the wording only. */
  intent: 'rank' | 'raise' | 'defend'
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Last-resort display name when the link preview gives us nothing usable.
 *
 * Taking the first hostname label is only right for a project's own domain.
 * For the link types the hint text promises to support it produces garbage —
 * every App Store listing would be called "Apps" and every Play listing
 * "Play" — so those carry their name in the path instead.
 */
function deriveNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
    const segments = parsed.pathname.split('/').filter(Boolean)

    // apps.apple.com/us/app/my-app/id1234567890
    if (host.endsWith('apple.com')) {
      const appIndex = segments.indexOf('app')
      const slug = appIndex >= 0 ? segments[appIndex + 1] : undefined
      if (slug && !/^id\d+$/.test(slug)) return titleCase(slug)
    }

    // play.google.com/store/apps/details?id=com.example.myapp
    if (host.endsWith('play.google.com')) {
      const pkg = parsed.searchParams.get('id')
      const last = pkg?.split('.').filter(Boolean).pop()
      if (last) return titleCase(last)
    }

    // A profile is its handle, not the platform it lives on.
    if (/(^|\.)(x|twitter|instagram|linkedin|threads|tiktok|github)\.com$/.test(host)) {
      const handle = segments[0]
      if (handle) return `@${handle.replace(/^@/, '')}`
    }

    const base = host.split('.')[0] || host
    return titleCase(base)
  } catch {
    return 'New project'
  }
}

function normalizeInputUrl(raw: string): string | null {
  let value = raw.trim()
  if (!value || value.length < 4) return null
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`
  try {
    const url = new URL(value)
    if (!url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Preview mark: try OG image → scraped logo → Google favicon service → letter.
 * Scraped apple-touch / favicon URLs often 404 or block hotlinking (google.com
 * returns apple-touch-icon.png that doesn't load in-browser) — so we always
 * keep a reliable favicon-service URL in the chain and fall back on error.
 */
function PreviewCard({ preview }: { preview: LinkPreview }) {
  const letter = (preview.siteName || preview.title || displayHost(preview.url) || '?')
    .replace(/^www\./, '')
    .slice(0, 1)
    .toUpperCase()
  const reliableLogo = websiteLogoUrl(preview.url) || websiteLogoUrl(preview.siteName || '')
  const markCandidates = [
    preview.logo,
    preview.favicon,
    reliableLogo,
  ].filter((src, index, all): src is string => Boolean(src) && all.indexOf(src) === index)

  const [markIndex, setMarkIndex] = useState(0)
  const [bannerFailed, setBannerFailed] = useState(false)

  useEffect(() => {
    setMarkIndex(0)
    setBannerFailed(false)
  }, [preview.url, preview.logo, preview.favicon, preview.image])

  const markSrc = markCandidates[markIndex] ?? null
  const showBanner = Boolean(preview.image) && !bannerFailed

  return (
    <article className="claim-preview-card">
      <div className="claim-preview-media">
        {showBanner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.image!} alt="" onError={() => setBannerFailed(true)} />
        ) : markSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="claim-preview-logo"
            src={markSrc}
            alt=""
            onError={() => setMarkIndex((i) => i + 1)}
          />
        ) : (
          <div className="claim-preview-fallback">{letter}</div>
        )}
        {showBanner && markSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="claim-preview-logo-badge"
            src={markSrc}
            alt=""
            onError={() => setMarkIndex((i) => i + 1)}
          />
        ) : null}
      </div>
      <div className="claim-preview-copy">
        <span className="claim-preview-host">{preview.siteName || displayHost(preview.url)}</span>
        <strong>{preview.title || 'Untitled site'}</strong>
        {preview.description ? <p>{preview.description}</p> : <p className="muted">No description found.</p>}
      </div>
    </article>
  )
}

function LinkPreviewBlock({
  domain,
  onDomainChange,
  preview,
  previewStatus,
  previewError,
  autoFocus,
}: {
  domain: string
  onDomainChange: (value: string) => void
  preview: LinkPreview | null
  previewStatus: 'idle' | 'loading' | 'ready' | 'error'
  previewError: string | null
  autoFocus?: boolean
}) {
  return (
    <>
      <label className="bid-field">
        Your project URL
        <div className="claim-url-row">
          <input
            value={domain}
            onChange={(event) => onDomainChange(event.target.value)}
            placeholder="yoursite.com"
            autoFocus={autoFocus}
            inputMode="url"
            autoComplete="url"
          />
          {previewStatus === 'loading' ? <span className="claim-url-hint">Fetching…</span> : null}
          {previewStatus === 'ready' ? <span className="claim-url-hint claim-url-ok">Ready</span> : null}
        </div>
      </label>

      <div className={`claim-preview ${previewStatus === 'ready' ? 'is-ready' : ''}`} aria-live="polite">
        {previewStatus === 'loading' ? (
          <div className="claim-preview-skeleton">
            <div className="claim-preview-media sk" />
            <div className="claim-preview-copy">
              <div className="sk sk-line" />
              <div className="sk sk-line short" />
              <div className="sk sk-line" />
            </div>
          </div>
        ) : null}

        {previewStatus === 'ready' && preview ? (
          <PreviewCard preview={preview} />
        ) : null}

        {previewStatus === 'idle' ? (
          <div className="claim-preview-empty">
            <strong>Your listing preview</strong>
            <p>Title, image, and description show up here once the URL looks complete.</p>
          </div>
        ) : null}

        {previewStatus === 'error' ? (
          <div className="claim-preview-empty claim-preview-error">
            <strong>Couldn’t load preview</strong>
            <p>{previewError}. You can still continue — we’ll use the domain name.</p>
          </div>
        ) : null}
      </div>
    </>
  )
}

/**
 * The category the listing will be filed under.
 *
 * It is a required, explicit choice rather than a silent auto-assignment: the
 * board ranks per category, so a listing filed under the wrong tab competes in
 * the wrong race, and one filed under none is unreachable from every tab. The
 * guess only preselects — and stops preselecting the moment the person picks
 * something themselves.
 */
function useCategoryChoice(url: string, preview: LinkPreview | null) {
  const [category, setCategory] = useState('')
  const [touched, setTouched] = useState(false)

  const hint = `${preview?.title ?? ''} ${preview?.description ?? ''} ${preview?.siteName ?? ''}`
  const detected = useMemo(() => detectCategoryFromUrl(url, hint), [url, hint])

  useEffect(() => {
    if (touched) return
    setCategory(detected ?? '')
  }, [detected, touched])

  const choose = useCallback((value: string) => {
    setTouched(true)
    setCategory(value)
  }, [])

  const reset = useCallback(() => {
    setTouched(false)
    setCategory('')
  }, [])

  return { category, choose, reset, detected }
}

function CategorySelect({
  value,
  onChange,
  detected,
}: {
  value: string
  onChange: (value: string) => void
  detected: string | null
}) {
  return (
    <label className="bid-field">
      Category
      <select
        className="category-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      >
        <option value="">Choose a category…</option>
        {selectableCategories.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <span className="claim-url-hint">
        {detected && detected === value
          ? 'Detected from your link — change it if it’s wrong.'
          : 'This decides which board you compete on.'}
      </span>
    </label>
  )
}

function useLinkPreview(domain: string, enabled: boolean) {
  const [preview, setPreview] = useState<LinkPreview | null>(null)
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [previewError, setPreviewError] = useState<string | null>(null)
  const gen = useRef(0)

  useEffect(() => {
    if (!enabled) return
    const normalized = normalizeInputUrl(domain)
    if (!normalized) {
      setPreview(null)
      setPreviewStatus('idle')
      setPreviewError(null)
      return
    }

    const token = ++gen.current
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setPreviewStatus('loading')
      setPreviewError(null)
      try {
        const data = await fetchLinkPreview(normalized, controller.signal)
        if (gen.current !== token) return
        setPreview(data)
        setPreviewStatus('ready')
      } catch (err) {
        if (controller.signal.aborted || gen.current !== token) return
        setPreview(null)
        setPreviewStatus('error')
        setPreviewError(err instanceof Error ? err.message : 'Could not load preview.')
      }
    }, 450)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [domain, enabled])

  return { preview, previewStatus, previewError }
}

export function ConnectModal({
  open,
  onClose,
  onListed,
  initialUrl = '',
  initialCategory = '',
  pendingBidCents = null,
}: {
  open: boolean
  onClose: () => void
  /** Called after a free add. Pay flows redirect to Stripe themselves. */
  onListed?: (entry: LeaderboardEntry) => void
  initialUrl?: string
  /** Preselect from the hero form when the user already picked a category. */
  initialCategory?: string
  /** Non-null when this add is the first half of buying a ranked slot. */
  pendingBidCents?: number | null
}) {
  const [domain, setDomain] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const minBidUsd = takePrice(0)
  const [bidUsd, setBidUsd] = useState(minBidUsd)
  const { preview, previewStatus, previewError } = useLinkPreview(domain, open)
  // Detected from the URL as edited here, not the one typed on the page —
  // editing the link in this modal used to leave the stale guess attached.
  const { category, choose, reset, detected } = useCategoryChoice(domain, preview)

  useEffect(() => {
    if (!open) return
    setDomain(initialUrl)
    setError(null)
    reset()
    if (initialCategory) choose(initialCategory)
    if (pendingBidCents !== null) {
      setBidUsd(Math.max(minBidUsd, Math.round(pendingBidCents / 100)))
    }
  }, [open, initialUrl, initialCategory, choose, reset, pendingBidCents, minBidUsd])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const paying = pendingBidCents !== null

  async function submit() {
    setError(null)
    const url = normalizeInputUrl(domain)
    if (!url) {
      setError('Enter your project URL.')
      return
    }
    if (!category) {
      setError('Pick a category — it decides which board you’re listed on.')
      return
    }

    const resolvedName =
      preview?.title?.trim() || preview?.siteName?.trim() || deriveNameFromUrl(url)
    const tagline = (preview?.description || 'Listed on WhoIsTop').slice(0, 160)
    // Store a real site icon for the board mark — never the OG banner.
    const logoUrl = isAppStoreUrl(url)
      ? preview?.logo || preview?.image || websiteLogoUrl(url) || undefined
      : websiteLogoUrl(url) || preview?.logo || preview?.favicon || undefined

    setSubmitting(true)
    try {
      const product = await createProduct({
        name: resolvedName,
        domain: url,
        tagline,
        category,
        logo_url: logoUrl,
      })
      const entry: LeaderboardEntry = {
        rank: 0,
        product_id: product.id,
        name: product.name,
        domain: product.domain,
        tagline: product.tagline,
        category: product.category,
        logo_url: logoUrl,
        cta_text: product.cta_text,
        amount_cents: 0,
        clicks_today: 0,
        clicks_total: 0,
        listed_at: new Date().toISOString(),
      }

      // Outrank: list then jump straight to Stripe — no confirm modal.
      if (paying) {
        await startCheckout(entry, bidUsd * 100)
        return
      }

      onListed?.(entry)
      onClose()
    } catch (err) {
      setError(paying ? checkoutErrorMessage(err) : err instanceof ApiError ? err.message : 'Could not add your project — try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-claim"
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-claim-head">
          <h3 id="claim-title">{paying ? 'Your link for this rank' : 'Add your project'}</h3>
          <p>
            {paying ? (
              <>
                Enter <em>your</em> URL — not the listing you&apos;re beating. Adjust your bid,
                then pay.
              </>
            ) : (
              <>Free to list — you’ll appear on the board straight away. Bid to take a ranked slot.</>
            )}
          </p>
        </div>

        {paying ? (
          <div className="modal-bid-row">
            <span className="modal-bid-label">Your bid</span>
            <BidStepper value={bidUsd} min={minBidUsd} onChange={setBidUsd} />
          </div>
        ) : null}

        <div className="modal-claim-body">
          <LinkPreviewBlock
            domain={domain}
            onDomainChange={setDomain}
            preview={preview}
            previewStatus={previewStatus}
            previewError={previewError}
            autoFocus
          />
          <CategorySelect value={category} onChange={choose} detected={detected} />
        </div>

        {error ? (
          <p className="modal-meta modal-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting
              ? paying
                ? 'Going to Stripe…'
                : 'Adding…'
              : paying
                ? `Pay · ${formatUsd(bidUsd)}`
                : 'Add for free'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function BidModal({
  target,
  onClose,
}: {
  target: BidTarget | null
  onClose: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listing = target?.listing ?? null
  const floorUsd = useMemo(() => {
    if (!target || !listing) return takePrice(0)
    if (target.intent === 'rank') return takePrice(0)
    return takePrice(listing.amount_cents / 100)
  }, [target, listing])
  const [amountUsd, setAmountUsd] = useState(floorUsd)

  useEffect(() => {
    setError(null)
    setSubmitting(false)
    if (target) {
      setAmountUsd(Math.max(floorUsd, Math.round(target.amountCents / 100)))
    }
  }, [target, floorUsd])

  useEffect(() => {
    if (!listing) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [listing, onClose])

  if (!listing || !target) return null

  const price = amountUsd
  const currentUsd = listing.amount_cents / 100
  const host = displayHost(listing.domain)

  const copy = {
    defend: {
      title: `Defend #1`,
      body: (
        <>
          Raise <em>{listing.name}</em> to hold #1 (currently {formatUsd(currentUsd)}). Use − / + to
          set how much you pay.
        </>
      ),
    },
    raise: {
      title: `Raise bid`,
      body: (
        <>
          Raise <em>{listing.name}</em> from {formatUsd(currentUsd)}
          {listing.rank > 0 ? <> — currently #{listing.rank}</> : null}. Dial the amount below.
        </>
      ),
    },
    rank: {
      title: `Outrank`,
      body: (
        <>
          Rank <em>{host}</em> in {categoryLabel(listing.category) ?? 'its category'}. Higher bids sit
          above lower ones — you&apos;re not buying someone else&apos;s listing.
        </>
      ),
    },
  }[target.intent]

  async function confirm() {
    if (!listing || !target) return
    setSubmitting(true)
    setError(null)

    try {
      const origin = window.location.origin
      const session = await createBidIntent({
        product_id: listing.product_id,
        amount_cents: Math.round(amountUsd * 100),
        success_url: `${origin}/?paid=${encodeURIComponent(listing.domain)}&amount=${amountUsd}&name=${encodeURIComponent(host)}`,
        cancel_url: origin,
      })
      window.location.href = session.url
    } catch (err) {
      setSubmitting(false)
      if (err instanceof ApiError && err.status === 503) {
        setError('Payments aren\u2019t live on this board yet — check back soon.')
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not start checkout — try again.')
      }
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bid-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="bid-title">{copy.title}</h3>
        <p>{copy.body}</p>

        <div className="modal-bid-row">
          <span className="modal-bid-label">Your bid</span>
          <BidStepper value={amountUsd} min={floorUsd} onChange={setAmountUsd} />
        </div>

        {error ? (
          <p className="modal-meta modal-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={confirm} disabled={submitting}>
            {submitting ? 'Redirecting to Stripe…' : `Confirm · ${formatUsd(price)}`}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Confirms a free listing actually went live.
 *
 * This used to be a redirect straight into the bid modal, which made "Add for
 * free" read as a bait-and-switch: you added for free, and the next thing you
 * saw was a payment dialog. The listing is on the board either way — bidding
 * is an offer here, not a toll gate.
 */
export function ListedModal({
  entry,
  rankedAt,
  onClose,
  onBid,
}: {
  entry: LeaderboardEntry | null
  /** Set when the domain was already on the board in a paid slot. */
  rankedAt: number | null
  onClose: () => void
  onBid: (entry: LeaderboardEntry) => void
}) {
  useEffect(() => {
    if (!entry) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [entry, onClose])

  if (!entry) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="listed-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="listed-title">{rankedAt ? 'Already on the board' : 'You’re on the board'}</h3>
        {rankedAt ? (
          <p>
            <em>{displayHost(entry.domain)}</em> is already listed and holds a paid slot at #
            {rankedAt}. Outbid it to take that slot for yourself.
          </p>
        ) : (
          <>
            <p>
              <em>{displayHost(entry.domain)}</em> is listed for free in{' '}
              <strong>{categoryLabel(entry.category) ?? 'Other'}</strong>. It shows below the paid
              ranks until you bid.
            </p>
            <p className="modal-meta">
              {formatUsd(takePrice(0))} puts it into a ranked slot in that category.
            </p>
          </>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
          {rankedAt ? null : (
            <button type="button" className="btn btn-primary" onClick={() => onBid(entry)}>
              Take a ranked slot · {formatUsd(takePrice(0))}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Everything the board knows about one listing.
 *
 * The row can only fit a few numbers, but visitors deciding whether a listing
 * is worth a click — and founders deciding whether a slot is worth paying for
 * — want the rest: how long it has been listed, lifetime vs today's clicks,
 * and where it actually points.
 */
export function DetailsModal({
  entry,
  rank,
  yours = false,
  onClose,
  onBid,
}: {
  entry: LeaderboardEntry | null
  /** Position within the current view, or null for a free listing. */
  rank: number | null
  /** True when this browser already paid for this domain. */
  yours?: boolean
  onClose: () => void
  onBid: (entry: LeaderboardEntry) => void
}) {
  useEffect(() => {
    if (!entry) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [entry, onClose])

  if (!entry) return null

  const paid = entry.amount_cents > 0
  const price = takePrice(entry.amount_cents / 100)
  const rows: Array<[string, React.ReactNode]> = [
    ['Category', categoryLabel(entry.category) ?? 'Other'],
    [
      'Listed',
      <span key="listed" suppressHydrationWarning>
        {formatListedAt(entry.listed_at)} · {formatAge(entry.listed_at)}
      </span>,
    ],
    ['Clicks today', <span key="ct" className="num">{entry.clicks_today.toLocaleString('en-US')}</span>],
    ['Clicks all time', <span key="cl" className="num">{entry.clicks_total.toLocaleString('en-US')}</span>],
    [
      'Current bid',
      paid ? <span className="num">{formatUsd(entry.amount_cents / 100)}</span> : 'Free listing — no bid yet',
    ],
    ['Position', rank ? `#${rank}` : 'Unranked — below the paid slots'],
    [
      'Destination',
      <a key="dest" className="text-link" href={entry.domain} target="_blank" rel="sponsored noopener noreferrer nofollow">
        {displayHost(entry.domain)}
      </a>,
    ],
  ]

  const bidLabel = yours
    ? paid
      ? `Raise bid · ${formatUsd(price)}`
      : `Rank yours · ${formatUsd(price)}`
    : `Outrank with your link · ${formatUsd(price)}`

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-details"
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="details-title">{entry.name}</h3>
        <p>{entry.tagline}</p>

        <dl className="detail-grid">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onBid(entry)}>
            {bidLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function BidPlacedModal({
  open,
  domain,
  amount,
  rank,
  onClose,
}: {
  open: boolean
  domain: string
  amount: number
  /** Looked up live from the board; null if it hasn't re-ranked yet. */
  rank: number | null
  onClose: () => void
}) {
  if (!open) return null
  const host = displayHost(domain)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="placed-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="placed-title">Bid placed</h3>
        <p>
          {rank ? (
            <>
              <em>{host}</em> is now #{rank} for {formatUsd(amount)}.
            </>
          ) : (
            <>
              <em>{host}</em>&apos;s payment of {formatUsd(amount)} is confirmed — the board is
              updating now.
            </>
          )}
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Back to the board
          </button>
        </div>
      </div>
    </div>
  )
}
