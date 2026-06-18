'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { bookingSchema, txRefSchema } from '@/lib/validations'
import {
    confirmBookingPaymentAtomic,
    detectPaymentProvider,
} from '@/lib/services/payments'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Booking, Service } from '@/lib/types/database'
export async function getCommissionRate(): Promise<number> {
    'use cache';
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'commission_rate')
        .single()

    if (error || !data) {
        return 0.10; // default to 10% commission
    }
    return parseFloat(data.value)
}

export async function checkServiceAvailability(serviceId: string, date: string): Promise<boolean> {
    const supabase = await createClient()

    // normalize date to UTC ISO string if not already
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

export async function getAvailableServices(date: string, category?: string): Promise<any[]> {
    const supabase = await createClient()

    // normalize date
    const checkDate = new Date(date).toISOString().endsWith('Z') ? date : `${date}:00Z`

    // 1. Get all active services
    let query = supabase
        .from('services')
        .select('*, bookings(date, status)')
        .eq('is_active', true)

    if (category) {
        query = query.eq('category', category)
    }

    const { data: services, error } = await query

    if (error || !services) {
        console.error('Error fetching available services:', error)
        return []
    }

    // 2. Filter out services that have a booking collision at the requested time
    const availableServices = services.filter(service => {
        if (!service.bookings || service.bookings.length === 0) return true

        const hasCollision = service.bookings.some((booking: any) =>
            booking.date === checkDate &&
            ['confirmed', 'pending', 'paid'].includes(booking.status)
        )

        return !hasCollision
    })

    return availableServices
}

export async function createBooking(formData: FormData): Promise<void> {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired/corrupt session */
    }

    if (!user) {
        redirect('/auth/login')
    }

    const rawData = {
        serviceId: formData.get('serviceId'),
        date: formData.get('date'),
    };

    try {
        const { serviceId, date } = bookingSchema.omit({ guests: true }).parse(rawData);

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
                date: new Date(date).toISOString().endsWith('Z') ? date : `${date}:00Z`,
                status: 'pending'
            })
            .select()
            .single()

        if (result.error) {
            if (result.error.code === '23505') {
                throw new Error('This service is already booked. Please explore our other available services.')
            }
            throw result.error
        }
        data = result.data

        const { data: service } = await supabase
            .from('services')
            .select('user_id, title')
            .eq('id', serviceId)
            .single()

        if (service && service.user_id) {
            const adminSupabase = createAdminClient()
            await adminSupabase
                .from('notifications')
                .insert({
                    user_id: service.user_id,
                    content: `New booking request for ${service.title}`,
                    type: 'booking',
                    link: '/dashboard'
                })
        }

        revalidatePath('/dashboard');
        redirect(`/payment/${data.id}`)

    } catch (error: any) {
        console.error('Error creating booking:', error)
        throw new Error(error.message || 'Failed to create booking');
    }
}

export async function createBookingJson(formData: FormData): Promise<{ error?: string; success?: boolean; bookingId?: string }> {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired/corrupt session */
    }

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const rawData = {
        serviceId: formData.get('serviceId'),
        date: formData.get('date'),
        guests: formData.get('guests'),
    };

    const parsed = bookingSchema.safeParse(rawData);

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || 'Validation error' };
    }

    const { serviceId, date, guests } = parsed.data;

    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
        return { error: 'Invalid date format' }
    }

    const isAvailable = await checkServiceAvailability(serviceId, date)

    if (!isAvailable) {
        return { error: 'This service is already booked. Please explore our other available services.' }
    }

    const { data, error } = await supabase
        .from('bookings')
        .insert({
            service_id: serviceId,
            user_id: user.id,
            date: parsedDate.toISOString(),
            guests,
            status: 'pending'
        })
        .select()
        .single()

    if (error) {
        if (error.code === '23505') {
            return { error: 'This service is already booked. Please explore our other available services.' }
        }
        console.error('Error creating booking:', error)
        return { error: 'Failed to create booking' }
    }

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
    }

    revalidatePath('/dashboard');
    return { success: true, bookingId: data.id }
}

export async function getBookingDetails(id: string): Promise<any> {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired/corrupt session */
    }

    if (!user) return null

    const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, services(*)')
        .eq('id', id)
        .single()

    if (error || !booking) {
        console.error('Error fetching booking:', error)
        return null
    }

    if (booking.user_id !== user.id) {
        return null
    }

    return booking
}

export async function getUserBookings(): Promise<any[]> {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired/corrupt session */
    }

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

    return bookings || []
}

export async function getProviderStats(): Promise<any> {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired/corrupt session */
    }

    if (!user) return null

    const { data: services } = await supabase
        .from('services')
        .select('id')
        .eq('user_id', user.id)

    if (!services || services.length === 0) return null

    const serviceIds = services.map(s => s.id)

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

    const commissionRate = await getCommissionRate()
    const earningsMultiplier = 1 - commissionRate

    // Calculate escrow balance (paid but not completed)
    const escrow_balance = bookings
        .filter(b => b.status === 'paid')
        .reduce((sum, b) => {
            if (b.provider_earnings !== null) {
                return sum + b.provider_earnings;
            }
            const price = b.services?.price || 0;
            return sum + (price * earningsMultiplier);
        }, 0)

    // Calculate available balance (completed jobs ready for payout)
    const available_balance = bookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => {
            if (b.provider_earnings !== null) {
                return sum + b.provider_earnings;
            }
            const price = b.services?.price || 0;
            return sum + (price * earningsMultiplier);
        }, 0)

    const earnings = escrow_balance + available_balance
    const pendingBookings = bookings.filter(b => b.status === 'pending')

    const completedJobs = bookings
        .filter(b => b.status === 'completed')
        .map(b => ({
            id: b.id,
            service_title: b.services?.title,
            booking_date: b.date,
            amount: b.provider_earnings !== null ? b.provider_earnings : (b.services?.price || 0) * earningsMultiplier
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

export async function updateBookingStatus(bookingId: string, status: 'confirmed' | 'cancelled'): Promise<void> {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired/corrupt session */
    }

    if (!user) throw new Error('Not authenticated')

    const { data: booking } = await supabase
        .from('bookings')
        .select('*, services(user_id)')
        .eq('id', bookingId)
        .single()

    if (!booking || booking.services.user_id !== user.id) {
        throw new Error('Unauthorized')
    }

    if (status === 'cancelled' && booking.status === 'paid') {
        throw new Error('Cannot cancel a paid booking. Please contact support for a refund.')
    }

    const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId)

    if (error) {
        console.error('Failed to update booking status:', error)
        throw new Error('Failed to update booking')
    }

    if (status === 'confirmed') {
        const { error: msgError } = await supabase
            .from('messages')
            .insert({
                service_id: booking.service_id,
                sender_id: user.id,
                receiver_id: booking.user_id,
                content: '✅ I have accepted your booking! Please proceed to payment.'
            })

        if (msgError) {
            console.error('Failed to send auto-accept message:', msgError);
        }
    }

    revalidatePath('/dashboard')
}

export async function completeJob(bookingId: string): Promise<void> {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired/corrupt session */
    }

    if (!user) {
        throw new Error('Not authenticated')
    }

    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('user_id, status')
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        throw new Error('Failed to fetch booking')
    }

    if (booking.user_id !== user.id) {
        throw new Error('Unauthorized')
    }

    if (booking.status !== 'paid') {
        throw new Error('Only paid bookings can be marked as completed')
    }

    const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId)

    if (error) {
        throw new Error(`Failed to complete job: ${error.message}`)
    }

    revalidatePath('/dashboard')
}

export async function initiatePayment(bookingId: string) {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired/corrupt session */
    }

    if (!user) throw new Error('Not authenticated')

    const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, services(price)')
        .eq('id', bookingId)
        .single()

    if (error || !booking) {
        throw new Error('Booking not found')
    }

    if (booking.user_id !== user.id) {
        throw new Error('Unauthorized')
    }

    const price = booking.services.price
    const chapaSecretKey = process.env.CHAPA_SECRET_KEY
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const tx_ref = `tx-ethlink-${bookingId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`

    if (!chapaSecretKey) {
        console.warn('[Chapa] No CHAPA_SECRET_KEY set — running in test/simulation mode.')
        return {
            success: true,
            checkout_url: `${baseUrl}/book/success?bookingId=${bookingId}&simulated=true`,
            tx_ref,
            test_mode: true,
        }
    }

    const payload = {
        amount: String(price),
        currency: 'ETB',
        email: user.email || 'customer@eth-links.com',
        first_name: user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || 'Customer',
        last_name: user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 'User',
        phone_number: user.user_metadata?.phone || undefined,
        tx_ref,
        callback_url: `${baseUrl}/api/payment/callback`,
        return_url: `${baseUrl}/book/success?bookingId=${bookingId}`,
        customization: {
            title: 'Payment for Eth-Links',
            description: 'Thank you for your order!',
        },
        meta: {
            booking_id: bookingId,
        },
    }

    const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${chapaSecretKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })

    if (!response.ok) {
        const errorBody = await response.text()
        console.error('[Chapa] Initialization failed:', response.status, errorBody)
        throw new Error('Payment initialization failed. Please try again.')
    }

    const result = await response.json()

    if (result.status !== 'success' || !result.data?.checkout_url) {
        console.error('[Chapa] Unexpected response:', result)
        throw new Error('Payment initialization failed. Please try again.')
    }

    return {
        success: true,
        checkout_url: result.data.checkout_url,
        tx_ref,
        test_mode: false,
    }
}

export async function verifyPayment(bookingId: string, tx_ref: string) {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired/corrupt session */
    }

    if (!user) throw new Error('Not authenticated')

    if (!txRefSchema.safeParse(tx_ref).success) {
        throw new Error('Invalid transaction reference')
    }

    const provider = detectPaymentProvider(tx_ref)
    if (!provider) {
        throw new Error('Unrecognized payment provider')
    }

    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*, services(price, user_id, title)')
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        throw new Error('Booking not found')
    }

    if (booking.user_id !== user.id) {
        throw new Error('Unauthorized')
    }

    if (booking.status === 'paid') {
        return { success: true, message: 'Already processed' }
    }

    const chapaSecretKey = process.env.CHAPA_SECRET_KEY
    const commissionRate = await getCommissionRate()

    if (!chapaSecretKey) {
        console.warn('[Chapa] No CHAPA_SECRET_KEY — simulating verification success.')

        const price = booking.services.price
        const commission = price * commissionRate
        const earnings = price - commission

        const result = await confirmBookingPaymentAtomic({
            txRef: tx_ref,
            bookingId,
            provider,
            commission,
            providerEarnings: earnings,
        })

        if (result.status === 'error') {
            throw new Error('Failed to update booking status')
        }

        revalidatePath('/dashboard')
        return { success: true }
    }

    const verifyResponse = await fetch(
        `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
        {
            headers: {
                Authorization: `Bearer ${chapaSecretKey}`,
            },
        }
    )

    if (!verifyResponse.ok) {
        const errorBody = await verifyResponse.text()
        console.error('[Chapa] Verification request failed:', verifyResponse.status, errorBody)
        throw new Error('Payment verification failed')
    }

    const verifyResult = await verifyResponse.json()

    if (verifyResult.data?.status !== 'success') {
        console.error('[Chapa] Payment not successful:', verifyResult)
        throw new Error('Payment was not completed successfully')
    }

    const price = booking.services.price
    const commission = price * commissionRate
    const earnings = price - commission

    const result = await confirmBookingPaymentAtomic({
        txRef: tx_ref,
        bookingId,
        provider,
        commission,
        providerEarnings: earnings,
    })

    if (result.status === 'error') {
        throw new Error('Failed to update booking status')
    }

    revalidatePath('/dashboard')
    return { success: true }
}
