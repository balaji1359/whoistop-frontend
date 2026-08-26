import type { MetadataRoute } from 'next'

const BASE_URL = 'https://whoistop.lol'

// Only the routes that exist today. Extend this once /category/[id] and
// /product/[id] pages ship — a sitemap listing pages that 404 does more harm
// than no sitemap at all.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, changeFrequency: 'hourly', priority: 1 },
    { url: `${BASE_URL}/arena`, changeFrequency: 'hourly', priority: 0.7 },
  ]
}
