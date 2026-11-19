'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, CalendarCheck, Home, LayoutGrid, Search, UserRound, Wallet, Wrench, type LucideIcon } from 'lucide-react'
import { useAppMode } from '@/context/AppModeContext'
import { useHaptics } from '@/lib/hooks/useHaptics'
import { isChatThreadPath } from '@/lib/hooks/use-unread-messages'
import { getNavCounts, type NavCounts } from '@/lib/actions/nav'
import { cn } from '@/lib/utils'

type Tab = { href: string; label: string; icon: LucideIcon; badge?: 'activeBookings' | 'newJobs'; match?: (p: string) => boolean }

export const CUSTOMER_TABS: Tab[] = [
    { href: '/', label: 'Home', icon: Home, match: (p) => p === '/' || p === '/home' },
    // Explore is the services catalogue (search, filters, map); /explore redirects there.
    { href: '/services', label: 'Explore', icon: Search, match: (p) => p === '/services' || p === '/explore' },
    { href: '/bookings', label: 'Bookings', icon: CalendarCheck, badge: 'activeBookings' },
    { href: '/profile', label: 'Profile', icon: UserRound, match: (p) => p.startsWith('/profile') || p.startsWith('/saved') },
]

export const PROVIDER_TABS: Tab[] = [
    { href: '/provider/overview', label: 'Overview', icon: LayoutGrid },
    { href: '/provider/jobs', label: 'Jobs', icon: Briefcase, badge: 'newJobs' },
    { href: '/provider/earnings', label: 'Earnings', icon: Wallet },
    { href: '/provider/services', label: 'Services', icon: Wrench },
    { href: '/provider/profile', label: 'Profile', icon: UserRound },
]

const EMPTY: NavCounts = { signedIn: false, isProvider: false, activeBookings: 0, newJobs: 0 }

/** Mode-aware bottom navigation (phones). Customer and provider never share tabs or badges. */
export function BottomNav() {
    const pathname = usePathname() ?? '/'
    const { mode } = useAppMode()
    const haptics = useHaptics()
    const [counts, setCounts] = useState<NavCounts>(EMPTY)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Badges: refresh on navigation and when the app returns to the foreground.
    useEffect(() => {
        const load = () => {
            if (timer.current) clearTimeout(timer.current)
            timer.current = setTimeout(() => { getNavCounts().then(setCounts).catch(() => {}) }, 300)
        }
        load()
        const onVisible = () => { if (document.visibilityState === 'visible') load() }
        document.addEventListener('visibilitychange', onVisible)
        return () => { document.removeEventListener('visibilitychange', onVisible); if (timer.current) clearTimeout(timer.current) }
    }, [pathname])

    // A conversation is full-screen with its own composer at the bottom.
    if (isChatThreadPath(pathname)) return null

    const tabs = mode === 'provider' ? PROVIDER_TABS : CUSTOMER_TABS

    return (
        <nav aria-label={mode === 'provider' ? 'Provider navigation' : 'Main navigation'}
            className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#121214] pb-[env(safe-area-inset-bottom)] md:hidden">
            <div className="flex h-16 items-stretch justify-around">
                {tabs.map((t) => {
                    const active = t.match ? t.match(pathname) : pathname === t.href || pathname.startsWith(`${t.href}/`)
                    // Signed-out visitors: account tabs go to login and come back.
                    const href = !counts.signedIn && t.href !== '/' && t.href !== '/services' ? `/auth/login?next=${encodeURIComponent(t.href)}` : t.href
                    const badge = t.badge ? counts[t.badge] : 0
                    return (
                        <Link key={t.href} href={href} prefetch onClick={() => haptics.light()}
                            aria-current={active ? 'page' : undefined}
                            className={cn('flex min-h-[44px] w-full flex-col items-center justify-center gap-1 transition-colors active:scale-95',
                                active ? 'text-[#FACC15]' : 'text-zinc-400 hover:text-zinc-200')}>
                            <span className="relative">
                                <t.icon className="h-6 w-6" strokeWidth={active ? 2.4 : 2} />
                                {badge > 0 && (
                                    <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FACC15] px-1 text-[10px] font-bold leading-none text-black ring-2 ring-[#121214]"
                                        aria-label={t.badge === 'newJobs' ? `${badge} new job requests` : `${badge} active bookings`}>
                                        {badge > 99 ? '99+' : badge}
                                    </span>
                                )}
                            </span>
                            <span className="text-[11px] font-medium">{t.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
