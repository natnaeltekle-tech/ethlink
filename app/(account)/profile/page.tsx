import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarCheck, ChevronRight, Heart, Store } from 'lucide-react'
import { getViewer, displayName } from '@/lib/viewer'
import { getCustomerDashboard } from '@/lib/actions/dashboard'
import { Avatar } from '@/components/dashboard/common'
import { ProfileMenu } from '@/components/profile/profile-menu'
import { ModeSwitchPill } from '@/components/ModeSwitchPill'

export const metadata: Metadata = { title: 'Profile | Eth-Links' }

const ACTIVE = ['pending', 'confirmed', 'paid', 'disputed']

/** Customer profile: personal only — no business, escrow or job information. */
export default async function ProfilePage() {
    const [viewer, data] = await Promise.all([getViewer(), getCustomerDashboard()])
    if (!viewer) return null // layout redirects
    const name = displayName(viewer)
    const since = viewer.createdAt
        ? new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'Africa/Addis_Ababa' }).format(new Date(viewer.createdAt))
        : null
    const activeBookings = data?.bookings.filter((b) => ACTIVE.includes(b.status)).length ?? 0
    const saved = data?.favorites.length ?? 0

    return (
        <>
            <header className="flex items-center gap-4 pt-2">
                <Avatar name={name} url={viewer.avatarUrl} size={68} />
                <div className="min-w-0">
                    <h1 className="truncate text-2xl font-bold">{name}</h1>
                    <p className="truncate text-sm text-muted-foreground">{since ? `Member since ${since}` : viewer.email}</p>
                </div>
            </header>

            <div className="grid grid-cols-2 gap-3">
                <Link href="/bookings" className="flex min-h-[104px] flex-col justify-between rounded-2xl border border-border bg-card p-4 hover:border-primary/50">
                    <CalendarCheck className="h-6 w-6 text-primary" />
                    <span>
                        <span className="block font-semibold">My Bookings</span>
                        <span className="text-xs text-muted-foreground">{activeBookings ? `${activeBookings} active` : 'View history'}</span>
                    </span>
                </Link>
                <Link href="/saved" className="flex min-h-[104px] flex-col justify-between rounded-2xl border border-border bg-card p-4 hover:border-primary/50">
                    <Heart className="h-6 w-6 text-primary" />
                    <span>
                        <span className="block font-semibold">Saved Services</span>
                        <span className="text-xs text-muted-foreground">{saved ? `${saved} saved` : 'Nothing saved yet'}</span>
                    </span>
                </Link>
            </div>

            {!viewer.isProvider && (
                <Link href="/services/new" className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4">
                    <Store className="h-7 w-7 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                        <span className="block font-semibold">Become a provider</span>
                        <span className="block text-sm text-muted-foreground">Get verified, list your service and get paid safely through escrow.</span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
                </Link>
            )}

            <ProfileMenu rows={['payment', 'settings', 'support']} />

            {viewer.isProvider && <ModeSwitchPill to="provider" />}
        </>
    )
}
