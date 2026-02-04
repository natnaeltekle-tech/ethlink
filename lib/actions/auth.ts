'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

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
            phone: phoneNumber,
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
    const { data: { user } } = await supabase.auth.getUser()

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
    const { data: { user } } = await supabase.auth.getUser()

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
