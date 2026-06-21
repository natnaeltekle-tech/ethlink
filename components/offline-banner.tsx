'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const updateStatus = () => setIsOffline(!navigator.onLine)

    updateStatus()
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed left-3 right-3 top-3 z-[200] mx-auto flex max-w-md items-center justify-center gap-2 rounded-md border border-amber-300/30 bg-amber-950/95 px-4 py-3 text-sm font-medium text-amber-100 shadow-lg backdrop-blur">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You are offline. Cached pages stay available; payments and chat will resume online.</span>
    </div>
  )
}
