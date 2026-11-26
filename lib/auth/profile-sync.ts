import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * After a Google (OAuth) sign-in, fill in profile fields Google knows that are
 * still empty: name, avatar, email. Never overwrites what the user already set,
 * never touches role / provider fields. The on_auth_user_created trigger has
 * already created the row for new users; this only creates it if that failed.
 */
export async function syncProfileFromOAuth(user: User): Promise<void> {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : null)
    const fullName = text(meta.full_name) ?? text(meta.name)
    const avatar = text(meta.avatar_url) ?? text(meta.picture)
    const email = text(user.email)

    try {
        const admin = createAdminClient()
        const { data: profile } = await admin.from('profiles').select('id, full_name, avatar_url, email').eq('id', user.id).maybeSingle()
        if (!profile) {
            await admin.from('profiles').insert({ id: user.id, role: 'user', full_name: fullName, avatar_url: avatar, email })
            return
        }
        const patch: { full_name?: string; avatar_url?: string; email?: string } = {}
        if (!profile.full_name && fullName) patch.full_name = fullName
        if (!profile.avatar_url && avatar) patch.avatar_url = avatar
        if (!profile.email && email) patch.email = email
        if (Object.keys(patch).length) await admin.from('profiles').update(patch).eq('id', user.id)
    } catch (e) {
        // Never block sign-in on profile cosmetics
        console.warn('[auth] profile sync skipped:', e instanceof Error ? e.message : e)
    }
}

export { safeNextPath } from '@/lib/auth/profile-sync-path'
