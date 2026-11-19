'use client'

import { ArrowLeftRight } from 'lucide-react'
import { useAppMode } from '@/context/AppModeContext'
import type { AppMode } from '@/lib/app-mode'

/**
 * Airbnb-style floating switch, centred just above the bottom navigation
 * (in the page flow on desktop, where there is no bottom bar).
 */
export function ModeSwitchPill({ to }: { to: AppMode }) {
    const { setMode } = useAppMode()
    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-50 flex justify-center md:static md:mt-6">
            <button type="button" onClick={() => setMode(to)}
                className="pointer-events-auto inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#FACC15] px-5 text-sm font-bold text-black shadow-[0_8px_24px_rgba(0,0,0,0.45)] active:scale-95">
                <ArrowLeftRight className="h-4 w-4" />
                {to === 'provider' ? 'Switch to provider' : 'Switch to customer'}
            </button>
        </div>
    )
}
