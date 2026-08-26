'use client'

import { useEffect, useRef, useState } from 'react'
import { boardStreamUrl, getBoardToday, type BoardView } from '@/lib/api'

/**
 * Live board state via Server-Sent Events — the backend pushes a fresh
 * snapshot on connect and again every time a bid is confirmed. EventSource
 * reconnects on its own if the connection drops, so no manual retry loop
 * is needed here.
 */
export function useBoard() {
  const [board, setBoard] = useState<BoardView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    let cancelled = false

    // Fast first paint: don't wait on the SSE handshake for the initial view.
    getBoardToday()
      .then((view) => {
        if (!cancelled) setBoard(view)
      })
      .catch(() => {
        // The stream connecting successfully will recover from this.
      })

    const source = new EventSource(boardStreamUrl())
    sourceRef.current = source

    source.addEventListener('board', (event) => {
      try {
        const view = JSON.parse((event as MessageEvent).data) as BoardView
        setBoard(view)
        setError(null)
      } catch {
        // Ignore a malformed frame; the next push will correct state.
      }
    })

    source.onerror = () => {
      setError('Live updates interrupted — reconnecting…')
    }

    return () => {
      cancelled = true
      source.close()
    }
  }, [])

  return { board, error }
}
