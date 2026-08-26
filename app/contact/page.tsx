import type { Metadata } from 'next'
import { ContactPage } from '@/components/contact-page'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with WhoIsTop.lol — listing questions, billing, or moderation.',
  alternates: { canonical: 'https://whoistop.lol/contact' },
  openGraph: {
    title: 'Contact WhoIsTop.lol',
    description: 'Get in touch with WhoIsTop.lol — listing questions, billing, or moderation.',
    type: 'website',
  },
}

export default function Page() {
  return <ContactPage />
}
