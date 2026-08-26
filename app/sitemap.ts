import type { MetadataRoute } from 'next'
import { getBoardToday } from '@/lib/api'
import { selectableCategories } from '@/lib/data'

const BASE_URL = 'https://whoistop.lol'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const board = await getBoardToday().catch(() => null)
  const listings = board ? [...board.entries, ...board.unranked] : []

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'hourly', priority: 1 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'monthly', priority: 0.3 },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = selectableCategories.map((c) => ({
    url: `${BASE_URL}/category/${c.id}`,
    changeFrequency: 'hourly',
    priority: 0.6,
  }))

  // Dedup — a listing can theoretically appear once per board response, but
  // guard against it anyway since a duplicate <url> entry is invalid sitemap XML.
  const seen = new Set<string>()
  const productRoutes: MetadataRoute.Sitemap = []
  for (const entry of listings) {
    if (seen.has(entry.product_id)) continue
    seen.add(entry.product_id)
    productRoutes.push({
      url: `${BASE_URL}/product/${entry.product_id}`,
      lastModified: entry.listed_at,
      changeFrequency: 'daily',
      priority: entry.rank > 0 ? 0.8 : 0.4,
    })
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes]
}
