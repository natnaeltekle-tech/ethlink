'use server'

import { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Require an authenticated user or throw.
 * Replaces the 20+ copy-pasted auth blocks across server actions.
 */
export async function requireAuth(supabase: SupabaseClient): Promise<User> {
    let user: User | null = null
    try {
        const { data, error } = await supabase.auth.getUser()
        if (!error) user = data.user
    } catch {
        // Treat stale/corrupt cookies as "not authenticated"
    }

    if (!user) {
        throw new Error('Not authenticated')
    }

    return user
}

/**
 * Get the authenticated user, or null if not logged in.
 * Non-throwing variant for optional auth contexts.
 */
export async function getAuthUser(supabase: SupabaseClient): Promise<User | null> {
    try {
        const { data, error } = await supabase.auth.getUser()
        if (!error) return data.user
    } catch {
        // Treat stale/corrupt cookies as "not authenticated"
    }
    return null
}
