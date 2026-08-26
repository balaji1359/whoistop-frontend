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
  /** Clicks since 00:00 UTC — the only number here that still resets daily. */
  clicks_today: number
  /** Lifetime clicks — what a visitor judging a listing actually wants. */
  clicks_total: number
  /** When the project was first listed (RFC 3339). */
  listed_at: string
}

/**
 * One line of the board's activity feed — a move somebody paid to make.
 * `name`/`domain` are the values recorded at the time of the event, not
 * today's: the feed is history, so a renamed listing keeps the name it took
 * the slot under.
 */
export type ActivityItem = {
  product_id: string
  name: string
  domain: string
  logo_url?: string
  logo_data?: string
  /** `entered` took a slot it didn't hold; `raised` paid more to move up. */
  event_type: 'entered' | 'raised'
  rank: number
  amount_cents: number
  /** RFC 3339. */
  occurred_at: string
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
  /**
   * Paid slots, best bid first. `slots_per_category` of them per category.
   * A slot holds until somebody outbids it — nothing here expires on a clock,
   * which is why there is no countdown in this payload.
   */
  entries: LeaderboardEntry[]
  /**
   * Everything shown below the ranked slots: free listings (never paid for,
   * `amount_cents: 0`) and paid listings that overflowed their category's
   * slots (which keep their real `amount_cents`). Both carry `rank: 0`; their
   * displayed position comes from where they sit in their category.
   */
  unranked: LeaderboardEntry[]
  /** Standing bids placed in the last 24 hours, best first. */
  daily_top: LeaderboardEntry[]
  /** Standing bids placed in the last 7 days, best first. */
  weekly_top: LeaderboardEntry[]
  /**
   * The most recent paid moves. Rides the board payload rather than a separate
   * fetch so it updates over the same SSE stream — a confirmed bid is both a
   * board change and a new feed line. `getActivity` pages further back.
   */
  activity: ActivityItem[]
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

export function getActivity(limit = 30, offset = 0): Promise<ActivityItem[]> {
  return request<ActivityItem[]>(`/boards/activity?limit=${limit}&offset=${offset}`)
}

export function getProduct(id: string): Promise<Product> {
  return request<Product>(`/products/${id}`)
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
