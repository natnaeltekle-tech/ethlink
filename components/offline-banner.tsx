'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { Handshake, Loader2, WifiOff } from 'lucide-react'

/**
 * Connection status.
 * - Android app: @capacitor/network drives a full-screen branded overlay, so a
 *   tap can't trigger a page load that would fail. It closes and refreshes the
 *   page when the connection returns. (If the app *starts* offline, the bundled
 *   mobile-shell/offline.html is shown instead — see capacitor.config.ts.)
 * - Web: a small banner from the browser's online/offline events.
 */
export function OfflineBanner() {
  const router = useRouter()
  const [native, setNative] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [checking, setChecking] = useState(false)
  const wasOffline = useRef(false)

  const apply = useCallback((offline: boolean) => {
    setIsOffline(offline)
    if (!offline && wasOffline.current) router.refresh() // reload data missed while offline
    wasOffline.current = offline
  }, [router])

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform()
    setNative(isNative)
    let cleanup: (() => void) | undefined

    if (isNative) {
      let alive = true
      import('@capacitor/network')
        .then(async ({ Network }) => {
          const status = await Network.getStatus()
          if (alive) apply(!status.connected)
          const handle = await Network.addListener('networkStatusChange', (s) => apply(!s.connected))
          cleanup = () => void handle.remove()
          if (!alive) cleanup()
        })
        .catch(() => {
          // Plugin missing in an older APK: fall back to browser events below.
          const update = () => apply(!navigator.onLine)
          update()
          window.addEventListener('online', update)
          window.addEventListener('offline', update)
          cleanup = () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
        })
      return () => { alive = false; cleanup?.() }
    }

    const update = () => apply(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [apply])

  const retry = async () => {
    setChecking(true)
    try {
      const { Network } = await import('@capacitor/network')
      const s = await Network.getStatus()
      apply(!s.connected)
    } catch {
      apply(!navigator.onLine)
    } finally {
      setTimeout(() => setChecking(false), 600)
    }
  }

  if (!isOffline) return null

  if (native) {
    return (
      <div role="alertdialog" aria-modal="true" aria-labelledby="offline-title"
        className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-5 bg-[#0B0C15] px-6 pb-[env(safe-area-inset-bottom)] text-center text-white">
        <div className="flex items-center gap-2 text-xl font-extrabold text-[#f5c619]"><Handshake className="h-7 w-7" />Eth-Links</div>
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5"><WifiOff className="h-9 w-9 text-[#f5c619]" /></div>
        <h2 id="offline-title" className="text-xl font-bold">No internet connection</h2>
        <p className="max-w-xs text-sm text-slate-400">Check your mobile data or Wi-Fi. Your bookings and payments are safe — we&apos;ll reconnect automatically.</p>
        <button type="button" onClick={retry} disabled={checking}
          className="inline-flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-[#f5c619] font-bold text-[#0B0C15] disabled:opacity-70">
          {checking && <Loader2 className="h-4 w-4 animate-spin" />}Tap to Retry
        </button>
      </div>
    )
  }

  return (
    <div className="fixed left-3 right-3 top-3 z-[200] mx-auto flex max-w-md items-center justify-center gap-2 rounded-md border border-amber-300/30 bg-amber-950/95 px-4 py-3 text-sm font-medium text-amber-100 shadow-lg backdrop-blur">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You are offline. Payments and chat will resume when you&apos;re back online.</span>
    </div>
  )
}
