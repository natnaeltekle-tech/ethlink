'use server'

import { createClient } from '@/lib/supabase/server'

export async function searchServices(query: string) {
    const supabase = await createClient()

    if (!query) {
        return []
    }

    const { data, error } = await supabase
        .from('services')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)

    if (error) {
        console.error('Error searching services:', error)
        return []
    }

    return data
}

export async function searchServicesAdvanced(query: string, location?: string, maxPrice?: number) {
    const supabase = await createClient()

    let queryBuilder = supabase.from('services').select('*');

    if (query) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`);
    }

    if (location) {
        queryBuilder = queryBuilder.ilike('location', `%${location}%`);
    }

    if (maxPrice) {
        queryBuilder = queryBuilder.lte('price', maxPrice);
    }

    const { data, error } = await queryBuilder;

    if (error) {
        console.error('Error searching services (advanced):', error);
        return [];
    }

    return data || [];
}

export async function searchServicesGreedy(keyword: string, maxPrice?: number) {
    const supabase = await createClient()

    let queryBuilder = supabase.from('services').select('*');

    if (maxPrice) {
        queryBuilder = queryBuilder.lte('price', maxPrice);
    }

    if (keyword) {
        queryBuilder = queryBuilder.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%,category.ilike.%${keyword}%,location.ilike.%${keyword}%`);
    }

    const { data, error } = await queryBuilder;

    if (error) {
        console.error('Error searching services (greedy):', error);
        return [];
    }

    return data || [];
}

export async function getServiceDetails(id: string) {
    const supabase = await createClient()

    const { data: service, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching service details:', error)
        return null
    }

    // Fetch provider info (assuming user_id links to auth.users, but we might need a profiles table or similar)
    // For now, we'll try to fetch from a 'profiles' table if it exists, or just return the service.
    // If we need email, we might need to use an admin client or a secure view.
    // Let's assume there's a public profile or we can get it.
    // Actually, let's try to fetch the user metadata if possible, or just return the service for now.

    return service
}

export async function getReviews(serviceId: string) {
    const supabase = await createClient()

    // First try to fetch reviews without the join to see if the table exists and works
    const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching reviews (simple query):', error)
        return []
    }

    // If we have reviews, we might want to fetch user details manually if the join failed previously
    // For now, let's just return the reviews. The UI handles missing profile info.
    return reviews
}

export async function getMessages(serviceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('service_id', serviceId)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching messages:', JSON.stringify(error, null, 2))
        console.error('Service ID:', serviceId)
        console.error('User ID:', user.id)
        return []
    }

    return messages
}

export async function sendMessage(serviceId: string, receiverId: string, content: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('messages')
        .insert({
            service_id: serviceId,
            sender_id: user.id,
            receiver_id: receiverId,
            content,
        })

    if (error) {
        console.error('Error sending message:', JSON.stringify(error, null, 2))
        throw new Error(`Database Error: ${error.message || error.details || 'Unknown error'}`)
    }
}

import { redirect } from 'next/navigation'

export async function createService(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const title = formData.get('title') as string
    const category = formData.get('category') as string
    const location = formData.get('location') as string
    const price = parseFloat(formData.get('price') as string)
    const description = formData.get('description') as string
    const imageUrl = formData.get('image_url') as string

    if (!title || !category || !location || isNaN(price) || !description) {
        throw new Error('Missing required fields')
    }

    const { data, error } = await supabase
        .from('services')
        .insert({
            title,
            category,
            location,
            price,
            description,
            images: imageUrl ? [imageUrl] : [],
            user_id: user.id
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating service:', error)
        throw new Error('Failed to create service')
    }

    redirect(`/services/${data.id}`)
}

import { revalidatePath } from 'next/cache'

export async function submitReview(serviceId: string, rating: number, comment: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    if (rating < 1 || rating > 5) {
        throw new Error('Invalid rating')
    }

    const { error } = await supabase
        .from('reviews')
        .insert({
            service_id: serviceId,
            user_id: user.id,
            rating,
            comment,
        })

    if (error) {
        console.error('Error submitting review:', error)
        throw new Error('Failed to submit review')
    }

    revalidatePath(`/services/${serviceId}`)
}

export async function createBooking(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const serviceId = formData.get('serviceId') as string
    const date = formData.get('date') as string

    if (!serviceId || !date) {
        throw new Error('Missing required fields')
    }

    const { data, error } = await supabase
        .from('bookings')
        .insert({
            service_id: serviceId,
            user_id: user.id,
            date,
            status: 'pending'
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating booking:', error)
        throw new Error('Failed to create booking')
    }

    redirect(`/payment/${data.id}`)
}

export async function createBookingJson(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const serviceId = formData.get('serviceId') as string
    const date = formData.get('date') as string

    if (!serviceId || !date) {
        return { error: 'Missing required fields' }
    }

    const { data, error } = await supabase
        .from('bookings')
        .insert({
            service_id: serviceId,
            user_id: user.id,
            date,
            status: 'pending'
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating booking:', error)
        return { error: 'Failed to create booking' }
    }

    return { success: true, bookingId: data.id }
}

export async function getBookingDetails(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, services(*)')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching booking:', error)
        return null
    }

    // Security check: ensure user owns the booking
    if (booking.user_id !== user.id) {
        return null
    }

    return booking
}

export async function processPayment(bookingId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // Verify booking exists and belongs to user
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('user_id', user.id)
        .single()

    if (fetchError || !booking) {
        throw new Error('Booking not found')
    }

    // Update status to confirmed
    const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)

    if (updateError) {
        console.error('Error processing payment:', updateError)
        throw new Error('Payment failed')
    }

    redirect('/dashboard?payment=success')
}
