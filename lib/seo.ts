import type { Metadata } from 'next'

/** Canonical production origin — used for metadataBase, sitemap, and OG URLs. */
export const SITE_URL = 'https://whoistop.lol'

export const SITE_NAME = 'WhoIsTop.lol'

export const SITE_TAGLINE = "Who's on top today?"

export const SITE_DESCRIPTION =
  'Daily pay-to-rank leaderboard for startups, tools, and side projects. Bid higher to rank higher — real clicks, transparent ranking, resets every day.'

export const SITE_KEYWORDS = [
  'startup leaderboard',
  'pay to rank',
  'product hunt alternative',
  'startup directory',
  'bid for ranking',
  'whoistop',
  'daily leaderboard',
  'startup marketing',
  'get more clicks',
  'launch directory',
]

/** Shared Next.js Metadata for the root layout. */
export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'technology',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'WhoIsTop.lol — daily pay-to-rank startup leaderboard',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)', sizes: '32x32', type: 'image/png' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)', sizes: '32x32', type: 'image/png' },
      { url: '/logo-mark.png', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/logo-mark.png',
  },
  manifest: '/site.webmanifest',
  other: {
    'theme-color': '#264653',
  },
}

/** JSON-LD for Organization + WebSite (search / social rich results). */
export function siteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo-mark.png`,
        },
        description: SITE_DESCRIPTION,
        sameAs: [],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: 'en-US',
      },
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any',
        description: SITE_DESCRIPTION,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: 'Free to list. Paid bids rank higher on the daily board.',
        },
      },
    ],
  }
}
