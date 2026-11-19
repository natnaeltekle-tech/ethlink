'use server'

import { createClient } from '@/lib/supabase/server'

export type NavCounts = { signedIn: boolean; isProvider: boolean; activeBookings: number; newJobs: number }

/** Bottom-nav badges: the customer's active bookings and the provider's new job requests. */
export async function getNavCounts(): Promise<NavCounts> {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* signed out */ }
    if (!user) return { signedIn: false, isProvider: false, activeBookings: 0, newJobs: 0 }

    const [{ count: active }, { data: services }, { data: profile }] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true })
            .eq('user_id', user.id).in('status', ['pending', 'confirmed', 'paid', 'disputed']),
        supabase.from('services').select('id').eq('user_id', user.id),
        supabase.from('profiles').select('role, verification_status').eq('id', user.id).maybeSingle(),
    ])
    const ids = (services ?? []).map((s) => s.id)
    const { count: jobs } = ids.length
        ? await supabase.from('bookings').select('id', { count: 'exact', head: true }).in('service_id', ids).eq('status', 'pending')
        : { count: 0 }
    const role = profile?.role ?? 'user'
    return {
        signedIn: true,
        isProvider: role === 'provider' || role === 'admin' || ids.length > 0 || (profile?.verification_status ?? 'unsubmitted') !== 'unsubmitted',
        activeBookings: active ?? 0,
        newJobs: jobs ?? 0,
    }
}
