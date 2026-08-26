import { Suspense } from 'react'
import { MarketingPage } from '@/components/marketing-page'

export default function Page() {
  return (
    <Suspense>
      <MarketingPage variant="graffiti" />
    </Suspense>
  )
}
