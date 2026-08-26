# WhoIsTop.lol — Full SEO Audit

**URL:** https://whoistop.lol  
**Date:** August 26, 2026  
**Business type:** B2B SaaS / attention marketplace (pay-to-rank startup leaderboard)  
**Overall SEO Health Score:** **66 / 100**

---

## Executive Summary

WhoIsTop.lol has a solid SEO foundation for a young product: server-rendered product and category pages, dynamic sitemap, `robots.txt`, `llms.txt`, OG/Twitter cards, and JSON-LD on key templates. The biggest gap is **homepage crawlability** — the main leaderboard UI bails out to client-side rendering on Cloudflare, so listing rows and the hero H1 are not in the static HTML body (only in RSC payload + ItemList JSON-LD). That hurts AI crawlers and any bot that skips JavaScript.

**Top 5 critical issues**
1. Homepage `BAILOUT_TO_CLIENT_SIDE_RENDERING` — listing content not in HTML body
2. RSC payload embeds base64 logo JPEGs inline — bloated HTML (~75KB+ per logo)
3. Latest code (hero redesign, competitor pages) **not deployed** to production (R2 deploy blocked)
4. Global copy says **“daily startup leaderboard”** while product is **standing rank** — E-E-A-T / trust mismatch
5. `/dashboard` is indexable with no metadata and thin utility content

**Top 5 quick wins**
1. Enable Cloudflare R2 and deploy pending frontend (`pnpm run deploy`)
2. Add footer links: Contact, Compare, Alternatives (internal link equity)
3. Update title/description/manifest: drop “daily”, use “pay-to-rank” / “standing rank”
4. `noindex` `/dashboard` and `/arena` (arena already canonicalized — add robots noindex for belt-and-suspenders)
5. Extend `llms.txt` with `/contact`, `/compare/*`, `/alternatives/*`

---

## Scoring Breakdown

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Technical SEO | 22% | 64 | 14.1 |
| Content Quality | 23% | 62 | 14.3 |
| On-Page SEO | 20% | 68 | 13.6 |
| Schema / Structured Data | 10% | 78 | 7.8 |
| Performance (CWV) | 10% | 52 | 5.2 |
| AI Search Readiness | 10% | 70 | 7.0 |
| Images | 5% | 58 | 2.9 |
| **Total** | | | **66** |

*Performance scored from HTML weight + architecture; no CrUX/GSC connected.*

---

## Technical SEO

### Crawlability ✅
- `robots.txt`: `Allow: /`, sitemap declared
- No accidental `Disallow` rules
- Internal links via header (Leaderboard, Categories, How it works, Contact on latest code; production may lag)

### Indexability ⚠️
- Homepage: indexable, canonical `https://whoistop.lol`
- `/arena`: canonical → `/` ✅
- `/dashboard`: indexable, no `noindex` ❌
- Compare/alternatives pages: **404 on production** (not deployed)

### Sitemap ⚠️
- Live: 33 URLs (home, contact, 28 categories, ~3 products)
- Missing on production: `/compare/*`, `/alternatives/*`
- All category URLs included even when empty → many thin pages
- `lastModified` on products ✅ (when API available)
- Intermittent 500 reported via fetch tool; `curl` returns 200 — monitor stability

### Security / infra ✅
- HTTPS via Cloudflare
- HTTP/2, reasonable cache headers (`s-maxage=30` on homepage)

### Core issue: CSR bailout
Production homepage HTML contains:
```html
<template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template>
```
Board data exists in RSC stream (`self.__next_f.push`) but **not** as semantic HTML (`listing-row`, `h1`). ItemList JSON-LD partially compensates for Google; insufficient for GPTBot/ClaudeBot/Perplexity.

---

## Content Quality

### Strengths
- Product pages: unique titles, taglines, rank/bid facts, server-rendered H1
- Category pages: intro copy explaining standing bids
- `llms.txt`: dynamic, accurate standing-rank mechanics
- Competitor pages (local only): balanced comparisons with sources

### Weaknesses
- **~25 empty category pages** indexed with boilerplate only
- Homepage body empty for non-JS crawlers
- “Daily leaderboard” in title, OG, web manifest conflicts with standing-rank product
- No About/Trust page (who runs this, refund policy, moderation)
- Organization schema `sameAs: []` — no social profiles

### E-E-A-T
- **Experience:** Real click counts, live board — good trust signals when visible
- **Expertise:** Rules explained in llms.txt; needs public /how or /rules page
- **Authoritativeness:** New domain, few backlinks (not measured — no Moz/GSC)
- **Trustworthiness:** Stripe payments implied; add Terms/Privacy links in footer

---

## On-Page SEO

| Page | Title | Meta desc | H1 in HTML | Canonical |
|------|-------|-----------|------------|-----------|
| `/` | WhoIsTop — daily startup leaderboard | ✅ | ❌ (CSR) | ✅ |
| `/product/{id}` | AfterGlow… · WhoIsTop | ✅ | ✅ | ✅ |
| `/category/{id}` | Top {cat} Today · WhoIsTop | ✅ | ✅ | ✅ |
| `/contact` | Contact · WhoIsTop | ✅ | ✅ | ✅ |
| `/compare/*` | — | — | 404 prod | — |
| `/dashboard` | default template | default | unknown | none |

### Heading structure
- Product/category pages: clean H1
- Homepage: H1 inside client component — not in static HTML

### Internal linking gaps
- No footer
- Compare/alternatives not linked from homepage (when deployed)
- Category pages link back to home ✅

---

## Schema & Structured Data

### Implemented ✅
- **Root layout:** Organization + WebSite + WebApplication (`@graph`)
- **Homepage:** ItemList (top listings)
- **Product pages:** Product + Offer (when ranked)
- **Category pages:** ItemList
- **Compare/alternatives (local):** WebPage / ItemList

### Gaps
- No `FAQPage` for “how does pay-to-rank work?”
- No `BreadcrumbList` on product/category (breadcrumbs exist visually only)
- Organization missing `sameAs`, `contactPoint`
- Product schema could add `brand`, `image` (logo URL)

### Validation
- JSON-LD escaped for XSS ✅ (`JsonLd` component)
- No duplicate conflicting types detected

---

## Performance

### Observations (lab / HTML analysis)
- Homepage HTML **very large** due to inline base64 `logo_data` in RSC payload (multiple 64×64 JPEGs embedded)
- Multiple JS chunks (Next 16 + OpenNext on Cloudflare)
- Font preloads present ✅
- No CrUX field data available

### Estimated impact
- **LCP:** Moderate risk — client-rendered hero after hydration
- **INP:** Low traffic site — likely acceptable
- **CLS:** Warm design system — likely stable

### Recommendations
- Stop serializing `logo_data` into RSC props; use URLs only in SSR path
- Split client interactivity from server-rendered listing HTML

---

## Images

- **OG image:** `/og.png` 1200×630 ✅
- **Favicons:** light/dark + 512 + apple ✅
- **Alt text:** Logo marks use `alt=""` (decorative) ✅; listing marks `aria-hidden` ✅
- **Issue:** Base64 logos in HTML payload — not `<img>` alt problem but weight problem

---

## AI Search Readiness (GEO)

| Signal | Status |
|--------|--------|
| `llms.txt` | ✅ Dynamic at `/llms.txt` |
| AI crawler access | ✅ robots Allow: / |
| Citability | ⚠️ Homepage prose not in static HTML |
| Passage-level facts | ✅ Product/category pages SSR |
| Brand mentions | ❓ Too early to measure |

**llms.txt gaps:** Does not list `/contact`, compare, alternatives, or `/arena` (intentionally de-emphasized).

---

## Crawl Summary

| URL | Status | Notes |
|-----|--------|-------|
| `/` | 200 | CSR bailout |
| `/contact` | 200 | In sitemap |
| `/robots.txt` | 200 | |
| `/sitemap.xml` | 200 | 33 URLs |
| `/llms.txt` | 200 | |
| `/product/8ab11…` | 200 | Good SSR |
| `/category/productivity` | 200 | SSR |
| `/compare/product-hunt` | 404 | Not deployed |
| `/alternatives/product-hunt` | 404 | Not deployed |
| `/arena` | 200 | Canonical → / |
| `/dashboard` | 200 | Should noindex |

---

## Local vs Production Gap

Git `main` includes (not live on whoistop.lol at audit time):
- Hero copy redesign (“Think you belong at the top?”)
- Board layout deduplication
- Contact form
- Compare + alternatives pages
- Sitemap entries for compare/alternatives

**Deploy blocked:** Cloudflare R2 error `10042` — enable R2, then `pnpm run deploy`.
