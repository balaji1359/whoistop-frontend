export type Listing = {
  rank: number
  domain: string
  name: string
  tagline: string
  category: string
  bid: number
  bidDelta: number
  clicks24h: number
  mark: string
}

export type MarketingVariant = 'graffiti' | 'arena'

export type Category = {
  id: string
  label: string
  floorBid: number
}

export const categories: Category[] = [
  { id: 'all', label: 'All', floorBid: 62 },
  { id: 'other', label: 'Other', floorBid: 21 },
  { id: 'productivity', label: 'Productivity & Personal Tools', floorBid: 17 },
  { id: 'seo-ai', label: 'SEO & AI Visibility', floorBid: 12 },
  { id: 'people', label: 'People & Profiles', floorBid: 8 },
  { id: 'directories', label: 'Directories, Launch & Discovery', floorBid: 3 },
  { id: 'design', label: 'Design & Creative', floorBid: 1 },
  { id: 'ai-media', label: 'AI Media Generation', floorBid: 0 },
  { id: 'ai-agents', label: 'AI Agents & Infrastructure', floorBid: 0 },
  { id: 'agencies', label: 'Agencies, Studios & Services', floorBid: 0 },
  { id: 'dev-tools', label: 'Developer Tools', floorBid: 0 },
  { id: 'marketing', label: 'Marketing & Advertising', floorBid: 0 },
  { id: 'social', label: 'Social Media & Creator Tools', floorBid: 0 },
  { id: 'education', label: 'Education & Learning', floorBid: 0 },
  { id: 'games', label: 'Games & Entertainment', floorBid: 0 },
  { id: 'sales', label: 'Sales & Lead Generation', floorBid: 0 },
  { id: 'travel', label: 'Travel, Local & Lifestyle', floorBid: 0 },
  { id: 'crypto', label: 'Crypto, Web3 & Investing', floorBid: 0 },
  { id: 'domains', label: 'Domains & Web Assets', floorBid: 0 },
  { id: 'health', label: 'Health, Fitness & Wellness', floorBid: 0 },
  { id: 'leaderboards', label: 'Leaderboards & Attention Markets', floorBid: 0 },
  { id: 'media', label: 'Media & News', floorBid: 0 },
  { id: 'writing', label: 'Writing & Content', floorBid: 0 },
  { id: 'business', label: 'Business, Finance & Legal', floorBid: 0 },
  { id: 'ecommerce', label: 'Ecommerce & Retail', floorBid: 0 },
  { id: 'hiring', label: 'Hiring, Jobs & Careers', floorBid: 0 },
  { id: 'audio', label: 'Audio, Voice & Podcasting', floorBid: 0 },
  { id: 'security', label: 'Security, Privacy & Compliance', floorBid: 0 },
  { id: 'real-estate', label: 'Real Estate & Property', floorBid: 0 },
]

export const listings: Listing[] = [
  { rank: 1, domain: 'novaai.com', name: 'NovaAI', tagline: 'AI copilot for teams that writes, summarizes, and automates work.', category: 'AI Agents & Infrastructure', bid: 18, bidDelta: 0, clicks24h: 63, mark: 'N' },
  { rank: 2, domain: 'taskhive.io', name: 'TaskHive', tagline: 'Project management built for async teams.', category: 'Productivity & Personal Tools', bid: 14, bidDelta: 1, clicks24h: 24, mark: 'T' },
  { rank: 3, domain: 'finch.app', name: 'Finch', tagline: 'Private personal finance for iPhone.', category: 'Business, Finance & Legal', bid: 13, bidDelta: -1, clicks24h: 19, mark: 'F' },
  { rank: 4, domain: 'querykit.dev', name: 'QueryKit', tagline: 'SQL analytics for product teams without a data stack.', category: 'Developer Tools', bid: 9, bidDelta: 0, clicks24h: 31, mark: 'Q' },
  { rank: 5, domain: 'leafspace.io', name: 'LeafSpace', tagline: 'Calm focus rooms for remote teams.', category: 'Productivity & Personal Tools', bid: 8, bidDelta: 1, clicks24h: 26, mark: 'L' },
  { rank: 6, domain: 'automatenow.ai', name: 'AutomateNow', tagline: 'No-code workflow automation for ops teams.', category: 'AI Agents & Infrastructure', bid: 7, bidDelta: 0, clicks24h: 22, mark: 'A' },
  { rank: 7, domain: 'clipgen.co', name: 'ClipGen', tagline: 'Turn long videos into short clips automatically.', category: 'AI Media Generation', bid: 6, bidDelta: 0, clicks24h: 18, mark: 'C' },
  { rank: 8, domain: 'invoicehub.com', name: 'InvoiceHub', tagline: 'Invoicing that chases payments for you.', category: 'Business, Finance & Legal', bid: 5, bidDelta: 0, clicks24h: 15, mark: 'I' },
  { rank: 9, domain: 'securevault.io', name: 'SecureVault', tagline: 'Secrets management for small engineering teams.', category: 'Security, Privacy & Compliance', bid: 4, bidDelta: 0, clicks24h: 12, mark: 'S' },
]

/** Demo: row shown as the viewer's own project */
export const viewerListingDomain = 'querykit.dev'

export const graffiti = {
  heroTitle: 'Who\'s on top today?',
  heroSub: 'A daily leaderboard for startups. More eyes. More clicks. More growth.',
  entryHint: 'Websites, X, Instagram, App Store and Google Play links supported. Everyone starts at $1.',
  resetNote: 'Resets daily at 00:00 UTC',
}

export const arena = graffiti

export const liveActivity = [
  { name: 'NovaAI', action: 'took the #1 spot', time: '2m ago' },
  { name: 'TaskHive', action: 'outbid Finch for #2', time: '3m ago' },
  { name: 'QueryKit', action: 'moved up to #4', time: '5m ago' },
  { name: 'LeafSpace', action: 'added to the board', time: '8m ago' },
  { name: 'ClipGen', action: 'climbed to #7', time: '12m ago' },
]

export const valueStrip = [
  { title: 'Daily exposure', body: 'Thousands of founders check the board every day.' },
  { title: 'Real clicks', body: 'Every rank shows verified click counts — no vanity metrics.' },
  { title: 'Fair & transparent', body: 'Rank is the bid. No algorithm, no favorites.' },
  { title: 'You\'re in control', body: 'Raise your bid anytime. Drop off when you want.' },
]

export function takePrice(bid: number) {
  return bid + 1
}

export function takeLeaderLabel(bid: number) {
  return `Take #1 for $${takePrice(bid)}`
}

export function rowActionLabel(listing: Listing, isYours: boolean) {
  const price = takePrice(listing.bid)
  if (isYours) {
    return listing.rank === 1 ? `Defend · $${price}` : `Move up · $${price}`
  }
  return `Move to #${listing.rank} · $${price}`
}

export function detectCategoryFromUrl(url: string): string {
  const value = url.toLowerCase()
  if (value.includes('instagram.com') || value.includes('x.com') || value.includes('twitter.com')) {
    return 'People & Profiles'
  }
  if (value.includes('apps.apple.com') || value.includes('play.google.com')) {
    return 'Mobile'
  }
  if (value.includes('ai') || value.includes('gpt')) return 'AI Agents & Infrastructure'
  if (value.includes('design') || value.includes('figma')) return 'Design & Creative'
  if (value.includes('dev') || value.includes('github')) return 'Developer Tools'
  return 'Other'
}

export function midnightUtcCountdownSeconds() {
  const now = new Date()
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  return Math.max(0, Math.floor((end - now.getTime()) / 1000))
}
