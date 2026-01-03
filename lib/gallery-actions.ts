'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addImageToGallery(serviceId: string, imageUrl: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // 1. Get current service to check ownership and existing images
    const { data: service, error: fetchError } = await supabase
        .from('services')
        .select('user_id, images, image_url')
        .eq('id', serviceId)
        .single()

    if (fetchError || !service) {
        throw new Error('Service not found')
    }

    if (service.user_id !== user.id) {
        throw new Error('Unauthorized')
    }

    // 2. Prepare new images array
    // Note: We prioritize the 'images' array column. 
    // If it's null, we might need to initialize it, potentially including the legacy 'image_url' if desired, 
    // but usually 'image_url' is kept as the main thumbnail. 
    // Let's assume 'images' is the gallery.

    const currentImages = service.images || []

    // Check if we should also add to 'image_url' if it's empty (first image)
    let updates: any = {
        images: [...currentImages, imageUrl]
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

    revalidatePath(`/services/${serviceId}`)
    return { success: true }
}

export async function removeImageFromGallery(serviceId: string, imageUrlToRemove: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const { data: service } = await supabase
        .from('services')
        .select('user_id, images, image_url')
        .eq('id', serviceId)
        .single()

    if (!service || service.user_id !== user.id) {
        throw new Error('Unauthorized')
    }

    const currentImages = service.images || []
    const newImages = currentImages.filter((img: string) => img !== imageUrlToRemove)

    let updates: any = {
        images: newImages
    }

    // If we removed the main image_url, update it?
    // For now, let's just update the gallery array. 
    // If the user actively removed the image that is currently image_url, 
    // we might want to pick the first one from newImages or set to null.
    if (service.image_url === imageUrlToRemove) {
        updates.image_url = newImages.length > 0 ? newImages[0] : null
    }

    const { error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', serviceId)

    if (error) {
        throw new Error('Failed to remove image')
    }

    revalidatePath(`/services/${serviceId}`)
    return { success: true }
}
