/** Last time competitor public pricing/rules were verified — show on pages. */
export const COMPARISON_AS_OF = 'August 2026'

export type ComparisonFeature = {
  label: string
  us: string
  them: string
}

export type ComparisonPage = {
  slug: string
  competitorName: string
  competitorUrl: string
  /** Primary keyword target */
  keyword: string
  title: string
  h1: string
  metaDescription: string
  intro: string
  verdict: string
  /** Honest strengths of the competitor */
  competitorStrengths: string[]
  /** Where WhoIsTop wins for a specific buyer */
  ourStrengths: string[]
  features: ComparisonFeature[]
  pricingNote: string
  sources: { label: string; url: string }[]
  relatedSlugs: string[]
}

export type AlternativeEntry = {
  name: string
  url: string
  summary: string
  pros: string[]
  cons: string[]
  bestFor: string
  pricing: string
  isUs?: boolean
}

export type AlternativesPage = {
  slug: string
  targetName: string
  keyword: string
  title: string
  h1: string
  metaDescription: string
  intro: string
  methodology: string
  entries: AlternativeEntry[]
  relatedSlugs: string[]
}

export const comparisons: Record<string, ComparisonPage> = {
  'product-hunt': {
    slug: 'product-hunt',
    competitorName: 'Product Hunt',
    competitorUrl: 'https://www.producthunt.com',
    keyword: 'Product Hunt alternative',
    title: 'WhoIsTop vs Product Hunt: pay-to-rank vs community launch (2026)',
    h1: 'WhoIsTop vs Product Hunt',
    metaDescription:
      'Compare WhoIsTop.lol and Product Hunt for startup visibility. One ranks by bid, the other by votes and curation — which fits your launch?',
    intro:
      'Product Hunt is the default launch pad for new products: free to post, ranked largely by community upvotes and editorial attention. WhoIsTop.lol is a pay-to-rank board — rank is the bid, clicks are counted on the listing, and your slot holds until somebody outbids you. They solve different problems: PH optimizes for launch-day social proof; WhoIsTop optimizes for bought attention with a transparent price.',
    verdict:
      'Choose Product Hunt when you want a free launch moment and can earn votes from an existing audience. Choose WhoIsTop when you want a legible #1 spot you can buy today, with standing rank and verified clicks — no algorithm lottery.',
    competitorStrengths: [
      'Massive built-in audience and launch-day traffic spikes',
      'Free to submit a product',
      'Strong social proof (upvotes, comments, hunter credibility)',
      'Established brand — investors and press recognize a PH launch',
    ],
    ourStrengths: [
      'Rank is explicit: highest bid is #1, not an opaque score',
      'Standing slots — your paid position holds until outbid, no nightly wipe',
      'List for free, bid from $1 to enter ranked slots',
      'Verified click counts on every listing',
      'Category boards so niche products compete in-context',
    ],
    features: [
      { label: 'How rank is decided', us: 'Bid amount (highest = #1)', them: 'Upvotes + editorial curation' },
      { label: 'Cost to list', us: 'Free', them: 'Free' },
      { label: 'Cost to rank high', us: 'Pay what the board demands (from $1)', them: 'Time + community (not direct pay)' },
      { label: 'Rank persistence', us: 'Holds until outbid', them: 'Launch-day focus; older posts fade' },
      { label: 'Click transparency', us: 'Verified click counts per listing', them: 'Not a core metric on PH' },
      { label: 'Categories', us: 'Yes — filter by vertical', them: 'Topics + collections' },
      { label: 'Best for', us: 'Buying visible #1 attention', them: 'Community launch moments' },
    ],
    pricingNote:
      'WhoIsTop: free listing, ranked bids from $1 with $1 increments (as of site rules). Product Hunt: free to launch; promoted placements and ads are separate products — check producthunt.com for current offers.',
    sources: [
      { label: 'Product Hunt', url: 'https://www.producthunt.com' },
      { label: 'WhoIsTop.lol', url: 'https://whoistop.lol' },
    ],
    relatedSlugs: ['outbid'],
  },
  outbid: {
    slug: 'outbid',
    competitorName: 'Outbid.lol',
    competitorUrl: 'https://outbid.lol',
    keyword: 'Outbid.lol alternative',
    title: 'WhoIsTop vs Outbid.lol: two pay-to-rank boards compared (2026)',
    h1: 'WhoIsTop vs Outbid.lol',
    metaDescription:
      'WhoIsTop.lol vs Outbid.lol — both are pay-to-rank startup boards. Compare pricing floors, rank persistence, and which fits early-stage bids.',
    intro:
      'Outbid.lol pioneered the August 2026 pay-to-rank wave: a public board where dollars determine order. WhoIsTop.lol uses the same core mechanic — rank is the bid — but targets founders who want a lower floor ($1 vs Outbid\'s published minimums) and standing rank that does not reset on a daily clock.',
    verdict:
      'Outbid.lol is the viral original with huge launch traffic and stricter minimum bids. WhoIsTop is the lean alternative: list free, start bidding at $1, keep your slot until someone pays more — better if you are testing attention buys without a $5+ entry ticket.',
    competitorStrengths: [
      'First-mover traffic and press during the 2026 bidding-directory wave',
      'Simple, legible rules published on outbid.lol/rules',
      'Supports products, profiles, and app links in one board',
      'Incremental raises (pay the difference when raising your own bid)',
    ],
    ourStrengths: [
      '$1 minimum bid to claim a ranked slot (vs Outbid\'s published $5 floor for new listings)',
      '$1 increment to outbid — predictable math',
      'Standing rank — no daily board reset wiping paid positions',
      'Category tabs — compete inside your vertical, not only globally',
      'Free listings always visible; paid overflow rows show real bid amounts',
    ],
    features: [
      { label: 'Ranking model', us: 'Highest bid = rank', them: 'Highest bid = rank' },
      { label: 'New listing minimum', us: '$1 to rank (free to list unranked)', them: '$5 minimum bid (per published rules)' },
      { label: 'Increment to take #1', us: '$1 above incumbent', them: '$5 above top bid (per published rules)' },
      { label: 'Daily reset', us: 'No — standing slots', them: 'Separate “today” window over rolling spend' },
      { label: 'Raise your own bid', us: 'Full new bid (replacement)', them: 'Pay difference + increment' },
      { label: 'Categories', us: 'Yes', them: 'Single global board' },
      { label: 'Click counts', us: 'Verified per listing', them: 'Public leaderboard focus' },
    ],
    pricingNote:
      'Pricing verified against Outbid\'s public rules page as of August 2026. Outbid may change minimums; confirm at outbid.lol/rules before bidding. WhoIsTop: free list, $1 minimum ranked bid, $1 increment.',
    sources: [
      { label: 'Outbid.lol rules', url: 'https://outbid.lol/rules' },
      { label: 'WhoIsTop.lol', url: 'https://whoistop.lol' },
    ],
    relatedSlugs: ['product-hunt'],
  },
}

export const alternatives: Record<string, AlternativesPage> = {
  'product-hunt': {
    slug: 'product-hunt',
    targetName: 'Product Hunt',
    keyword: 'Product Hunt alternatives',
    title: '7 Product Hunt alternatives for startup visibility (2026)',
    h1: 'Best Product Hunt alternatives in 2026',
    metaDescription:
      'Free and paid alternatives to Product Hunt for launching startups — directories, pay-to-rank boards, and community launch pads compared.',
    intro:
      'Product Hunt is not the only way to get eyes on a launch. Depending on your budget and how much control you want over rank, these alternatives range from free community posts to pay-to-rank boards where #1 has a price tag.',
    methodology:
      'Ranked by fit for indie founders and early-stage SaaS. Pricing and features checked against public sites as of August 2026. WhoIsTop.lol is our product — called out below.',
    entries: [
      {
        name: 'WhoIsTop.lol',
        url: 'https://whoistop.lol',
        summary: 'Pay-to-rank startup leaderboard. List free, bid from $1, rank holds until outbid.',
        pros: ['Transparent rank = bid', 'Standing slots', 'Verified clicks', 'Category boards'],
        cons: ['Smaller audience than PH today', 'Pay-to-play, not community votes'],
        bestFor: 'Founders who want to buy #1 visibility with clear pricing',
        pricing: 'Free list · ranked bids from $1',
        isUs: true,
      },
      {
        name: 'Product Hunt',
        url: 'https://www.producthunt.com',
        summary: 'The default daily launch platform — upvotes and curation drive rank.',
        pros: ['Huge audience', 'Free launch', 'Strong social proof'],
        cons: ['Hard to rank without an existing following', 'Launch-day spike, then fade'],
        bestFor: 'Teams ready to run a coordinated launch day',
        pricing: 'Free to launch',
      },
      {
        name: 'Outbid.lol',
        url: 'https://outbid.lol',
        summary: 'Original pay-to-rank board from the 2026 .lol bidding wave.',
        pros: ['High viral traffic', 'Simple rules', 'Profile + product URLs'],
        cons: ['Higher minimum bids ($5+ per published rules)', 'Daily “today” window separate from all-time'],
        bestFor: 'Brands chasing maximum visibility during bid wars',
        pricing: 'From $5 min bid (verify live)',
      },
      {
        name: 'BetaList',
        url: 'https://betalist.com',
        summary: 'Curated directory for early startups and beta invites.',
        pros: ['Startup-focused audience', 'Editorial curation'],
        cons: ['Queue/wait for feature', 'Not pay-to-rank'],
        bestFor: 'Pre-launch products seeking beta users',
        pricing: 'Free submit · paid expedite options',
      },
      {
        name: 'Indie Hackers',
        url: 'https://www.indiehackers.com',
        summary: 'Community for sharing launches, milestones, and build logs.',
        pros: ['Founder audience', 'Free posts', 'Long-tail discovery via discussions'],
        cons: ['No fixed #1 slot', 'Engagement-driven, not paid rank'],
        bestFor: 'Story-driven launches and builder credibility',
        pricing: 'Free',
      },
      {
        name: 'Hacker News (Show HN)',
        url: 'https://news.ycombinator.com/showhn.html',
        summary: 'Post a Show HN — rank is community upvotes on the HN front page.',
        pros: ['Elite tech audience', 'Free', 'Massive traffic if you hit front page'],
        cons: ['Unpredictable', 'Strict community norms', 'No paid placement'],
        bestFor: 'Technical products with a compelling one-liner',
        pricing: 'Free',
      },
      {
        name: 'SaaSHub',
        url: 'https://www.saashub.com',
        summary: 'Software directory with alternatives pages and category listings.',
        pros: ['SEO-friendly listings', 'Alternatives comparisons'],
        cons: ['Not a live bid board', 'Curation varies'],
        bestFor: 'Long-tail SEO and “X alternative” discovery',
        pricing: 'Free listing · paid features vary',
      },
    ],
    relatedSlugs: [],
  },
}

export function comparisonSlugs() {
  return Object.keys(comparisons)
}

export function alternativesSlugs() {
  return Object.keys(alternatives)
}
