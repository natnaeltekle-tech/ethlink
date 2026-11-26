'use server'

import { createClient } from '@/lib/supabase/server'
import { syncProfileFromOAuth } from '@/lib/auth/profile-sync'
import { revalidateWorkspaces } from '@/lib/revalidate'

/** Android app: called after the deep link turned the Google code into a session. */
export async function syncMyOAuthProfile(): Promise<void> {
    const supabase = await createClient()
    try {
        const { data } = await supabase.auth.getUser()
        if (data.user) await syncProfileFromOAuth(data.user)
    } catch { /* no session */ }
    revalidateWorkspaces()
}
