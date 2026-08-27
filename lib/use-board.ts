'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { boardStreamUrl, getBoardToday, type BoardView } from '@/lib/api'

/**
 * Live board state via Server-Sent Events — the backend pushes a fresh
 * snapshot on connect and again every time a bid is confirmed or a free
 * listing is added. EventSource reconnects on its own if the connection
 * drops, so no manual retry loop is needed here.
 *
 * `initial` is the board fetched server-side by the page component. Seeding
 * state with it means the very first render — what a crawler that doesn't
 * execute JS ever sees — already has real listings, not a loading spinner.
 */
export function useBoard(initial: BoardView | null = null) {
  const [board, setBoard] = useState<BoardView | null>(initial)
  const [error, setError] = useState<string | null>(null)
  const sourceRef = useRef<EventSource | null>(null)

  const refresh = useCallback(async () => {
    try {
      const view = await getBoardToday()
      setBoard(view)
      setError(null)
    } catch {
      // Stream reconnect or the next publish will recover.
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    // Fast first paint: don't wait on the SSE handshake for the initial view.
    // Still refetches even with server-provided `initial` — that snapshot may
    // already be stale by the time this client mounts.
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

  return { board, error, refresh }
}
