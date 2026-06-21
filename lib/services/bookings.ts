import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { bookingSchema, bookingStatusSchema } from '@/lib/validations'

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'paid' | 'completed'

export async function checkServiceAvailability(serviceId: string, date: string): Promise<boolean> {
    const supabase = await createClient()
    const checkDate = new Date(date).toISOString().endsWith('Z') ? date : `${date}:00Z`

    const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id')
        .eq('service_id', serviceId)
        .eq('date', checkDate)
        .in('status', ['confirmed', 'pending', 'paid'])
        .single()

    return !existingBooking
}

export async function createBookingRecord(params: {
    serviceId: string
    date: string
    userId: string
    guests?: number
}): Promise<{ data: { id: string } | null; error: string | null }> {
    const parsed = bookingSchema.safeParse({
        serviceId: params.serviceId,
        date: params.date,
        guests: params.guests ?? 1,
    })

    if (!parsed.success) {
        return { data: null, error: parsed.error.issues[0]?.message ?? 'Validation error' }
    }

    const { serviceId, date, guests } = parsed.data
    const parsedDate = new Date(date)

    if (isNaN(parsedDate.getTime())) {
        return { data: null, error: 'Invalid date format' }
    }

    const isAvailable = await checkServiceAvailability(serviceId, date)
    if (!isAvailable) {
        return { data: null, error: 'This service is already booked. Please explore our other available services.' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('bookings')
        .insert({
            service_id: serviceId,
            user_id: params.userId,
            date: parsedDate.toISOString(),
            guests,
            status: 'pending',
        })
        .select('id')
        .single()

    if (error) {
        if (error.code === '23505') {
            return { data: null, error: 'This service is already booked. Please explore our other available services.' }
        }
        console.error('[Bookings] Create failed:', error)
        return { data: null, error: 'Failed to create booking' }
    }

    return { data, error: null }
}

export async function notifyProviderOfBooking(serviceId: string, content: string): Promise<void> {
    const supabase = await createClient()
    const { data: service } = await supabase
        .from('services')
        .select('user_id')
        .eq('id', serviceId)
        .single()

    if (!service?.user_id) return

    const adminSupabase = createAdminClient()
    await adminSupabase.from('notifications').insert({
        user_id: service.user_id,
        content,
        type: 'booking',
        link: '/dashboard',
    })
}

export async function updateBookingStatusForProvider(
    bookingId: string,
    status: 'confirmed' | 'cancelled',
    providerId: string
): Promise<{ success: boolean; error?: string }> {
    const parsedStatus = bookingStatusSchema.safeParse(status)
    if (!parsedStatus.success) {
        return { success: false, error: 'Invalid status' }
    }

    const supabase = await createClient()
    const { data: booking } = await supabase
        .from('bookings')
        .select('*, services(user_id)')
        .eq('id', bookingId)
        .single()

    if (!booking || booking.services.user_id !== providerId) {
        return { success: false, error: 'Unauthorized' }
    }

    if (status === 'cancelled' && booking.status === 'paid') {
        return { success: false, error: 'Cannot cancel a paid booking. Please contact support for a refund.' }
    }

    const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId)

    if (error) {
        console.error('[Bookings] Status update failed:', error)
        return { success: false, error: 'Failed to update booking' }
    }

    return { success: true }
}
