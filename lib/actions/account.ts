'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** Buckets that hold files under "{userId}/…" */
const USER_BUCKETS = ['service-images', 'provider-kyc'] as const

async function currentUser() {
    const supabase = await createClient()
    try {
        const { data } = await supabase.auth.getUser()
        return { supabase, user: data.user }
    } catch {
        return { supabase, user: null }
    }
}

/** Reasons the signed-in user can't delete their account yet (empty = allowed). */
export async function getAccountDeletionBlockers(): Promise<string[] | null> {
    const { supabase, user } = await currentUser()
    if (!user) return null
    const { data, error } = await supabase.rpc('my_account_deletion_blockers')
    if (error) {
        console.error('[account] blockers check failed:', error)
        return ['We could not check your bookings right now. Please try again.']
    }
    return (data as string[] | null) ?? []
}

/** Every object path under `prefix` (folders are listed recursively). */
async function listAll(admin: ReturnType<typeof createAdminClient>, bucket: string, prefix: string): Promise<string[]> {
    const out: string[] = []
    const queue = [prefix]
    while (queue.length) {
        const dir = queue.shift()!
        for (let offset = 0; ; offset += 100) {
            const { data, error } = await admin.storage.from(bucket).list(dir, { limit: 100, offset })
            if (error || !data?.length) break
            for (const item of data) {
                const path = `${dir}/${item.name}`
                if (item.id) out.push(path)
                else queue.push(path) // folder
            }
            if (data.length < 100) break
        }
    }
    return out
}

export type DeleteAccountResult = { ok: true } | { ok: false; error: string; blockers?: string[] }

/**
 * Permanently delete the signed-in user's account (Google Play requirement).
 * 1. delete_account_data(): refuses while money is in escrow/owed; cancels unpaid
 *    requests; deletes personal data; keeps bookings/receipts anonymised.
 * 2. Remove the user's files (profile photo, portfolio, ID documents).
 * 3. Delete the auth user (sign-in, sessions).
 */
export async function deleteMyAccount(confirmation: string): Promise<DeleteAccountResult> {
    if ((confirmation ?? '').trim().toUpperCase() !== 'DELETE') {
        return { ok: false, error: 'Type DELETE to confirm' }
    }
    const { supabase, user } = await currentUser()
    if (!user) return { ok: false, error: 'Please sign in again' }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('delete_account_data', { p_user: user.id })
    if (error) {
        const msg = error.message ?? ''
        if (msg.includes('ACCOUNT_DELETE_BLOCKED')) {
            const blockers = msg.replace(/^.*ACCOUNT_DELETE_BLOCKED:\s*/, '').split(' | ').filter(Boolean)
            return { ok: false, error: 'Your account can’t be deleted yet', blockers }
        }
        console.error('[account] delete_account_data failed:', error)
        return { ok: false, error: 'Could not delete your account. Please try again or contact support.' }
    }

    // Files: anything under "{userId}/" plus the ID document paths returned by the database.
    const kycPaths = ((data as { kyc_paths?: string[] } | null)?.kyc_paths ?? []).filter(Boolean)
    for (const bucket of USER_BUCKETS) {
        try {
            const paths = new Set(await listAll(admin, bucket, user.id))
            if (bucket === 'provider-kyc') kycPaths.forEach((p) => paths.add(p))
            const all = [...paths]
            for (let i = 0; i < all.length; i += 100) {
                const { error: rmError } = await admin.storage.from(bucket).remove(all.slice(i, i + 100))
                if (rmError) console.error(`[account] storage cleanup (${bucket}) failed:`, rmError)
            }
        } catch (e) {
            console.error(`[account] storage cleanup (${bucket}) failed:`, e)
        }
    }

    const { error: authError } = await admin.auth.admin.deleteUser(user.id)
    if (authError) {
        // Personal data is already gone; retrying finishes the job (the steps above are idempotent).
        console.error('[account] auth user deletion failed:', authError)
        return { ok: false, error: 'Your data was deleted but sign-in removal failed. Please try again.' }
    }

    try { await supabase.auth.signOut() } catch { /* session already invalid */ }
    revalidatePath('/', 'layout')
    return { ok: true }
}
