import { redirect } from 'next/navigation'

/**
 * The old combined dashboard. Kept only as a redirect: notifications already
 * stored in the database, receipt emails and older app builds link here.
 *   /dashboard?mode=provider&tab=jobs|requests|upcoming|history|services|profile|overview
 *   /dashboard?tab=bookings|saved|account
 */
const PROVIDER: Record<string, string> = {
    overview: '/provider/overview',
    jobs: '/provider/jobs',
    requests: '/provider/jobs?tab=new',
    upcoming: '/provider/jobs?tab=active',
    history: '/provider/jobs?tab=history',
    services: '/provider/services',
    profile: '/provider/profile',
}
const CUSTOMER: Record<string, string> = {
    bookings: '/bookings',
    saved: '/saved',
    account: '/profile/settings',
}

export default async function DashboardRedirect({ searchParams }: { searchParams: Promise<{ mode?: string; tab?: string }> }) {
    const { mode, tab = '' } = await searchParams
    if (mode === 'provider') redirect(PROVIDER[tab] ?? PROVIDER.overview)
    redirect(CUSTOMER[tab] ?? '/profile')
}
