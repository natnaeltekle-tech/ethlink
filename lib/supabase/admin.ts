import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

/**
 * Service-role Supabase client — bypasses RLS.
 * Server-only: notifications, payment webhooks, admin aggregates.
 * Never import from client components or expose the service role key.
 */
export const createAdminClient = () => {
    if (typeof window !== 'undefined') {
        throw new Error('createAdminClient() must not be called in the browser')
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceRoleKey) {
        throw new Error(
            'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client'
        )
    }

    return createClient<Database>(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}
