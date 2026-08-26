'use client'

import Link from 'next/link'
import { SiteHeader } from '@/components/header'
import { useWallet } from '@/components/wallet'

export function DashboardView() {
  const wallet = useWallet()

  return (
    <div className="dash-shell">
      <SiteHeader onClaim={() => {}} />
      <div className="dash">
        <header>
          <h1>Your projects</h1>
          <p className="muted">
            Projects you&apos;ve paid to rank from this browser. A sign-in link was emailed to you after each
            payment — use it to manage a listing from any device.
          </p>
        </header>
        {wallet.paidDomains.length > 0 ? (
          <section className="dash-panel">
            <h2>Paid from this browser</h2>
            <ul className="dash-list">
              {wallet.paidDomains.map((domain) => (
                <li key={domain}>
                  <span>{domain}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="dash-panel">
            <p className="muted">Nothing yet — bid on a listing from the board and it&apos;ll show up here.</p>
          </section>
        )}
        <p style={{ marginTop: 24 }}>
          <Link className="btn btn-ghost" href="/">
            ← Back to leaderboard
          </Link>
        </p>
      </div>
    </div>
  )
}
