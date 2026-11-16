import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import { getCustomerDashboard, getProviderDashboard } from '@/lib/actions/dashboard'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        // Expired/corrupt session — treat as logged out
    }
    if (!user) redirect('/auth/login?next=/dashboard')

    const [{ data: profile }, { count: serviceCount }, customer] = await Promise.all([
        supabase.from('profiles').select('first_name, last_name, phone, bio, avatar_url, role, verification_status').eq('id', user.id).maybeSingle(),
        supabase.from('services').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        getCustomerDashboard(),
    ])

    const role = profile?.role ?? 'user'
    const verificationStatus = profile?.verification_status ?? 'unsubmitted'
    const isProvider = role === 'provider' || role === 'admin' || (serviceCount ?? 0) > 0 || verificationStatus !== 'unsubmitted'
    const provider = isProvider ? await getProviderDashboard() : null

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar hideSearch />
            <Suspense>
                <DashboardShell
                    isProvider={isProvider}
                    provider={provider}
                    customer={customer ?? { bookings: [], favorites: [], recentSearches: [] }}
                    profile={{
                        id: user.id,
                        email: user.email ?? null,
                        firstName: profile?.first_name ?? '',
                        lastName: profile?.last_name ?? '',
                        phone: profile?.phone ?? '',
                        bio: profile?.bio ?? '',
                        avatarUrl: profile?.avatar_url ?? null,
                        role,
                        verificationStatus,
                    }}
                />
            </Suspense>
        </div>
    )
}
