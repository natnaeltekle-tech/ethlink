'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BadgeCheck, Briefcase, CalendarCheck, Heart, LayoutGrid, Store, UserRound, Wrench } from 'lucide-react'
import type { CustomerDashboard, ProviderDashboard } from '@/lib/actions/dashboard'
import { Avatar } from './common'
import { IncomeSummary, PayoutHistory, ProviderJobs, ServiceAreaPayout, ServicesManager, VerificationCard } from './provider-view'
import { CustomerBookings, SavedAndSearches } from './customer-view'
import { AccountSection, type AccountProfile } from './account-section'
import { cn } from '@/lib/utils'

type Mode = 'provider' | 'customer'
const TABS = {
    provider: [
        { id: 'overview', label: 'Overview', icon: LayoutGrid },
        { id: 'jobs', label: 'Jobs', icon: Briefcase },
        { id: 'services', label: 'Services', icon: Wrench },
        { id: 'profile', label: 'Profile', icon: UserRound },
    ],
    customer: [
        { id: 'bookings', label: 'Bookings', icon: CalendarCheck },
        { id: 'saved', label: 'Saved', icon: Heart },
        { id: 'account', label: 'Account', icon: UserRound },
    ],
} as const
const JOB_TABS = ['requests', 'upcoming', 'history'] as const
const MODE_KEY = 'ethlinks.dashboard.mode'

export function DashboardShell({ profile, customer, provider, isProvider }: {
    profile: AccountProfile
    customer: CustomerDashboard
    provider: ProviderDashboard | null
    isProvider: boolean
}) {
    const router = useRouter()
    const pathname = usePathname()
    const params = useSearchParams()

    const urlMode = params.get('mode')
    const [mode, setMode] = useState<Mode>(isProvider && provider && urlMode !== 'customer' ? 'provider' : 'customer')
    const tabs = TABS[mode]
    const urlTab = params.get('tab')
    const jobTab = JOB_TABS.find((t) => t === urlTab)
    const initialTab = jobTab ? 'jobs' : tabs.find((t) => t.id === urlTab)?.id ?? tabs[0].id
    const [tab, setTab] = useState<string>(initialTab)

    // Restore the last chosen mode when the URL doesn't say.
    useEffect(() => {
        if (urlMode || !isProvider || !provider) return
        try {
            if (localStorage.getItem(MODE_KEY) === 'customer') { setMode('customer'); setTab('bookings') }
        } catch { /* storage unavailable */ }
    }, [urlMode, isProvider, provider])

    const go = (nextMode: Mode, nextTab: string) => {
        setMode(nextMode)
        setTab(nextTab)
        try { localStorage.setItem(MODE_KEY, nextMode) } catch { /* ignore */ }
        const q = new URLSearchParams()
        if (isProvider) q.set('mode', nextMode)
        q.set('tab', nextTab)
        router.replace(`${pathname}?${q.toString()}`, { scroll: false })
    }

    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email?.split('@')[0] || 'Your account'
    const v = provider?.verification
    const requests = provider?.jobs.requests.length ?? 0
    const activeBookings = customer.bookings.filter((b) => ['pending', 'confirmed', 'paid', 'disputed'].includes(b.status)).length

    return (
        <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-4 md:pb-10 md:pt-8">
            <header className="mb-4 flex items-center gap-3">
                <Avatar name={name} url={profile.avatarUrl} size={56} />
                <div className="min-w-0 flex-1">
                    <h1 className="flex items-center gap-1.5 truncate text-xl font-bold">
                        {name}
                        {v?.isVerified && <BadgeCheck className="h-5 w-5 shrink-0 text-primary" aria-label="Verified provider" />}
                    </h1>
                    <p className="truncate text-sm text-muted-foreground">
                        {mode === 'provider'
                            ? v?.accountType === 'business' && v.businessName ? v.businessName : 'Provider dashboard'
                            : 'My bookings & account'}
                    </p>
                </div>
            </header>

            {isProvider && provider && (
                <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1" role="radiogroup" aria-label="Dashboard mode">
                    {([['provider', 'Provider', Store, requests], ['customer', 'Customer', CalendarCheck, activeBookings]] as const).map(([m, label, Icon, count]) => (
                        <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => mode !== m && go(m, TABS[m][0].id)}
                            className={cn('flex min-h-[44px] items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors',
                                mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                            <Icon className="h-4 w-4" />{label}
                            {count > 0 && <span className={cn('rounded-full px-1.5 text-xs', mode === m ? 'bg-primary-foreground/20' : 'bg-primary/15 text-primary')}>{count}</span>}
                        </button>
                    ))}
                </div>
            )}

            <nav className="sticky top-14 z-20 -mx-4 mb-4 border-b border-border bg-background/95 px-4 backdrop-blur md:top-16" aria-label="Dashboard sections">
                <div className="flex gap-1 overflow-x-auto" role="tablist">
                    {tabs.map((t) => (
                        <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => go(mode, t.id)}
                            className={cn('flex min-h-[44px] shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium',
                                tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                            <t.icon className="h-4 w-4" />{t.label}
                            {t.id === 'jobs' && requests > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-xs text-white">{requests}</span>}
                        </button>
                    ))}
                </div>
            </nav>

            <div className="space-y-4">
                {mode === 'provider' && provider && (
                    <>
                        {tab === 'overview' && (
                            <>
                                <VerificationCard v={provider.verification} />
                                <IncomeSummary income={provider.income} />
                                {requests > 0 && (
                                    <button type="button" onClick={() => go('provider', 'jobs')} className="flex w-full items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-left">
                                        <Briefcase className="h-5 w-5 text-amber-600" />
                                        <span className="flex-1 text-sm"><b>{requests} new booking request{requests > 1 ? 's' : ''}</b> waiting for your answer</span>
                                        <span className="text-sm font-semibold text-primary">Review</span>
                                    </button>
                                )}
                                <PayoutHistory payouts={provider.payouts} />
                            </>
                        )}
                        {tab === 'jobs' && <ProviderJobs jobs={provider.jobs} initialTab={jobTab} />}
                        {tab === 'services' && <ServicesManager services={provider.services} />}
                        {tab === 'profile' && (
                            <>
                                <ServiceAreaPayout area={provider.serviceArea} verified={provider.verification.isVerified} />
                                <AccountSection profile={profile} isProvider />
                            </>
                        )}
                    </>
                )}
                {mode === 'customer' && (
                    <>
                        {tab === 'bookings' && <CustomerBookings bookings={customer.bookings} />}
                        {tab === 'saved' && <SavedAndSearches favorites={customer.favorites} recentSearches={customer.recentSearches} />}
                        {tab === 'account' && <AccountSection profile={profile} isProvider={isProvider} />}
                    </>
                )}
            </div>
        </main>
    )
}
