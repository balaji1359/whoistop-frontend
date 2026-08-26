'use client'

import Link from 'next/link'
import { useState } from 'react'
import { SiteHeader } from '@/components/header'
import { ConnectModal } from '@/components/modals'
import { listings, viewerListingDomain } from '@/lib/data'
import { formatUsd } from '@/lib/format'
import { useWallet } from '@/components/wallet'

export function DashboardView() {
  const session = useWallet()
  const [claimOpen, setClaimOpen] = useState(false)
  const yours = listings.find((item) => item.domain === viewerListingDomain) ?? listings[3]

  return (
    <div className="dash-shell">
      <SiteHeader onClaim={() => setClaimOpen(true)} />
      <div className="dash">
        <header>
          <h1>{session.claimed ? session.domain : 'Your account'}</h1>
          <p className="muted">Projects, bids, and balance — linked from the avatar menu.</p>
        </header>
        <div className="dash-grid">
          <section className="dash-panel">
            <h2>Your spot</h2>
            <ul className="dash-list">
              <li>
                <span>{yours.name} · #{yours.rank}</span>
                <b className="num">{formatUsd(yours.bid)}</b>
              </li>
            </ul>
          </section>
          <section className="dash-panel">
            <h2>Balance</h2>
            <p className="muted" style={{ marginBottom: 12 }}>Shown at bid confirmation on the board.</p>
            <button type="button" className="btn btn-secondary" onClick={() => setClaimOpen(true)}>Add funds</button>
          </section>
        </div>
        <p style={{ marginTop: 24 }}>
          <Link className="btn btn-ghost" href="/">← Back to leaderboard</Link>
        </p>
      </div>
      <ConnectModal open={claimOpen} onClose={() => setClaimOpen(false)} />
    </div>
  )
}
