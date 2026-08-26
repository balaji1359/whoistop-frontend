'use client'

import { createContext, useContext, useState } from 'react'

type Session = {
  claimed: boolean
  claim: (domain?: string) => void
  leave: () => void
  domain: string
}

const SessionContext = createContext<Session | null>(null)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [claimed, setClaimed] = useState(false)
  const [domain, setDomain] = useState('yoursite.com')

  return (
    <SessionContext.Provider
      value={{
        claimed,
        domain,
        claim: (next) => {
          if (next) setDomain(next)
          setClaimed(true)
        },
        leave: () => setClaimed(false),
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useWallet() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useWallet must be used inside WalletProvider')
  return value
}
