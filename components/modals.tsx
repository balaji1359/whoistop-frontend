'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  categoryLabel,
  detectCategoryFromUrl,
  rowActionLabel,
  selectableCategories,
  takeLeaderLabel,
  takePrice,
} from '@/lib/data'
import { formatUsd } from '@/lib/format'
import { ApiError, createBidIntent, createProduct, type LeaderboardEntry } from '@/lib/api'
import { fetchLinkPreview, type LinkPreview } from '@/lib/link-preview'

export type BidTarget = {
  listing: LeaderboardEntry
  /** take = displace them with YOUR link; raise = bid on this product (yours) */
  mode: 'take' | 'raise'
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
          <article className="claim-preview-card">
            <div className="claim-preview-media">
              {preview.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.image} alt="" />
              ) : preview.favicon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="claim-preview-favicon" src={preview.favicon} alt="" />
              ) : (
                <div className="claim-preview-fallback">{(preview.siteName || '?').slice(0, 1).toUpperCase()}</div>
              )}
            </div>
            <div className="claim-preview-copy">
              <span className="claim-preview-host">{preview.siteName || displayHost(preview.url)}</span>
              <strong>{preview.title || 'Untitled site'}</strong>
              {preview.description ? <p>{preview.description}</p> : <p className="muted">No description found.</p>}
            </div>
          </article>
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
}: {
  open: boolean
  onClose: () => void
  onListed?: (entry: LeaderboardEntry) => void
  initialUrl?: string
}) {
  const [domain, setDomain] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { preview, previewStatus, previewError } = useLinkPreview(domain, open)
  // Detected from the URL as edited here, not the one typed on the page —
  // editing the link in this modal used to leave the stale guess attached.
  const { category, choose, reset, detected } = useCategoryChoice(domain, preview)

  useEffect(() => {
    if (!open) return
    setDomain(initialUrl)
    setError(null)
    reset()
  }, [open, initialUrl, reset])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

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
    const logoUrl = preview?.image || preview?.favicon || undefined

    setSubmitting(true)
    try {
      const product = await createProduct({
        name: resolvedName,
        domain: url,
        tagline,
        category,
        logo_url: logoUrl,
      })
      onListed?.({
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
      })
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add your project — try again.')
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
          <h3 id="claim-title">Add your project</h3>
          <p>Free to list — you’ll appear on today’s board straight away. Bid to take a ranked slot.</p>
        </div>

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
            {submitting ? 'Adding…' : 'Add for free'}
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
  const [domain, setDomain] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listing = target?.listing ?? null
  const mode = target?.mode ?? 'take'
  const needsUrl = mode === 'take'
  const { preview, previewStatus, previewError } = useLinkPreview(domain, Boolean(listing) && needsUrl)
  const { category, choose, reset, detected } = useCategoryChoice(domain, preview)
  const price = listing ? takePrice(listing.amount_cents / 100) : 0

  useEffect(() => {
    setError(null)
    setDomain('')
    setSubmitting(false)
    reset()
  }, [target, reset])

  useEffect(() => {
    if (!listing) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [listing, onClose])

  if (!listing || !target) return null

  const bidUsd = listing.amount_cents / 100
  const title =
    mode === 'raise'
      ? listing.rank === 1
        ? `Defend #1 · ${formatUsd(price)}`
        : listing.rank > 0
          ? `Raise bid · ${formatUsd(price)}`
          : `Take a ranked slot · ${formatUsd(price)}`
      : listing.rank === 1
        ? takeLeaderLabel(bidUsd)
        : rowActionLabel(listing.rank, bidUsd, false)

  async function confirm() {
    if (!listing || !target) return
    setSubmitting(true)
    setError(null)

    try {
      let productId = listing.product_id
      let paidDomain = listing.domain

      if (needsUrl) {
        const url = normalizeInputUrl(domain)
        if (!url) {
          setError('Paste your project URL — that’s what appears on the board.')
          setSubmitting(false)
          return
        }
        if (!category) {
          setError('Pick a category — it decides which board you’re ranked on.')
          setSubmitting(false)
          return
        }
        const name = preview?.title?.trim() || preview?.siteName?.trim() || deriveNameFromUrl(url)
        const tagline = (preview?.description || 'Listed on WhoIsTop').slice(0, 160)
        const product = await createProduct({
          name,
          domain: url,
          tagline,
          category,
          logo_url: preview?.image || preview?.favicon || undefined,
        })
        productId = product.id
        paidDomain = product.domain
      }

      const origin = window.location.origin
      const host = displayHost(paidDomain)
      const session = await createBidIntent({
        product_id: productId,
        amount_cents: price * 100,
        success_url: `${origin}/?paid=${encodeURIComponent(paidDomain)}&amount=${price}&rank=${listing.rank || 1}&name=${encodeURIComponent(host)}`,
        cancel_url: origin,
      })
      window.location.href = session.url
    } catch (err) {
      setSubmitting(false)
      if (err instanceof ApiError && err.status === 503) {
        setError('Payments aren’t live on this board yet — check back soon.')
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not start checkout — try again.')
      }
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal ${needsUrl ? 'modal-claim' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bid-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={needsUrl ? 'modal-claim-head' : undefined}>
          <h3 id="bid-title">{title}</h3>
          <p>
            {mode === 'raise' ? (
              listing.rank > 0 ? (
                <>
                  Raise <em>{listing.name}</em> to {formatUsd(price)} (currently #{listing.rank} at{' '}
                  {formatUsd(bidUsd)}).
                </>
              ) : (
                <>
                  <em>{listing.name}</em> is listed for free. Pay {formatUsd(price)} to move it into a
                  ranked slot in its category.
                </>
              )
            ) : (
              <>
                <em>{listing.name}</em> holds #{listing.rank || '—'} at {formatUsd(bidUsd)}. Pay{' '}
                {formatUsd(price)} and put <strong>your</strong> project in that spot.
              </>
            )}
          </p>
        </div>

        {needsUrl ? (
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
        ) : null}

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
              <em>{displayHost(entry.domain)}</em> is listed for free and live on today’s board
              right now — in <strong>{categoryLabel(entry.category) ?? 'Other'}</strong>, under the
              ranked slots. Nothing to pay.
            </p>
            <p className="modal-meta">
              {formatUsd(takePrice(0))} moves it into a ranked slot in that category, above every
              free listing.
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
  rank: number
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
          <em>{host}</em> is now #{rank || 1} for {formatUsd(amount)}.
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
