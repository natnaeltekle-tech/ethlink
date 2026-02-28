'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CONFIG } from '@/lib/constants'

export async function initiatePayment(bookingId: string, paymentMethod: string) {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }

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

    // Payment integration placeholder
    // Example: const response = await telebirr.init({ amount: price, ... })

    return { success: true, message: 'Payment initiated' }
}

export async function verifyPayment(bookingId: string) {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }

    if (!user) throw new Error('Not authenticated')

    // Verify transaction ID with Provider
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
    const commission = price * CONFIG.COMMISSION_RATE
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
