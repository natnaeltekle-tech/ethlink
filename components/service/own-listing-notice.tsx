'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeftRight, Store } from 'lucide-react'
import { useAppMode } from '@/context/AppModeContext'
import { cn } from '@/lib/utils'

/** Shown instead of booking actions when the viewer owns the listing. */
export function OwnListingNotice({ compact, className }: { compact?: boolean; className?: string }) {
    const router = useRouter()
    const { setMode } = useAppMode()
    const manage = () => { setMode('provider', { navigate: false }); router.push('/provider/services') }

    if (compact) {
        return (
            <button type="button" onClick={manage}
                className={cn('inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#FACC15]/40 bg-[#FACC15]/10 px-4 text-xs font-semibold text-[#FACC15]', className)}>
                <Store className="h-4 w-4 shrink-0" />Your listing · Manage
            </button>
        )
    }
    return (
        <div className={cn('flex items-start gap-3 rounded-2xl border border-[#FACC15]/40 bg-[#FACC15]/10 p-4 text-sm', className)}>
            <Store className="mt-0.5 h-5 w-5 shrink-0 text-[#FACC15]" />
            <div className="min-w-0 flex-1 space-y-2">
                <p><b>This is your own listing.</b> You can&apos;t book your own service.</p>
                <button type="button" onClick={manage} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#FACC15] px-4 text-xs font-bold text-black">
                    <ArrowLeftRight className="h-4 w-4" />Switch to Provider Mode to manage
                </button>
            </div>
        </div>
    )
}
