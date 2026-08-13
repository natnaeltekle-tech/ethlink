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
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || null

    try {
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                first_name: firstName || null,
                last_name: lastName || null,
                full_name: fullName,
                phone_number: phoneNumber || null,
                updated_at: new Date().toISOString(),
            })

        if (error) {
            console.error('[updateProfile] Supabase error:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/dashboard')
        revalidatePath('/profile')
        revalidatePath('/', 'layout')
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

export async function getPublicProviderInfo(userId: string): Promise<Profile | null> {
    if (!userId) return null
    try {
        const supabase = await createClient()
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle()

        if (profile) {
            return profile
        }
    } catch (e) {
        console.error('[getPublicProviderInfo] Error fetching profile:', e)
    }

    return {
        id: userId,
        full_name: 'Provider',
        first_name: 'Provider',
        last_name: '',
        phone_number: null,
        id_card_link: null,
        role: 'provider',
        avatar_url: null,
        username: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    } as unknown as Profile
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
            first_name: firstName,
            last_name: lastName,
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
    revalidatePath('/profile')
}

export async function updateAvatarUrl(avatarUrl: string): Promise<void> {
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
        .upsert({
            id: user.id,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
        })

    if (error) {
        console.error('Error updating avatar:', error)
        throw new Error(`Failed to update avatar: ${error.message}`)
    }

    revalidatePath('/dashboard')
    revalidatePath('/profile')
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
        revalidatePath('/', 'layout')
    }

    return { success: true }
}
