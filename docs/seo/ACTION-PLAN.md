# WhoIsTop.lol — SEO Action Plan

Prioritized fixes from audit on August 26, 2026.  
**Current score: 66/100 → Target: 82+ within 30 days**

---

## Critical (fix immediately)

### 1. Deploy pending frontend
- **Why:** Hero redesign, contact, competitor SEO pages are 404 on production
- **How:** Cloudflare Dashboard → enable R2 → `cd frontend && pnpm run deploy`
- **Effort:** 15 min (+ R2 account setup)

### 2. Fix homepage SSR for crawlers
- **Why:** `BAILOUT_TO_CLIENT_SIDE_RENDERING` — no `h1` or listing rows in HTML body; AI bots see empty page
- **How:** Extract server-rendered `<section>` for hero + listing snapshot in `app/page.tsx`; keep client layer for SSE/interactivity only. Or remove `'use client'` from top-level and isolate interactive parts.
- **Effort:** 2–4 hours
- **Impact:** +8–12 points AI readiness, +5 content

### 3. Remove base64 logos from RSC payload
- **Why:** Homepage HTML swells with inline JPEG data URIs for every listing
- **How:** Pass `logo_url` only to SSR; reserve `logo_data` for client hydration if needed
- **Effort:** 1–2 hours
- **Impact:** Performance + crawl budget

---

## High (within 1 week)

### 4. Align “daily” → “standing / pay-to-rank” in all metadata
- **Files:** `lib/seo.ts`, `site.webmanifest`, OG alt text, default title
- **Example title:** `WhoIsTop — pay-to-rank startup leaderboard`
- **Effort:** 30 min

### 5. `noindex` utility pages
- **`/dashboard`:** `robots: { index: false }` in page metadata
- **`/arena`:** add `robots: { index: false }` (canonical already points to `/`)
- **Effort:** 15 min

### 6. Footer with internal links
- Contact · Product Hunt alternatives · WhoIsTop vs Outbid · How it works
- **Effort:** 1 hour

### 7. Sitemap quality gate for categories
- Only include category URLs with ≥1 listing (ranked or free)
- **Effort:** 30 min

### 8. Public trust pages
- `/terms`, `/privacy` (required for paid product + E-E-A-T)
- Link from footer + Organization schema `contactPoint`
- **Effort:** 2 hours (content + pages)

---

## Medium (within 1 month)

### 9. BreadcrumbList JSON-LD
- Product + category pages already have visual breadcrumbs
- **Effort:** 1 hour

### 10. FAQ schema on homepage or /how
- “How does pay-to-rank work?”, “Does my rank reset daily?”, “Can I list for free?”
- **Effort:** 2 hours

### 11. Update `llms.txt`
- Add compare/alternatives/contact URLs
- Note standing-rank vs “daily” wording
- **Effort:** 20 min

### 12. Organization `sameAs`
- Add X/Twitter, GitHub, or founder profile when available
- **Effort:** 10 min

### 13. Submit sitemap to Google Search Console
- Verify domain, submit `https://whoistop.lol/sitemap.xml`
- **Effort:** 30 min (one-time)

### 14. Competitor page expansion (after deploy)
- `/alternatives/outbid`
- `/compare/pay-to-rank-leaderboards` roundup
- **Effort:** 2–3 hours

---

## Low (backlog)

- hreflang (single locale — skip until i18n)
- AggregateRating schema (only when real reviews exist)
- Blog / “launch playbook” content for topical authority
- PageSpeed: self-host fonts subset, audit third-party scripts
- PDF audit report via `scripts/google_report.py` when GSC connected

---

## Measurement

After Critical + High fixes, re-audit expecting:
- Technical: 64 → 82
- Content: 62 → 75
- On-Page: 68 → 80
- AI Readiness: 70 → 88
- **Projected score: ~82/100**

Track in GSC (when connected):
- Impressions for “product hunt alternative”, “pay to rank leaderboard”
- Index coverage for `/product/*`, `/compare/*`
- Crawl stats for homepage vs product pages
