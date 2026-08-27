export type BoardPeriod = 'all' | 'day' | 'week'

export const boardPeriods: { id: BoardPeriod; label: string }[] = [
  { id: 'all', label: 'All-time' },
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'Week' },
]

export type MarketingVariant = 'graffiti' | 'arena'

export type Category = {
  id: string
  label: string
}

/**
 * Every listing must land in one of these. `all` is a filter, never a stored
 * category — see `selectableCategories`, which is what the add form offers.
 */
export const categories: Category[] = [
  { id: 'all', label: 'All' },
  { id: 'other', label: 'Other' },
  { id: 'productivity', label: 'Productivity & Personal Tools' },
  { id: 'seo-ai', label: 'SEO & AI Visibility' },
  { id: 'people', label: 'People & Profiles' },
  { id: 'directories', label: 'Directories, Launch & Discovery' },
  { id: 'design', label: 'Design & Creative' },
  { id: 'ai-media', label: 'AI Media Generation' },
  { id: 'ai-agents', label: 'AI Agents & Infrastructure' },
  { id: 'agencies', label: 'Agencies, Studios & Services' },
  { id: 'dev-tools', label: 'Developer Tools' },
  { id: 'marketing', label: 'Marketing & Advertising' },
  { id: 'social', label: 'Social Media & Creator Tools' },
  { id: 'education', label: 'Education & Learning' },
  { id: 'games', label: 'Games & Entertainment' },
  { id: 'sales', label: 'Sales & Lead Generation' },
  { id: 'travel', label: 'Travel, Local & Lifestyle' },
  { id: 'crypto', label: 'Crypto, Web3 & Investing' },
  { id: 'domains', label: 'Domains & Web Assets' },
  { id: 'health', label: 'Health, Fitness & Wellness' },
  { id: 'leaderboards', label: 'Leaderboards & Attention Markets' },
  { id: 'media', label: 'Media & News' },
  { id: 'writing', label: 'Writing & Content' },
  { id: 'business', label: 'Business, Finance & Legal' },
  { id: 'ecommerce', label: 'Ecommerce & Retail' },
  { id: 'hiring', label: 'Hiring, Jobs & Careers' },
  { id: 'audio', label: 'Audio, Voice & Podcasting' },
  { id: 'security', label: 'Security, Privacy & Compliance' },
  { id: 'real-estate', label: 'Real Estate & Property' },
]

/** The categories the add form offers — everything except the `all` filter. */
export const selectableCategories: Category[] = categories.filter((c) => c.id !== 'all')

/** Matches the backend's product.DefaultCategory. */
export const DEFAULT_CATEGORY = 'other'

export const graffiti = {
  heroHook: 'Claim #1 for',
  heroPitch:
    'New spots start at $1. Paying less than #1 still ranks you wherever that bid can take. Your slot holds until somebody outbids you.',
  entryHint: 'Websites, X, Instagram, App Store and Google Play links supported.',
  entryHintFree: 'Add for free',
  holdNote:
    'Your slot holds until somebody outbids it. No nightly reset, no re-buying the spot you already paid for.',
}

export const arena = graffiti

export const valueStrip = [
  { title: 'Your rank keeps', body: 'Pay once. The slot is yours until somebody outbids you.' },
  { title: 'Real clicks', body: 'Every rank shows verified click counts — no vanity metrics.' },
  { title: 'Fair & transparent', body: 'Rank is the bid. No algorithm, no favorites.' },
  { title: "You're in control", body: 'Raise your bid anytime. Drop off when you want.' },
]

/** Minimum increment over the current bid, in whole dollars — mirrors the backend's MIN_INCREMENT_CENTS. */
const INCREMENT_USD = 1

export function takePrice(bidUsd: number) {
  return bidUsd + INCREMENT_USD
}

export function rowActionLabel(rank: number, bidUsd: number, isYours: boolean) {
  const price = takePrice(bidUsd)
  if (isYours) {
    return rank === 1 ? `Defend · $${price}` : `Move up · $${price}`
  }
  return `Move to #${rank} · $${price}`
}

/**
 * Hosts that identify a category on their own, regardless of the rest of the
 * URL. App Store and Google Play links are deliberately absent: the store host
 * says nothing about what the app does.
 */
const HOST_CATEGORIES: Array<[RegExp, string]> = [
  [/(^|\.)instagram\.com$/, 'people'],
  [/(^|\.)(x|twitter)\.com$/, 'people'],
  [/(^|\.)(linkedin|threads)\.(com|net)$/, 'people'],
  [/(^|\.)(github|gitlab)\.com$/, 'dev-tools'],
  [/(^|\.)(figma|dribbble|behance)\.(com|net)$/, 'design'],
  [/(^|\.)(substack|medium)\.com$/, 'writing'],
  [/(^|\.)(youtube|twitch|tiktok)\.(com|tv)$/, 'social'],
]

/**
 * Whole-token keywords, checked against the URL's words and any link-preview
 * text. Tokens, not substrings — matching `ai` as a substring put `mail`,
 * `chai` and `airbnb` in AI Agents.
 */
const KEYWORD_CATEGORIES: Array<[string, string[]]> = [
  ['ai-agents', ['ai', 'agent', 'agents', 'gpt', 'llm', 'copilot', 'chatbot', 'rag', 'inference']],
  ['ai-media', ['image', 'images', 'video', 'avatar', 'generative', 'diffusion', 'render']],
  ['dev-tools', ['dev', 'devtools', 'sdk', 'api', 'cli', 'code', 'deploy', 'debug', 'git', 'database']],
  ['design', ['design', 'ui', 'ux', 'font', 'fonts', 'icons', 'mockup', 'figma', 'brand']],
  ['seo-ai', ['seo', 'rank', 'ranking', 'backlink', 'backlinks', 'serp', 'keywords', 'visibility']],
  ['marketing', ['marketing', 'ads', 'campaign', 'growth', 'newsletter', 'email']],
  ['sales', ['sales', 'leads', 'crm', 'outreach', 'prospect', 'prospecting']],
  ['writing', ['write', 'writing', 'writer', 'blog', 'copy', 'content', 'essay', 'docs']],
  ['crypto', ['crypto', 'web3', 'nft', 'token', 'wallet', 'defi', 'onchain', 'trading']],
  ['health', ['health', 'fitness', 'workout', 'wellness', 'sleep', 'nutrition', 'meditation']],
  ['games', ['game', 'games', 'gaming', 'play', 'puzzle', 'arcade']],
  ['education', ['learn', 'learning', 'course', 'courses', 'tutor', 'study', 'school', 'quiz']],
  ['hiring', ['jobs', 'job', 'hiring', 'resume', 'cv', 'recruit', 'recruiting', 'career', 'careers']],
  ['ecommerce', ['shop', 'store', 'ecommerce', 'checkout', 'cart', 'shopify', 'retail']],
  ['audio', ['audio', 'voice', 'podcast', 'music', 'speech', 'sound', 'transcribe']],
  ['security', ['security', 'privacy', 'auth', 'encrypt', 'encryption', 'compliance', 'soc2', 'vpn']],
  ['productivity', ['notes', 'todo', 'tasks', 'calendar', 'habit', 'focus', 'productivity', 'planner']],
  ['directories', ['directory', 'directories', 'launch', 'listing', 'listings', 'discover', 'awesome']],
  ['leaderboards', ['leaderboard', 'leaderboards', 'ranking', 'rankings', 'top', 'bid', 'bids']],
  ['domains', ['domain', 'domains', 'dns', 'hosting', 'namecheap']],
  ['real-estate', ['realestate', 'property', 'rent', 'rental', 'housing', 'mortgage']],
  ['travel', ['travel', 'trip', 'trips', 'flight', 'flights', 'hotel', 'hotels', 'itinerary']],
  ['business', ['invoice', 'invoicing', 'accounting', 'tax', 'taxes', 'legal', 'contract', 'finance']],
  ['agencies', ['agency', 'studio', 'consulting', 'freelance', 'services']],
  ['media', ['news', 'media', 'press', 'magazine', 'journal']],
  ['social', ['social', 'creator', 'creators', 'influencer', 'community']],
]

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  )
}

/**
 * Best-effort category guess, used only to preselect the add form's dropdown —
 * the person adding the listing always has the final say, so a wrong guess
 * costs one click rather than filing the listing under the wrong tab forever.
 *
 * `hint` is the link-preview title and description when we have them, which is
 * a far better signal than the domain alone (`getitsigned.app` says nothing;
 * "e-signature for contracts" says plenty).
 */
export function detectCategoryFromUrl(url: string, hint = ''): string | null {
  const raw = url.trim()
  if (!raw) return null

  let host = ''
  let path = ''
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    host = parsed.hostname.replace(/^www\./, '').toLowerCase()
    path = decodeURIComponent(parsed.pathname)
  } catch {
    host = raw.toLowerCase()
  }

  for (const [pattern, category] of HOST_CATEGORIES) {
    if (pattern.test(host)) return category
  }

  // Drop the TLD so `.ai` doesn't classify every domain as an AI agent, and
  // `.design`/`.dev` don't outrank what the site actually says it does.
  const hostWords = host.split('.').slice(0, -1).join(' ')
  const tokens = tokenize(`${hostWords} ${path} ${hint}`)

  for (const [category, keywords] of KEYWORD_CATEGORIES) {
    if (keywords.some((keyword) => tokens.has(keyword))) return category
  }
  return null
}

export function categoryLabel(id?: string | null): string | null {
  if (!id) return null
  return categories.find((c) => c.id === id)?.label ?? id
}
