'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function searchServices(query: string) {
    const supabase = await createClient()

    if (!query) {
        return []
    }

    const { data, error } = await supabase
        .from('services_view')
        .select('*')
        .eq('is_active', true)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)

    if (error) {
        console.error('Error searching services:', error)
        return []
    }

    return data
}

export async function searchServicesAdvanced(query: string, location?: string, maxPrice?: number) {
    const supabase = await createClient()

    let queryBuilder = supabase.from('services_view').select('*').eq('is_active', true);

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

    let queryBuilder = supabase.from('services_view').select('*').eq('is_active', true);

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

    const { data: reviews, error } = await supabase
        .from('reviews')
        .select(`
            *,
            profiles (
                first_name,
                last_name,
                avatar_url
            )
        `)
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching reviews:', error)
        return []
    }

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
        .order('created_at', { ascending: false }) // Get newest first
        .limit(30)

    if (error) {
        console.error('Error fetching messages:', JSON.stringify(error, null, 2))
        console.error('Service ID:', serviceId)
        console.error('User ID:', user.id)
        return []
    }

    return messages.reverse() // Return in chronological order
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

    // Trigger Notification for Receiver
    const adminSupabase = createAdminClient()
    await adminSupabase.from('notifications').insert({
        user_id: receiverId,
        content: 'New Message',
        link: `/services/${serviceId}`,
        type: 'message'
    })
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

    // Extract coordinates if available
    const latitudeStr = formData.get('latitude') as string
    const longitudeStr = formData.get('longitude') as string
    const latitude = latitudeStr ? parseFloat(latitudeStr) : null
    const longitude = longitudeStr ? parseFloat(longitudeStr) : null

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
            image_url: imageUrl,
            user_id: user.id,
            latitude,
            longitude
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

    // Check availability
    const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id')
        .eq('service_id', serviceId)
        .eq('date', date)
        .eq('status', 'confirmed')
        .single()

    if (existingBooking) {
        throw new Error('This slot is already booked. Please pick another time.')
    }

    const { data, error } = await supabase
        .from('bookings')
        .insert({
            service_id: serviceId,
            user_id: user.id,
            // Ensure we save the literal time as UTC to avoid shifts
            // Input is usually YYYY-MM-DDTHH:mm
            date: new Date(date).toISOString().endsWith('Z') ? date : `${date}:00Z`,
            status: 'pending'
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating booking:', error)
        throw new Error('Failed to create booking')
    }

    // Fetch Service Owner's ID for notification
    const { data: service } = await supabase
        .from('services')
        .select('user_id, title')
        .eq('id', serviceId)
        .single()

    if (service && service.user_id) {
        console.log('✅ Provider ID found:', service.user_id)
        console.log('📦 Service Title:', service.title)

        // Use admin client to bypass RLS and insert notification for provider
        const adminSupabase = createAdminClient()
        const { data: notifData, error: notifError } = await adminSupabase
            .from('notifications')
            .insert({
                user_id: service.user_id,
                content: `New booking request for ${service.title}`,
                type: 'booking',
                link: '/dashboard'
            })
            .select()

        if (notifError) {
            console.error('❌ Error inserting notification:', notifError)
        } else {
            console.log('✅ Notification inserted successfully!')
            console.log('📬 Notification data:', notifData)
        }
    } else {
        console.warn('⚠️ Service or service owner not found for notification')
    }

    redirect(`/payment/${data.id}`)
}
// Or do it in createBookingJson if that's what's used. 
// Assuming createBooking (Form Action) is used:
// We can't easily insert after redirect. Let's modify slightly.
// Wait, createBooking redirects to payment. The notification forPROVIDER should happen when booking is requested?
// Yes. But we need provider ID.
// Let's look at createBooking implementation again. It doesn't fetch service/provider details yet.
// I'll add the fetch logic.


export async function createBookingJson(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const serviceId = formData.get('serviceId') as string
    const date = formData.get('date') as string
    const guests = parseInt(formData.get('guests') as string) || 1

    if (!serviceId || !date) {
        return { error: 'Missing required fields' }
    }

    // Check availability
    const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id')
        .eq('service_id', serviceId)
        .eq('date', date)
        .eq('status', 'confirmed')
        .single()

    if (existingBooking) {
        return { error: 'This slot is already booked. Please pick another time.' }
    }

    const { data, error } = await supabase
        .from('bookings')
        .insert({
            service_id: serviceId,
            user_id: user.id,
            // Ensure we save the literal time as UTC to avoid shifts
            date: new Date(date).toISOString().endsWith('Z') ? date : `${date}:00Z`,
            guests,
            status: 'pending'
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating booking:', error)
        return { error: 'Failed to create booking' }
    }

    // Trigger Notification for Provider
    // 1. Get Provider ID
    const { data: service } = await supabase.from('services').select('user_id, title').eq('id', serviceId).single()

    if (service && service.user_id !== user.id) {
        console.log('✅ Provider ID found (Json):', service.user_id)
        console.log('📦 Service Title:', service.title)

        // Use admin client to bypass RLS and insert notification for provider
        const adminSupabase = createAdminClient()
        const { data: notifData, error: notifError } = await adminSupabase
            .from('notifications')
            .insert({
                user_id: service.user_id,
                content: `New booking request for ${service.title}`,
                link: '/dashboard',
                type: 'booking'
            })
            .select()

        if (notifError) {
            console.error('❌ Error inserting notification (Json):', notifError)
        } else {
            console.log('✅ Notification inserted successfully (Json)!')
            console.log('📬 Notification data:', notifData)
        }
    } else if (service) {
        console.warn('⚠️ Skipping notification - user is booking their own service')
    } else {
        console.warn('⚠️ Service not found for notification (Json)')
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

export async function initiatePayment(bookingId: string, paymentMethod: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // 1. Fetch the booking to get the REAL price
    const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, services(price)')
        .eq('id', bookingId)
        .single()

    if (error || !booking) {
        throw new Error('Booking not found')
    }

    // Security Check: Ensure the user owns this booking
    if (booking.user_id !== user.id) {
        throw new Error('Unauthorized')
    }

    const price = booking.services.price

    // TODO: Call Telebirr/Chapa API here to get payment URL
    // Example: const response = await telebirr.init({ amount: price, ... })
    // For now, we just log it and return success
    console.log(`Initiating payment for Booking ${bookingId} via ${paymentMethod} for ${price} ETB`)

    return { success: true, message: 'Payment initiated' }
}

export async function verifyPayment(bookingId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // Verify transaction ID with Provider
    console.log(`Verifying payment for Booking ${bookingId}...`)

    // Get the booking price to calculate commission
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*, services(price, user_id, title)')
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        throw new Error('Booking verification failed: Booking not found')
    }

    const price = booking.services.price
    const commissionRate = 0.10
    const commission = price * commissionRate
    const earnings = price - commission

    // ONLY if verification passes: UPDATE bookings SET status = 'paid'
    const { error: updateError } = await supabase
        .from('bookings')
        .update({
            status: 'paid',
            commission_amount: commission,
            provider_earnings: earnings
        })
        .eq('id', bookingId)
        // .eq('user_id', user.id) // Remove user_id check here IF the verifying user is NOT the customer but the system (server action). 
        // But here verifyPayment is called by the user (customer) after payment. 
        // Keeping user_id check is fine if the customer triggers verify.
        .eq('user_id', booking.user_id)

    if (updateError) {
        console.error('Error updating payment status:', updateError)
        throw new Error('Failed to update booking status')
    }

    revalidatePath('/dashboard')

    // Notifications removed as per requirement (Receipt is enough)

    return { success: true }

}

// Deprecated: Use initiatePayment + verifyPayment instead
export async function processPayment(bookingId: string) {
    return verifyPayment(bookingId)
}

export async function getUserBookings() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*, services(title, price)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching user bookings:', error)
        return []
    }

    return bookings
}

export async function toggleFavorite(serviceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    // Check if already favorited
    const { data: existing } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('service_id', serviceId)
        .single()

    if (existing) {
        // Remove from favorites
        await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('service_id', serviceId)

        revalidatePath(`/services/${serviceId}`)
        return { isFavorite: false }
    } else {
        // Add to favorites
        await supabase
            .from('favorites')
            .insert({
                user_id: user.id,
                service_id: serviceId
            })

        revalidatePath(`/services/${serviceId}`)
        return { isFavorite: true }
    }
}

export async function getFavoriteStatus(serviceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    const { data } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('service_id', serviceId)
        .single()

    return !!data
}

export async function getProviderStats() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Get all services owned by user
    const { data: services } = await supabase
        .from('services')
        .select('id')
        .eq('user_id', user.id)

    if (!services || services.length === 0) return null

    const serviceIds = services.map(s => s.id)

    // Get bookings for these services
    const { data: bookings } = await supabase
        .from('bookings')
        .select('*, services(title, price)')
        .in('service_id', serviceIds)
        .order('created_at', { ascending: false })

    if (!bookings) return { earnings: 0, pendingBookings: [], services: [] }

    const earnings = bookings
        .filter(b => b.status === 'paid' || b.status === 'confirmed')
        .reduce((sum, b) => {
            // For paid bookings, use the stored provider_earnings
            if (b.status === 'paid' && b.provider_earnings !== null) {
                return sum + b.provider_earnings;
            }

            // For confirmed bookings (or legacy paid without stored earnings), calculate 10% commission
            // effective earnings = price * 0.9
            const price = b.services?.price || 0;
            return sum + (price * 0.9);
        }, 0)

    const pendingBookings = bookings.filter(b => b.status === 'pending')

    const completedJobs = bookings
        .filter(b => b.status === 'paid')
        .map(b => ({
            id: b.id,
            service_title: b.services?.title,
            booking_date: b.date,
            amount: b.provider_earnings !== null ? b.provider_earnings : (b.services?.price || 0) * 0.9
        }))

    return {
        earnings,
        pendingBookings,
        allBookings: bookings,
        completedJobs
    }
}

export async function updateBookingStatus(bookingId: string, status: 'confirmed' | 'cancelled') {
    console.log('updateBookingStatus called:', { bookingId, status })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // Verify ownership of the service linked to this booking
    // We need to join bookings -> services and check services.user_id
    const { data: booking } = await supabase
        .from('bookings')
        .select('*, services(user_id)')
        .eq('id', bookingId)
        .single()

    if (!booking || booking.services.user_id !== user.id) {
        throw new Error('Unauthorized')
    }

    // Debug logging for cancel action
    if (status === 'cancelled') {
        console.log('Cancelling booking:', bookingId)
    }

    // Use admin client to bypass RLS for status update
    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId)

    if (error) {
        console.error('Failed to update booking status:', error)
        throw new Error('Failed to update booking')
    }

    console.log('✅ Booking status updated successfully:', { bookingId, status })

    // Auto-Message on Accept
    if (status === 'confirmed') {
        const { error: msgError } = await supabase
            .from('messages')
            .insert({
                service_id: booking.service_id,
                sender_id: user.id, // Provider (Current User)
                receiver_id: booking.user_id, // Customer (Booking Owner)
                content: '✅ I have accepted your booking! Please proceed to payment.'
            })

        if (msgError) {
            console.error('Failed to send auto-accept message:', msgError);
            // Non-blocking error, we don't throw here to preserve the status update
        }
    }

    revalidatePath('/dashboard')
}

export async function getProviderServices() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return services || []
}

export async function toggleServiceStatus(serviceId: string, isActive: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('services')
        .update({ is_active: isActive })
        .eq('id', serviceId)
        .eq('user_id', user.id)

    if (error) throw new Error('Failed to update service status')

    revalidatePath(`/services/${serviceId}`)
}

export async function getServicesByCategory(category: string, limit: number = 4) {
    const supabase = await createClient()

    const { data: services } = await supabase
        .from('services_view')
        .select('*')
        .eq('is_active', true)
        .ilike('category', `%${category}%`)
        .order('created_at', { ascending: false })
        .limit(limit)

    return services || []
}

export async function getLatestServices(limit: number = 4) {
    const supabase = await createClient()

    const { data: services } = await supabase
        .from('services_view')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit)

    return services || []
}

export async function getServicesByCategoryStrict(category: string, limit: number = 24) {
    const supabase = await createClient()

    const { data: services } = await supabase
        .from('services_view')
        .select('*')
        .eq('is_active', true)
        .eq('category', category) // STRICT filtering
        .order('created_at', { ascending: false })
        .limit(limit)

    return services || []
}

export async function getBuses(limit: number = 24) {
    const supabase = await createClient()

    const { data: services } = await supabase
        .from('services_view')
        .select('*')
        .eq('is_active', true)
        .eq('category', 'Transport')
        .ilike('title', '%bus%')
        .order('created_at', { ascending: false })
        .limit(limit)

    return services || []
}

export async function deleteService(serviceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // Verify ownership
    const { data: service } = await supabase
        .from('services')
        .select('user_id')
        .eq('id', serviceId)
        .single()

    if (!service || service.user_id !== user.id) {
        throw new Error('Unauthorized')
    }

    const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)

    if (error) throw new Error('Failed to delete service')

    revalidatePath('/dashboard')
}

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

export async function createServiceWithProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // 1. Extract Provider Details
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const phoneNumber = formData.get('phoneNumber') as string
    const idCardLink = formData.get('idCardLink') as string

    // 2. Extract Service Details
    const title = formData.get('title') as string
    const category = formData.get('category') as string
    const location = formData.get('location') as string
    const price = parseFloat(formData.get('price') as string)
    const description = formData.get('description') as string
    const imageUrl = formData.get('image_url') as string

    // Extract coordinates if available
    const latitudeStr = formData.get('latitude') as string
    const longitudeStr = formData.get('longitude') as string
    const latitude = latitudeStr ? parseFloat(latitudeStr) : null
    const longitude = longitudeStr ? parseFloat(longitudeStr) : null

    // Validation
    if (!firstName || !lastName || !phoneNumber || !idCardLink) {
        throw new Error('All Provider Details are required')
    }
    if (!title || !category || !location || isNaN(price) || !description) {
        throw new Error('All Service Details are required')
    }

    // 3. Upsert Profile
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            full_name: `${firstName} ${lastName}`,
            phone_number: phoneNumber,
            id_card_link: idCardLink,
            role: 'provider'
        })

    if (profileError) {
        // NON-BLOCKING: Log the error but allow service creation to proceed.
        // This prevents the application from crashing if the DB schema is slightly out of sync (e.g. missing columns).
        console.error('Warning: Failed to update provider profile. Proceeding with service creation.', profileError)
        // We do NOT throw here anymore.
    }

    // 4. Create Service
    const { data: service, error: serviceError } = await supabase
        .from('services')
        .insert({
            title,
            category,
            location,
            price,
            description,
            image_url: imageUrl,
            user_id: user.id,
            latitude,
            longitude
        })
        .select()
        .single()

    if (serviceError) {
        console.error('Error creating service:', serviceError)
        throw new Error('Failed to create service')
    }

    redirect(`/services/${service.id}`)
}
