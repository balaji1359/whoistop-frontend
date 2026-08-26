'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const links = [
  { href: '/', label: 'Leaderboard' },
  { href: '/#categories', label: 'Categories' },
  { href: '/#how', label: 'How it works' },
  { href: '/#how', label: 'About' },
]

export function SiteHeader({ onClaim }: { onClaim: () => void }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="site-header">
      <div className="nav">
        <Link className="logo" href="/" aria-label="WhoIsTop home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo-mark" src="/logo-mark.png" alt="" width={28} height={28} />
          WhoIsTop<span className="logo-tld">.lol</span>
        </Link>
        <nav className={open ? 'nav-links open' : 'nav-links'} aria-label="Main">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={link.label === 'Leaderboard' && pathname === '/' ? 'active' : undefined}
              aria-current={link.label === 'Leaderboard' && pathname === '/' ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="nav-right">
          <button type="button" className="btn btn-primary" onClick={onClaim}>
            + Add your project
          </button>
          <Link className="avatar" href="/dashboard" aria-label="Your projects">
            ★
          </Link>
          <button
            type="button"
            className="menu-button"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>
    </header>
  )
}
