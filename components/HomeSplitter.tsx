"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Capacitor } from "@capacitor/core"

function MobileLoading() {
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

// Dynamic + ssr:false keeps MobileHome (and leaflet/map deps) out of the
// server typecheck graph — static import of this tree broke the Vercel build.
const MobileHome = dynamic(() => import("@/components/mobile/MobileHome"), {
  ssr: false,
  loading: () => <MobileLoading />,
})

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

  if (!ready) {
    return <MobileLoading />
  }

  if (isNative) {
    return <MobileHome services={services} />
  }

  return <>{desktopHome}</>
}
