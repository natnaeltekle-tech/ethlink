'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CONFIG } from '@/lib/constants'

// ──────────────────────────────────────────────────────────────────────────────
// Chapa Payment Integration for Eth-Links
// ──────────────────────────────────────────────────────────────────────────────
//
// Flow:
//   1. Frontend calls `initiatePayment(bookingId)`.
//   2. This server action POSTs to Chapa's /transaction/initialize endpoint.
//   3. Chapa returns a `checkout_url` — the frontend redirects the user there.
//   4. After payment, Chapa redirects the user to `return_url` (success page).
//   5. Chapa also POSTs to `callback_url` (our webhook at /api/payment/callback).
//   6. The webhook re-verifies the transaction via Chapa's /transaction/verify
//      endpoint and updates the booking in the database.
//
// Environment variables required:
//   - CHAPA_SECRET_KEY: Bearer token for Chapa API (test or live key)
//   - NEXT_PUBLIC_BASE_URL: Base URL of the app (e.g. https://eth-links.com)
//   - CHAPA_WEBHOOK_SECRET (optional): For webhook HMAC signature verification
// ──────────────────────────────────────────────────────────────────────────────

/** Shape of the Chapa /transaction/initialize response */
interface ChapaInitResponse {
    status: string
    message: string
    data: {
        checkout_url: string
    }
}

/** Shape of the Chapa /transaction/verify response */
interface ChapaVerifyResponse {
    status: string
    message: string
    data: {
        first_name: string
        last_name: string
        email: string
        currency: string
        amount: number
        charge: number
        mode: string
        method: string
        type: string
        status: string
        reference: string
        tx_ref: string
        created_at: string
        updated_at: string
    }
}

/**
 * Initiate a Chapa payment for a booking.
 *
 * Generates a unique `tx_ref` that embeds the bookingId so the webhook can
 * look up the booking later. Returns the Chapa `checkout_url` for redirect.
 */
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

    // 1. Fetch the booking to get the REAL price
    const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, services(price)')
        .eq('id', bookingId)
        .single()

    if (error || !booking) {
        throw new Error('Booking not found')
    }

    // Security: ensure the logged-in user owns this booking
    if (booking.user_id !== user.id) {
        throw new Error('Unauthorized')
    }

    const price = booking.services.price
    const chapaSecretKey = process.env.CHAPA_SECRET_KEY
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Generate a unique transaction reference that embeds the bookingId
    // Format: tx-ethlink-<bookingId>-<timestamp>-<random>
    const tx_ref = `tx-ethlink-${bookingId}-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // ── Test-mode fallback ──────────────────────────────────────────────
    // If no CHAPA_SECRET_KEY is configured, return a simulated response
    // so development/testing can proceed without a real Chapa account.
    if (!chapaSecretKey) {
        console.warn('[Chapa] No CHAPA_SECRET_KEY set — running in test/simulation mode.')
        return {
            success: true,
            checkout_url: `${baseUrl}/book/success?bookingId=${bookingId}&simulated=true`,
            tx_ref,
            test_mode: true,
        }
    }

    // ── Production Chapa API call ───────────────────────────────────────
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

    const result: ChapaInitResponse = await response.json()

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

/**
 * Verify a Chapa transaction by its `tx_ref`.
 *
 * This calls Chapa's /transaction/verify endpoint to confirm the payment
 * was actually completed. Used by the webhook handler and can also be
 * called manually for debugging.
 */
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

    const chapaSecretKey = process.env.CHAPA_SECRET_KEY

    if (!chapaSecretKey) {
        // Test mode: simulate success
        console.warn('[Chapa] No CHAPA_SECRET_KEY — simulating verification success.')

        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select('*, services(price, user_id, title)')
            .eq('id', bookingId)
            .single()

        if (fetchError || !booking) {
            throw new Error('Booking not found')
        }

        if (booking.status === 'paid') {
            return { success: true, message: 'Already processed' }
        }

        const price = booking.services.price
        const commission = price * CONFIG.COMMISSION_RATE
        const earnings = price - commission

        const { error: updateError } = await supabase
            .from('bookings')
            .update({
                status: 'paid',
                commission_amount: commission,
                provider_earnings: earnings,
            })
            .eq('id', bookingId)
            .eq('user_id', booking.user_id)

        if (updateError) {
            console.error('Error updating payment status:', updateError)
            throw new Error('Failed to update booking status')
        }

        revalidatePath('/dashboard')
        return { success: true }
    }

    // ── Production: verify with Chapa API ───────────────────────────────
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

    const verifyResult: ChapaVerifyResponse = await verifyResponse.json()

    if (verifyResult.data?.status !== 'success') {
        console.error('[Chapa] Payment not successful:', verifyResult)
        throw new Error('Payment was not completed successfully')
    }

    // Verification passed — update the booking
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*, services(price, user_id, title)')
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        throw new Error('Booking verification failed: Booking not found')
    }

    if (booking.status === 'paid') {
        return { success: true, message: 'Already processed' }
    }

    const price = booking.services.price
    const commission = price * CONFIG.COMMISSION_RATE
    const earnings = price - commission

    const { error: updateError } = await supabase
        .from('bookings')
        .update({
            status: 'paid',
            commission_amount: commission,
            provider_earnings: earnings,
        })
        .eq('id', bookingId)
        .eq('user_id', booking.user_id)

    if (updateError) {
        console.error('Error updating payment status:', updateError)
        throw new Error('Failed to update booking status')
    }

    revalidatePath('/dashboard')
    return { success: true }
}
