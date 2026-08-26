'use client'

import { useEffect, useState } from 'react'
import { midnightUtcCountdownSeconds } from '@/lib/data'
import { formatClock } from '@/lib/format'

export function useCountdown(initial?: number) {
  const [left, setLeft] = useState(initial ?? midnightUtcCountdownSeconds())

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLeft((current) => (current > 0 ? current - 1 : midnightUtcCountdownSeconds()))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  return formatClock(left)
}
