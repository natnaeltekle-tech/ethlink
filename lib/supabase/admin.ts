import { createClient } from '@supabase/supabase-js'

export const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
        // Fallback to anonymous client if no service key (dev safety)
        // But logs a warning
        console.warn('SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations will fail or use public permissions.')
        return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}
