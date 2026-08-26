'use client'

import { ApiError, createBidIntent, type LeaderboardEntry } from '@/lib/api'

function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Create a Stripe Checkout session and leave the page — no intermediate
 * "confirm" dialog. Callers show their own error if this throws.
 */
export async function startCheckout(listing: LeaderboardEntry, amountCents: number): Promise<void> {
  const origin = window.location.origin
  const host = displayHost(listing.domain)
  const amountUsd = amountCents / 100
  const session = await createBidIntent({
    product_id: listing.product_id,
    amount_cents: amountCents,
    success_url: `${origin}/?paid=${encodeURIComponent(listing.domain)}&amount=${amountUsd}&name=${encodeURIComponent(host)}`,
    cancel_url: origin,
  })
  window.location.href = session.url
}

export function checkoutErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 503) {
    return 'Payments aren’t live on this board yet — check back soon.'
  }
  if (err instanceof ApiError) return err.message
  return 'Could not start checkout — try again.'
}
