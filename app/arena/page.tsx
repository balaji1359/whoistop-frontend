import { Suspense } from 'react'
import { MarketingPage } from '@/components/marketing-page'

export default function ArenaPage() {
  return (
    <Suspense>
      <MarketingPage variant="arena" />
    </Suspense>
  )
}
