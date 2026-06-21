'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { txRefSchema } from '@/lib/validations'
import {
    confirmBookingPaymentAtomic,
    detectPaymentProvider,
} from '@/lib/services/payments'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ─── Dynamic Commission Configuration ──────────────────────────────────────
export async function getCommissionRate(): Promise<number> {
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
