'use client'

import { useEffect, useState } from 'react'
import { formatClock } from '@/lib/format'

function midnightUtcCountdownSeconds() {
  const now = new Date()
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  return Math.max(0, Math.floor((end - now.getTime()) / 1000))
}

/**
 * Ticks down from the server-reported `ends_in_seconds` for today's board.
 * Falls back to a locally-computed midnight-UTC countdown until the first
 * live board snapshot arrives, so the hero clock never shows a blank state.
 */
export function useCountdown(endsInSeconds?: number) {
  const [left, setLeft] = useState(endsInSeconds ?? midnightUtcCountdownSeconds())

  useEffect(() => {
    if (typeof endsInSeconds === 'number') setLeft(endsInSeconds)
  }, [endsInSeconds])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLeft((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  return formatClock(left)
}
