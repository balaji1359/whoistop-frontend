'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SiteHeader } from '@/components/header'
import { ContactForm } from '@/components/contact-form'

export function ContactPage() {
  const router = useRouter()

  return (
    <>
      <SiteHeader onClaim={() => router.push('/')} />
      <main className="contact-page">
        <nav className="product-crumbs" aria-label="Breadcrumb">
          <Link href="/">WhoIsTop.lol</Link>
          {' › '}
          <span>Contact</span>
        </nav>
        <h1>Contact</h1>
        <p className="contact-intro">
          Questions about listing, billing, or moderation? Send a message — we read every one.
        </p>
        <ContactForm />
        <p className="product-back">
          <Link href="/">← Back to today&apos;s leaderboard</Link>
        </p>
      </main>
    </>
  )
}
