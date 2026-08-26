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
  logo_url?: string
  cta_text: string
  amount_cents: number
  clicks_today: number
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
  entries: LeaderboardEntry[]
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
