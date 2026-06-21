"use client"

import { Capacitor } from '@capacitor/core'
import dynamic from 'next/dynamic'

const MobileHome = dynamic(() => import('@/components/mobile/MobileHome'), {
  ssr: false,
  loading: () => null,
})

export default function HomeSplitter({ 
  services = [], 
  desktopHome 
}: { 
  services?: any[], 
  desktopHome: React.ReactNode 
}) {
  if (Capacitor.isNativePlatform()) {
    return <MobileHome services={services} />
  }

  return <>{desktopHome}</>
}
