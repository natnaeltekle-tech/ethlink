'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { urlSchema, profileUpdateSchema, providerProfileSchema } from '@/lib/validations'
import { Profile } from '@/lib/types/database'

export async function updateProfile(formData: FormData): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired/corrupt session */
    }

    if (!user) return { success: false, error: 'Not authenticated' }

    const parsed = profileUpdateSchema.safeParse({
        firstName: formData.get('firstName') ?? undefined,
        lastName: formData.get('lastName') ?? undefined,
        phoneNumber: formData.get('phoneNumber') ?? undefined,
    })

    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' }
    }

    const { firstName, lastName, phoneNumber } = parsed.data

    try {
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                first_name: firstName || null,
                last_name: lastName || null,
                phone_number: phoneNumber || null,
            })

        if (error) {
            console.error('[updateProfile] Supabase error:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/dashboard')
        revalidatePath('/services/[id]')
        return { success: true }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update profile'
        console.error('[updateProfile] Unexpected error:', message)
        return { success: false, error: message }
    }
}

export async function getProfile(): Promise<Profile | null> {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired/corrupt session */
    }

    if (!user) return null

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (error || !profile) {
        return null
    }

    return profile
}

export async function updateProviderProfile(formData: FormData): Promise<void> {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired/corrupt session */
    }

    if (!user) throw new Error('Not authenticated')

    const parsed = providerProfileSchema.safeParse({
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phoneNumber: formData.get('phoneNumber'),
        idCardLink: formData.get('idCardLink'),
    })

    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Invalid profile data')
    }

    const { firstName, lastName, phoneNumber, idCardLink } = parsed.data

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

export async function updateAvatarUrl(avatarUrl: string): Promise<void> {
    // Validate URL
    const parsed = urlSchema.safeParse(avatarUrl)
    if (!parsed.success) throw new Error('Invalid avatar URL format')

    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired/corrupt session */
    }

    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)

    if (error) {
        console.error('Error updating avatar:', error)
        throw new Error(`Failed to update avatar: ${error.message}`)
    }

    revalidatePath('/dashboard')
    revalidatePath('/services/[id]')
}

export async function safeSignOut(): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    try {
        const { error } = await supabase.auth.signOut()
        if (error) {
            console.warn('[safeSignOut] Supabase signOut error:', error.message)
            return { success: false, error: error.message }
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.warn('[safeSignOut] Exception during signOut:', message)
        return { success: false, error: message }
    } finally {
        // Always revalidate to clear cached user data from server components
        revalidatePath('/', 'layout')
    }

    return { success: true }
}
