'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/database.types'
import { urlSchema } from '@/lib/validations'

type ServiceUpdate = Database['public']['Tables']['services']['Update']

export async function addImageToGallery(serviceId: string, imageUrl: string) {
    // Validate URL
    if (!urlSchema.safeParse(imageUrl).success) throw new Error('Invalid image URL format')

    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }

    if (!user) throw new Error('Not authenticated')

    // 1. Get current service to check ownership and existing gallery
    const { data: service, error: fetchError } = await supabase
        .from('services')
        .select('user_id, gallery, image_url')
        .eq('id', serviceId)
        .single()

    if (fetchError || !service) {
        throw new Error('Service not found')
    }

    if (service.user_id !== user.id) {
        throw new Error('Unauthorized')
    }

    // 2. Prepare new gallery array
    const currentGallery = service.gallery || []

    // Check if we should also add to 'image_url' if it's empty (first image)
    const updates: ServiceUpdate = {
        gallery: [...currentGallery, imageUrl]
    }

    if (!service.image_url) {
        updates.image_url = imageUrl
    }

    // 3. Update service
    const { error: updateError } = await supabase
        .from('services')
        .update(updates)
        .eq('id', serviceId)

    if (updateError) {
        console.error('Error adding image:', updateError)
        throw new Error('Failed to add image')
    }

    revalidatePath(`/services/${serviceId}`, 'page')
    return { success: true }
}

export async function removeImageFromGallery(serviceId: string, imageUrlToRemove: string) {
    if (!urlSchema.safeParse(imageUrlToRemove).success) throw new Error('Invalid image URL format')
    
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }

    if (!user) throw new Error('Not authenticated')

    const { data: service } = await supabase
        .from('services')
        .select('user_id, gallery, image_url')
        .eq('id', serviceId)
        .single()

    if (!service || service.user_id !== user.id) {
        throw new Error('Unauthorized')
    }

    const currentGallery = service.gallery || []
    const newGallery = currentGallery.filter((img: string) => img !== imageUrlToRemove)

    const updates: ServiceUpdate = {
        gallery: newGallery
    }

    // If we removed the main image_url, update it?
    if (service.image_url === imageUrlToRemove) {
        updates.image_url = newGallery.length > 0 ? newGallery[0] : null
    }

    const { error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', serviceId)

    if (error) {
        throw new Error('Failed to remove image')
    }

    revalidatePath(`/services/${serviceId}`, 'page')
    return { success: true }
}
