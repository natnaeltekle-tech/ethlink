import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Central admin authorization check.
 * 1. Backward compatible: the ADMIN_EMAIL env user still has access.
 * 2. Role-based: any profile with role = 'admin' also has access.
 * Uses the service-role client for the profile lookup so RLS on profiles
 * can never hide the row from the check.
 */
export async function isAdmin(): Promise<boolean> {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired/corrupt session */
    }

    if (!user?.id || !user.email) return false

    // 1. Legacy env fallback (keeps current admin access working)
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail && user.email.toLowerCase() === adminEmail.toLowerCase()) {
        return true
    }

    // 2. Role-based check via service role client (bypasses RLS)
    try {
        const adminSupabase = createAdminClient() as any
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        return profile?.role === 'admin'
    } catch {
        return false
    }
}
