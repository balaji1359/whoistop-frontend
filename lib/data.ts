export type MarketingVariant = 'graffiti' | 'arena'

export type Category = {
  id: string
  label: string
}

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

export const graffiti = {
  heroTitle: "Who's on top today?",
  heroSub: 'A daily leaderboard for startups. More eyes. More clicks. More growth.',
  entryHint: 'Websites, X, Instagram, App Store and Google Play links supported. Everyone starts at $1.',
  resetNote: 'Resets daily at 00:00 UTC',
}

export const arena = graffiti

export const valueStrip = [
  { title: 'Daily exposure', body: 'Thousands of founders check the board every day.' },
  { title: 'Real clicks', body: 'Every rank shows verified click counts — no vanity metrics.' },
  { title: 'Fair & transparent', body: 'Rank is the bid. No algorithm, no favorites.' },
  { title: "You're in control", body: 'Raise your bid anytime. Drop off when you want.' },
]

/** Minimum increment over the current bid, in whole dollars — mirrors the backend's MIN_INCREMENT_CENTS. */
const INCREMENT_USD = 1

export function takePrice(bidUsd: number) {
  return bidUsd + INCREMENT_USD
}

export function takeLeaderLabel(bidUsd: number) {
  return `Take #1 for $${takePrice(bidUsd)}`
}

export function rowActionLabel(rank: number, bidUsd: number, isYours: boolean) {
  const price = takePrice(bidUsd)
  if (isYours) {
    return rank === 1 ? `Defend · $${price}` : `Move up · $${price}`
  }
  return `Move to #${rank} · $${price}`
}

export function detectCategoryFromUrl(url: string): string | null {
  const value = url.toLowerCase()
  if (value.includes('instagram.com') || value.includes('x.com') || value.includes('twitter.com')) {
    return 'people'
  }
  if (value.includes('ai') || value.includes('gpt')) return 'ai-agents'
  if (value.includes('design') || value.includes('figma')) return 'design'
  if (value.includes('dev') || value.includes('github')) return 'dev-tools'
  return null
}

export function categoryLabel(id?: string | null): string | null {
  if (!id) return null
  return categories.find((c) => c.id === id)?.label ?? id
}
