'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const tokenSchema = z.string().trim().min(20).max(4096)
const platformSchema = z.enum(['android', 'ios', 'web'])

/** Save this device's FCM token for the signed-in user (moves it from a previous user). */
export async function savePushToken(token: string, platform: 'android' | 'ios' | 'web' = 'android'): Promise<boolean> {
    const t = tokenSchema.safeParse(token)
    const p = platformSchema.safeParse(platform)
    if (!t.success || !p.success) return false
    const supabase = await createClient()
    const { error } = await supabase.rpc('register_push_token', { p_token: t.data, p_platform: p.data })
    if (error) console.error('[push] register failed:', error.message)
    return !error
}

/** Stop sending pushes to this device for the signed-in user (call before signing out). */
export async function removePushToken(token: string): Promise<void> {
    const t = tokenSchema.safeParse(token)
    if (!t.success) return
    const supabase = await createClient()
    const { error } = await supabase.rpc('unregister_push_token', { p_token: t.data })
    if (error) console.error('[push] unregister failed:', error.message)
}
