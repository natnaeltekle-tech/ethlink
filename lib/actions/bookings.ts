'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { bookingSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function checkServiceAvailability(serviceId: string, date: string): Promise<boolean> {
    const supabase = await createClient()

    // normalize date to UTC ISO string if not already
    const checkDate = new Date(date).toISOString().endsWith('Z') ? date : `${date}:00Z`

    const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id')
        .eq('service_id', serviceId)
        .eq('date', checkDate)
        .in('status', ['confirmed', 'pending', 'paid']) // All valid states that block a slot
        .single()

    return !existingBooking
}

export async function getAvailableServices(date: string, category?: string) {
    const supabase = await createClient()

    // normalize date
    const checkDate = new Date(date).toISOString().endsWith('Z') ? date : `${date}:00Z`

    // 1. Get all active services (optionally filtered by category)
    let query = supabase
        .from('services')
        .select('*, bookings(date, status)')
        .eq('is_active', true)

    if (category) {
        query = query.eq('category', category)
    }

    const { data: services, error } = await query

    if (error) {
        console.error('Error fetching available services:', error)
        return []
    }

    // 2. Filter out services that have a booking collision at the requested time
    const availableServices = services.filter(service => {
        // If no bookings, it's available
        if (!service.bookings || service.bookings.length === 0) return true

        // Check if any booking overlaps with our requested time
        const hasCollision = service.bookings.some((booking: any) =>
            booking.date === checkDate &&
            ['confirmed', 'pending', 'paid'].includes(booking.status)
        )

        return !hasCollision
    })

    return availableServices
}

export async function createBooking(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const rawData = {
        serviceId: formData.get('serviceId'),
        date: formData.get('date'),
    };

    try {
        // Basic validation first
        const { serviceId, date } = bookingSchema.omit({ guests: true }).parse(rawData);

        // Atomic Check: Availability
        // Note: The unique constraint in DB on (service_id, date) is the ultimate safeguard.
        // But we check here to give a polite message before hitting the DB error if possible.
        const isAvailable = await checkServiceAvailability(serviceId, date)

        if (!isAvailable) {
            throw new Error('This service is already booked. Please explore our other available services.')
        }

        let data;

        const result = await supabase
            .from('bookings')
            .insert({
                service_id: serviceId,
                user_id: user.id,
                // Ensure we save the literal time as UTC to avoid shifts
                date: new Date(date).toISOString().endsWith('Z') ? date : `${date}:00Z`,
                status: 'pending'
            })
            .select()
            .single()

        if (result.error) {
            // Handle Race Condition / Unique Constraint Violation
            if (result.error.code === '23505') {
                throw new Error('This service is already booked. Please explore our other available services.')
            }
            throw result.error
        }
        data = result.data

        // Fetch Service Owner's ID for notification
        const { data: service } = await supabase
            .from('services')
            .select('user_id, title')
            .eq('id', serviceId)
            .single()

        if (service && service.user_id) {
            // Use admin client to bypass RLS and insert notification for provider
            const adminSupabase = createAdminClient()
            await adminSupabase
                .from('notifications')
                .insert({
                    user_id: service.user_id,
                    content: `New booking request for ${service.title}`,
                    type: 'booking',
                    link: '/dashboard'
                })
                .select()
                .single() // We don't really use the result but good practice
        }

        revalidatePath('/dashboard');
        redirect(`/payment/${data.id}`)

    } catch (error: any) {
        console.error('Error creating booking:', error)
        // Pass the error message through so the UI can display it
        // The error boundary or form handler should catch this.
        // For server actions used in forms, simple throwing works if we use `useFormState` or similar,
        // but here we are just redirecting or throwing.
        // If this is called from a client component wrapper, it will catch the error.
        throw new Error(error.message || 'Failed to create booking');
    }
}


export async function createBookingJson(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const rawData = {
        serviceId: formData.get('serviceId'),
        date: formData.get('date'),
        guests: formData.get('guests'),
    };

    // We can use safe parse here for better error returning
    const parsed = bookingSchema.safeParse(rawData);

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || 'Validation error' };
    }

    const { serviceId, date, guests } = parsed.data;

    // Validate the date is valid
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
        return { error: 'Invalid date format' }
    }

    // Availability Check
    const isAvailable = await checkServiceAvailability(serviceId, date)

    if (!isAvailable) {
        // Return 409 Conflict-style message
        return { error: 'This service is already booked. Please explore our other available services.' }
    }

    const { data, error } = await supabase
        .from('bookings')
        .insert({
            service_id: serviceId,
            user_id: user.id,
            // Date is already a proper ISO string from the form
            date: parsedDate.toISOString(),
            guests,
            status: 'pending'
        })
        .select()
        .single()

    if (error) {
        // Handle Race Condition / Unique Constraint Violation
        if (error.code === '23505') {
            return { error: 'This service is already booked. Please explore our other available services.' }
        }
        console.error('Error creating booking:', error)
        return { error: 'Failed to create booking' }
    }

    // Trigger Notification for Provider
    const { data: service } = await supabase.from('services').select('user_id, title').eq('id', serviceId).single()

    if (service && service.user_id !== user.id) {
        const adminSupabase = createAdminClient()
        await adminSupabase
            .from('notifications')
            .insert({
                user_id: service.user_id,
                content: `New booking request for ${service.title}`,
                link: '/dashboard',
                type: 'booking'
            })
            .select()
    }

    revalidatePath('/dashboard');
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

    if (!bookings) return {
        escrow_balance: 0,
        available_balance: 0,
        pendingBookings: [],
        services: []
    }

    // Calculate escrow balance (paid but not completed)
    const escrow_balance = bookings
        .filter(b => b.status === 'paid')
        .reduce((sum, b) => {
            if (b.provider_earnings !== null) {
                return sum + b.provider_earnings;
            }
            const price = b.services?.price || 0;
            return sum + (price * 0.9);
        }, 0)

    // Calculate available balance (completed jobs ready for payout)
    const available_balance = bookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => {
            if (b.provider_earnings !== null) {
                return sum + b.provider_earnings;
            }
            const price = b.services?.price || 0;
            return sum + (price * 0.9);
        }, 0)

    // Legacy earnings calculation (for backwards compatibility)
    const earnings = escrow_balance + available_balance

    const pendingBookings = bookings.filter(b => b.status === 'pending')

    const completedJobs = bookings
        .filter(b => b.status === 'completed')
        .map(b => ({
            id: b.id,
            service_title: b.services?.title,
            booking_date: b.date,
            amount: b.provider_earnings !== null ? b.provider_earnings : (b.services?.price || 0) * 0.9
        }))

    return {
        earnings,
        escrow_balance,
        available_balance,
        pendingBookings,
        allBookings: bookings,
        completedJobs
    }
}

export async function updateBookingStatus(bookingId: string, status: 'confirmed' | 'cancelled') {
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

    // Prevent cancelling paid bookings without refund
    if (status === 'cancelled' && booking.status === 'paid') {
        throw new Error('Cannot cancel a paid booking. Please contact support for a refund.')
    }

    // Use admin client to bypass RLS for status update (ownership already validated above)
    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId)

    if (error) {
        console.error('Failed to update booking status:', error)
        throw new Error('Failed to update booking')
    }

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

export async function completeJob(bookingId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    // Verify the user is the customer who made the booking
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('user_id, status')
        .eq('id', bookingId)
        .single()

    if (fetchError) {
        throw new Error('Failed to fetch booking')
    }

    if (!booking) {
        throw new Error('Booking not found')
    }

    if (booking.user_id !== user.id) {
        console.error('completeJob: Unauthorized - user does not own booking')
        throw new Error('Unauthorized')
    }

    if (booking.status !== 'paid') {
        console.error('completeJob: Invalid status:', booking.status)
        throw new Error('Only paid bookings can be marked as completed')
    }

    // Use admin client to bypass RLS for status update
    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId)

    if (error) {
        throw new Error(`Failed to complete job: ${error.message}`)
    }

    revalidatePath('/dashboard')
}
