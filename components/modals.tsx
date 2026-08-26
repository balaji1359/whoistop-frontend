'use client'

import { useEffect, useState } from 'react'
import { rowActionLabel, takeLeaderLabel, takePrice, type Listing } from '@/lib/data'
import { formatUsd } from '@/lib/format'
import { useWallet } from '@/components/wallet'

export function ConnectModal({
  open,
  onClose,
  initialUrl = '',
  detectedCategory,
}: {
  open: boolean
  onClose: () => void
  initialUrl?: string
  detectedCategory?: string | null
}) {
  const session = useWallet()
  const [domain, setDomain] = useState('')

  useEffect(() => {
    if (open) setDomain(initialUrl)
  }, [open, initialUrl])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="claim-title" onClick={(event) => event.stopPropagation()}>
        <h3 id="claim-title">Add your project</h3>
        <p>Listing is free. Bid for a rank once your project is on the board.</p>
        <label className="bid-field">
          Project URL
          <input
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="yoursite.com"
          />
        </label>
        {detectedCategory ? (
          <p className="modal-meta">Category detected: <strong>{detectedCategory}</strong> — change after listing.</p>
        ) : null}
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              session.claim(domain || 'yoursite.com')
              onClose()
            }}
          >
            Add for free
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export function BidModal({
  listing,
  onClose,
}: {
  listing: Listing | null
  onClose: () => void
}) {
  const [done, setDone] = useState(false)
  const session = useWallet()
  const price = listing ? takePrice(listing.bid) : 0
  const yours = listing ? session.claimed && session.domain === listing.domain : false

  useEffect(() => {
    setDone(false)
  }, [listing])

  if (!listing) return null

  const title = listing.rank === 1
    ? takeLeaderLabel(listing.bid)
    : rowActionLabel(listing, yours)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="bid-title" onClick={(event) => event.stopPropagation()}>
        {done ? (
          <>
            <h3 id="bid-title">Bid placed</h3>
            <p>
              <em>{session.domain || listing.name}</em> is now #{listing.rank} for {formatUsd(price)}.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Back to the board</button>
            </div>
          </>
        ) : (
          <>
            <h3 id="bid-title">{title}</h3>
            <p>
              {listing.name} holds #{listing.rank} at {formatUsd(listing.bid)}.
              Pay {formatUsd(price)} to take that rank.
            </p>
            <p className="modal-meta">Balance: $0.00 — add funds to confirm.</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (!session.claimed) session.claim(listing.domain)
                  setDone(true)
                }}
              >
                Confirm · {formatUsd(price)}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
