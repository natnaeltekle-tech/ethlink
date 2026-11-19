import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type Viewer = {
    id: string
    email: string | null
    firstName: string
    lastName: string
    phone: string
    bio: string
    avatarUrl: string | null
    role: string
    verificationStatus: string
    isVerified: boolean
    hasLicense: boolean
    accountType: 'individual' | 'business' | null
    businessName: string | null
    createdAt: string | null
    /** May use provider mode: provider/admin role, owns a listing, or has applied. */
    isProvider: boolean
}

/** The signed-in user's profile + provider status (once per request). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* signed out */ }
    if (!user) return null
    const [{ data: p }, { count }] = await Promise.all([
        supabase.from('profiles')
            .select('first_name, last_name, phone, bio, avatar_url, role, verification_status, is_verified, has_business_license, account_type, business_name')
            .eq('id', user.id).maybeSingle(),
        supabase.from('services').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    const role = p?.role ?? 'user'
    const verificationStatus = p?.verification_status ?? 'unsubmitted'
    return {
        id: user.id,
        email: user.email ?? null,
        firstName: p?.first_name ?? '',
        lastName: p?.last_name ?? '',
        phone: p?.phone ?? '',
        bio: p?.bio ?? '',
        avatarUrl: p?.avatar_url ?? null,
        role,
        verificationStatus,
        isVerified: Boolean(p?.is_verified),
        hasLicense: Boolean(p?.has_business_license),
        accountType: p?.account_type ?? null,
        businessName: p?.business_name ?? null,
        createdAt: user.created_at ?? null,
        isProvider: role === 'provider' || role === 'admin' || (count ?? 0) > 0 || verificationStatus !== 'unsubmitted',
    }
})

export const displayName = (v: Pick<Viewer, 'firstName' | 'lastName' | 'email'>) =>
    [v.firstName, v.lastName].filter(Boolean).join(' ') || v.email?.split('@')[0] || 'Your account'
