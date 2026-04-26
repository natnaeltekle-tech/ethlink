"use client"

import { Capacitor } from '@capacitor/core'
import MobileHome from '@/components/mobile/MobileHome'

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
