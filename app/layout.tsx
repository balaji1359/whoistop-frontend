import { Analytics } from '@vercel/analytics/next'
import type { Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Providers } from '@/app/providers'
import { siteJsonLd, siteMetadata } from '@/lib/seo'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ui',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-mono',
})

export const metadata = siteMetadata

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#264653' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = siteJsonLd()

  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
