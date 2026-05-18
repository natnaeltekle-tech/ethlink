'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { urlSchema } from '@/lib/validations'

export async function updateAvatarUrl(avatarUrl: string) {
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
