'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Prefetches the /services/new route for instant navigation
 * Include this component on pages where users are likely to click the "Add" button
 */
export function PrefetchAddRoute() {
  const router = useRouter()

  useEffect(() => {
    router.prefetch('/services/new')
  }, [router])

  return null
}
