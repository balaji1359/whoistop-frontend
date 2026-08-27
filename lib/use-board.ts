'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { boardStreamUrl, getBoardToday, type BoardView, type LeaderboardEntry } from '@/lib/api'

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
      setBoard((prev) => mergeBoard(prev, view))
      setError(null)
    } catch {
      // Stream reconnect or the next publish will recover.
    }
  }, [])

  /**
   * Instantly show a free listing the user just created. Never invent a
   * one-row board if state is empty — that wiped every other listing.
   */
  const upsertUnranked = useCallback((entry: LeaderboardEntry) => {
    setBoard((prev) => {
      if (!prev) return prev
      const known =
        prev.entries.some((e) => e.product_id === entry.product_id) ||
        prev.unranked.some((e) => e.product_id === entry.product_id)
      if (known) {
        return {
          ...prev,
          unranked: prev.unranked.map((e) => (e.product_id === entry.product_id ? { ...e, ...entry } : e)),
          entries: prev.entries.map((e) => (e.product_id === entry.product_id ? { ...e, ...entry } : e)),
        }
      }
      return { ...prev, unranked: [entry, ...prev.unranked] }
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    getBoardToday()
      .then((view) => {
        if (!cancelled) setBoard((prev) => mergeBoard(prev, view))
      })
      .catch(() => {})

    const source = new EventSource(boardStreamUrl())
    sourceRef.current = source

    source.addEventListener('board', (event) => {
      try {
        const view = JSON.parse((event as MessageEvent).data) as BoardView
        setBoard((prev) => mergeBoard(prev, view))
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

  return { board, error, refresh, upsertUnranked }
}

/**
 * Apply a server snapshot without erasing listings the client already shows.
 * - Reject empty snapshots when we already have rows.
 * - Keep optimistic free listings that have not appeared in the server view yet.
 */
function mergeBoard(prev: BoardView | null, next: BoardView | null): BoardView | null {
  if (!next) return prev
  const nextEntries = next.entries ?? []
  const nextUnranked = next.unranked ?? []
  const nextCount = nextEntries.length + nextUnranked.length
  const prevCount = (prev?.entries?.length ?? 0) + (prev?.unranked?.length ?? 0)
  if (nextCount === 0 && prevCount > 0) return prev

  if (!prev) {
    return {
      ...next,
      entries: nextEntries,
      unranked: nextUnranked,
      daily_top: next.daily_top ?? [],
      weekly_top: next.weekly_top ?? [],
      activity: next.activity ?? [],
    }
  }

  const nextIds = new Set([
    ...nextEntries.map((e) => e.product_id),
    ...nextUnranked.map((e) => e.product_id),
  ])
  // Optimistic free rows the server has not echoed back yet.
  const pending = prev.unranked.filter(
    (e) => e.amount_cents === 0 && !nextIds.has(e.product_id),
  )

  return {
    ...next,
    entries: nextEntries,
    unranked: pending.length > 0 ? [...pending, ...nextUnranked] : nextUnranked,
    daily_top: next.daily_top ?? [],
    weekly_top: next.weekly_top ?? [],
    activity: next.activity ?? [],
  }
}
