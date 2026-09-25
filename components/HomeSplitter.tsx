"use client"

import { useEffect, useState } from "react"
import { Capacitor } from "@capacitor/core"
import MobileHome from "@/components/mobile/MobileHome"

/**
 * On native Android/iOS, always render MobileHome.
 * On web, render the desktop home.
 *
 * Important: do NOT dynamic-import MobileHome here.
 * A failed chunk load on mobile networks caused a permanent black screen
 * because loading fell back to an empty dark frame.
 */
export default function HomeSplitter({
  services = [],
  desktopHome,
}: {
  services?: any[]
  desktopHome: React.ReactNode
}) {
  const [isNative, setIsNative] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      setIsNative(Capacitor.isNativePlatform())
    } catch {
      setIsNative(false)
    }
    setReady(true)
  }, [])

  // First paint: avoid flashing wrong layout; show a visible loader, never blank black
  if (!ready) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{ backgroundColor: "#0B0C15" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-[#f5c619] border-t-transparent animate-spin" />
          <p className="text-sm text-white/70">Loading Eth-Links…</p>
        </div>
      </div>
    )
  }

  if (isNative) {
    return <MobileHome services={services} />
  }

  return <>{desktopHome}</>
}
