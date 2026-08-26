const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, body?.error || `request failed with status ${res.status}`)
  }
  return (body?.data ?? body) as T
}

export type LeaderboardEntry = {
  rank: number
  product_id: string
  name: string
  domain: string
  tagline: string
  category?: string
  /** Original image location — kept for reference, not rendered. */
  logo_url?: string
  /**
   * Self-hosted 64x64 JPEG data URI, fetched and downscaled by the backend at
   * submit time. Render this in preference to `logo_url`: hotlinking the
   * original means broken thumbnails whenever a listed site 404s the image,
   * blocks hotlinking, or swaps it out.
   */
  logo_data?: string
  cta_text: string
  amount_cents: number
  /** Resets with the board each day. */
  clicks_today: number
  /** Lifetime clicks — what a visitor judging a listing actually wants. */
  clicks_total: number
  /** When the project was first listed (RFC 3339). */
  listed_at: string
}

export type Board = {
  id: string
  board_date: string
  starts_at: string
  ends_at: string
  created_at: string
}

export type BoardView = {
  board: Board
  ends_in_seconds: number
  /** Paid slots, best bid first. `slots_per_category` of them per category. */
  entries: LeaderboardEntry[]
  /**
   * Today's free listings — added for free, no bid on this board yet. They
   * carry `rank: 0` and `amount_cents: 0`; their displayed position is derived
   * from where they sit below the paid slots in their category.
   */
  unranked: LeaderboardEntry[]
  slots_per_category: number
}

export type CreateProductInput = {
  name: string
  domain: string
  tagline: string
  category?: string
  logo_url?: string
  cta_text?: string
}

export type Product = {
  id: string
  name: string
  domain: string
  tagline: string
  category?: string
  cta_text: string
  status: string
}

export type CheckoutSession = {
  url: string
  session_id: string
  bid_id: string
}

export function getBoardToday(): Promise<BoardView> {
  return request<BoardView>('/boards/today')
}

export function createProduct(input: CreateProductInput): Promise<Product> {
  return request<Product>('/products', { method: 'POST', body: JSON.stringify(input) })
}

/**
 * Creates a bid intent and returns a Stripe Checkout URL to redirect to.
 * No auth required — Stripe's own hosted page collects the payer's email.
 */
export function createBidIntent(input: {
  product_id: string
  amount_cents: number
  success_url: string
  cancel_url: string
}): Promise<CheckoutSession> {
  return request<CheckoutSession>('/bids/intent', { method: 'POST', body: JSON.stringify(input) })
}

export function boardStreamUrl(): string {
  return `${API_URL}/boards/stream`
}

/** Public click-through URL — records a click then redirects to the listing. */
export function productGoUrl(productId: string): string {
  return `${API_URL}/go/${productId}`
}
