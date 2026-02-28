

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }

    if (!user) throw new Error('Not authenticated')

    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const phoneNumber = formData.get('phoneNumber') as string

    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
        })

    if (error) {
        console.error('Error updating profile:', error)
        throw new Error(`Failed to update profile: ${error.message}`)
    }

    revalidatePath('/dashboard')
    revalidatePath('/services/[id]')
}

export async function getProfile() {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }

    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return profile
}

export async function updateProviderProfile(formData: FormData) {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }

    if (!user) throw new Error('Not authenticated')

    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const phoneNumber = formData.get('phoneNumber') as string
    const idCardLink = formData.get('idCardLink') as string

    if (!firstName || !lastName || !phoneNumber || !idCardLink) {
        throw new Error('All fields are required')
    }

    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            full_name: `${firstName} ${lastName}`,
            phone_number: phoneNumber,
            id_card_link: idCardLink,
            role: 'provider'
        })

    if (error) {
        console.error('Error updating provider profile:', error)
        throw new Error('Failed to update profile')
    }

    revalidatePath('/services/new')
}

/**
 * Safe server-side sign out.
 * Uses try/catch to ensure the session is always invalidated,
 * even if Supabase throws an error.
 */
export async function safeSignOut(): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    try {
        const { error } = await supabase.auth.signOut()
        if (error) {
            console.warn('[safeSignOut] Supabase signOut error:', error.message)
            return { success: false, error: error.message }
        }
    } catch (err: any) {
        console.warn('[safeSignOut] Exception during signOut:', err?.message)
        return { success: false, error: err?.message || 'Unknown error' }
    } finally {
        // Always revalidate to clear cached user data from server components
        revalidatePath('/', 'layout')
    }

    return { success: true }
}

