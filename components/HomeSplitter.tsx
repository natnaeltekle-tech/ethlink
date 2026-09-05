"use client"

import { Capacitor } from '@capacitor/core'
import dynamic from 'next/dynamic'

function MobileLoading() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ backgroundColor: '#0B0C15' }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-[#f5c619] border-t-transparent animate-spin" />
        <p className="text-sm text-white/60">Loading Eth-Links…</p>
      </div>
    </div>
  )
}

const MobileHome = dynamic(() => import('@/components/mobile/MobileHome'), {
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
  // Native Android/iOS always uses the mobile home UI.
  if (Capacitor.isNativePlatform()) {
    return <MobileHome services={services} />
  }

  return <>{desktopHome}</>
}
