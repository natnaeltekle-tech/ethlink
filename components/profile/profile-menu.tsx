'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ChevronRight, CreditCard, HelpCircle, Loader2, LogOut, Settings, ShieldCheck, type LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { safeSignOut } from '@/lib/actions'
import { unregisterPushBeforeLogout } from '@/lib/native/push'
import { MODE_STORAGE_KEY } from '@/lib/app-mode'

const MobilePaymentMethods = dynamic(() => import('@/components/mobile/MobilePaymentMethods'))
const MobileHelpSupport = dynamic(() => import('@/components/mobile/MobileHelpSupport'))

type Row = 'payment' | 'settings' | 'verification' | 'support'

/** Account list rows shared by both profiles. Payment methods / Support open as full-screen panels. */
export function ProfileMenu({ rows }: { rows: Row[] }) {
    const [overlay, setOverlay] = useState<'payment' | 'help' | null>(null)
    const [loggingOut, setLoggingOut] = useState(false)

    const logout = async () => {
        if (loggingOut) return
        setLoggingOut(true)
        try {
            await unregisterPushBeforeLogout()
            await createClient().auth.signOut()
            await safeSignOut()
        } catch { /* always redirect */ }
        try { localStorage.removeItem(MODE_STORAGE_KEY) } catch { /* ignore */ }
        window.location.href = '/auth/login'
    }

    if (overlay) {
        const Comp = overlay === 'payment' ? MobilePaymentMethods : MobileHelpSupport
        return <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#0B0C15]"><Comp onClose={() => setOverlay(null)} /></div>
    }

    const row = 'flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-sm font-medium hover:bg-secondary/60'
    const item = (icon: LucideIcon, label: string) => {
        const Icon = icon
        return <><Icon className="h-5 w-5 shrink-0 text-primary" /><span className="flex-1">{label}</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></>
    }

    return (
        <section className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {rows.includes('verification') && <Link href="/services/new" className={row}>{item(ShieldCheck, 'Identity verification')}</Link>}
            {rows.includes('payment') && <button type="button" onClick={() => setOverlay('payment')} className={row}>{item(CreditCard, 'Payment methods')}</button>}
            {rows.includes('settings') && <Link href="/profile/settings" className={row}>{item(Settings, 'Account settings')}</Link>}
            {rows.includes('support') && <button type="button" onClick={() => setOverlay('help')} className={row}>{item(HelpCircle, 'Help & support')}</button>}
            <button type="button" onClick={logout} disabled={loggingOut} className={`${row} text-red-500`}>
                {loggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}Log out
            </button>
        </section>
    )
}
