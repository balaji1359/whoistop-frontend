'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'dailybid.paidDomains'

/**
 * Tracks which domains *this browser* has successfully paid to rank —
 * populated only from a real Stripe success redirect (see the `paid` query
 * param handling in MarketingPage), never fabricated. There is no real
 * account system wired into the UI yet (see backend's magic-link auth,
 * which exists but isn't connected here) — this is a lightweight, honest
 * "what did I just do" memory, not a login session.
 */
type Session = {
  paidDomains: string[]
  markPaid: (domain: string) => void
}

const SessionContext = createContext<Session | null>(null)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [paidDomains, setPaidDomains] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) setPaidDomains(JSON.parse(raw))
    } catch {
      // Private browsing / storage disabled — fine, just starts empty.
    }
  }, [])

  const markPaid = (domain: string) => {
    setPaidDomains((current) => {
      if (current.includes(domain)) return current
      const next = [...current, domain]
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignore — in-memory state still updates for this session.
      }
      return next
    })
  }

  return <SessionContext.Provider value={{ paidDomains, markPaid }}>{children}</SessionContext.Provider>
}

export function useWallet() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useWallet must be used inside WalletProvider')
  return value
}
