import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CONFIG } from '@/lib/constants'
import { createHmac } from 'crypto'
import { txRefSchema } from '@/lib/validations'

// ──────────────────────────────────────────────────────────────────────────────
// Chapa Webhook / Callback Handler
// ──────────────────────────────────────────────────────────────────────────────
//
// Chapa sends a POST to this endpoint when a payment status changes.
//
// CRITICAL SECURITY: Never trust the webhook payload alone!
//   1. Verify the webhook signature (HMAC-SHA256) if CHAPA_WEBHOOK_SECRET is set.
//   2. Always re-verify the transaction by calling Chapa's /transaction/verify
//      endpoint with the tx_ref, using your secret key.
//   3. Only mark the booking as paid if the verification returns status "success".
//
// This ensures an attacker cannot forge webhook calls to mark bookings as paid.
// ──────────────────────────────────────────────────────────────────────────────

/** Shape of the Chapa webhook payload */
interface ChapaWebhookPayload {
    tx_ref: string
    status: string
    [key: string]: unknown
}

/** Shape of the Chapa /transaction/verify response */
interface ChapaVerifyResponse {
    status: string
    data: {
        status: string
        amount: number
        tx_ref: string
        [key: string]: unknown
    }
}

/**
 * Verify the webhook request signature using HMAC-SHA256.
 * Returns true if the signature matches, or if no webhook secret is configured.
 */
function verifyWebhookSignature(
    body: string,
    signatureHeader: string | null,
    secret: string | undefined
): boolean {
    if (!secret) {
        // No webhook secret configured — skip signature check.
        // This is acceptable in development but should be configured in production.
        console.warn('[Chapa Webhook] No CHAPA_WEBHOOK_SECRET set — skipping signature verification.')
        return true
    }

    if (!signatureHeader) {
        console.error('[Chapa Webhook] Missing signature header.')
        return false
    }

    const expectedSignature = createHmac('sha256', secret)
        .update(body)
        .digest('hex')

    return expectedSignature === signatureHeader
}

/**
 * Extract the bookingId from a tx_ref.
 * Our tx_ref format: tx-ethlink-<bookingId>-<timestamp>-<random>
 */
function extractBookingId(txRef: string): string | null {
    const parts = txRef.split('-')
    // tx-ethlink-<uuid parts>-<timestamp>-<random>
    // UUID has 5 parts separated by dashes, so bookingId = parts[2] through parts[6]
    if (parts.length < 8) return null
    // Reconstruct the UUID (5 dash-separated segments)
    return parts.slice(2, 7).join('-')
}

export async function POST(request: NextRequest) {
    let rawBody = ''

    try {
        // ── DoS Protection: Limit body size to 1MB ────────────────────────
        const contentLength = request.headers.get('content-length')
        if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) {
            return NextResponse.json({ code: 1, msg: 'Payload too large' }, { status: 413 })
        }

        // Read raw body for signature verification
        rawBody = await request.text()
        
        // Double check length after reading
        if (rawBody.length > 1024 * 1024) {
            return NextResponse.json({ code: 1, msg: 'Payload too large' }, { status: 413 })
        }

        const body: ChapaWebhookPayload = JSON.parse(rawBody)

        console.log('[Chapa Webhook] Received callback for tx_ref:', body.tx_ref)

        // Validate tx_ref format
        if (!body.tx_ref || !txRefSchema.safeParse(body.tx_ref).success) {
            return NextResponse.json(
                { code: 1, msg: 'Missing or invalid tx_ref' },
                { status: 400 }
            )
        }

        // ── Step 1: Verify webhook signature ────────────────────────────
        const signature =
            request.headers.get('x-chapa-signature') ||
            request.headers.get('chapa-signature')

        const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET

        if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
            console.error('[Chapa Webhook] Invalid signature — rejecting request.')
            return NextResponse.json(
                { code: 1, msg: 'Invalid signature' },
                { status: 401 }
            )
        }

        const txRef = body.tx_ref
        if (!txRef) {
            return NextResponse.json(
                { code: 1, msg: 'Missing tx_ref' },
                { status: 400 }
            )
        }

        // ── Step 2: Re-verify the transaction with Chapa API ────────────
        // This is the critical security step: never rely on the webhook
        // payload alone. An attacker could POST a fake "success" payload.
        // We call Chapa's verify endpoint to confirm the payment is real.

        const chapaSecretKey = process.env.CHAPA_SECRET_KEY
        if (!chapaSecretKey) {
            console.error('[Chapa Webhook] No CHAPA_SECRET_KEY — cannot verify transaction.')
            // Still return 200 to acknowledge receipt, but log the error
            return NextResponse.json({ code: 0, msg: 'acknowledged (unverified — no key)' })
        }

        const verifyResponse = await fetch(
            `https://api.chapa.co/v1/transaction/verify/${txRef}`,
            {
                headers: { Authorization: `Bearer ${chapaSecretKey}` },
            }
        )

        if (!verifyResponse.ok) {
            const errorText = await verifyResponse.text()
            console.error('[Chapa Webhook] Verify API error:', verifyResponse.status, errorText)
            // Return 200 to avoid Chapa retrying; log for investigation
            return NextResponse.json({ code: 0, msg: 'acknowledged (verify failed)' })
        }

        const verifyResult: ChapaVerifyResponse = await verifyResponse.json()

        if (verifyResult.data?.status !== 'success') {
            console.warn('[Chapa Webhook] Transaction not successful:', verifyResult.data?.status)
            return NextResponse.json({ code: 0, msg: 'acknowledged (not successful)' })
        }

        console.log('[Chapa Webhook] Transaction verified successfully for tx_ref:', txRef)

        // ── Step 3: Extract booking ID and update database ──────────────
        const meta = body.meta as Record<string, string> | undefined
        const bookingId = extractBookingId(txRef) || meta?.booking_id

        if (!bookingId) {
            console.error('[Chapa Webhook] Could not extract bookingId from tx_ref:', txRef)
            return NextResponse.json({ code: 0, msg: 'acknowledged (no booking ID)' })
        }

        const adminSupabase = createAdminClient()

        // Fetch booking to get price for commission calculation
        const { data: booking, error: fetchError } = await adminSupabase
            .from('bookings')
            .select('*, services(price)')
            .eq('id', bookingId)
            .single()

        if (fetchError || !booking) {
            console.error('[Chapa Webhook] Booking not found:', bookingId)
            return NextResponse.json({ code: 0, msg: 'acknowledged (booking not found)' })
        }

        // Idempotency: skip if already paid
        if (booking.status === 'paid') {
            console.log('[Chapa Webhook] Booking already paid — skipping:', bookingId)
            return NextResponse.json({ code: 0, msg: 'already processed' })
        }

        // Calculate commission and update booking
        const price = booking.services.price
        const commission = price * CONFIG.COMMISSION_RATE
        const earnings = price - commission

        const { error: updateError } = await adminSupabase
            .from('bookings')
            .update({
                status: 'paid',
                commission_amount: commission,
                provider_earnings: earnings,
            })
            .eq('id', bookingId)

        if (updateError) {
            console.error('[Chapa Webhook] Failed to update booking:', updateError)
            return NextResponse.json(
                { code: 1, msg: 'Failed to update booking' },
                { status: 500 }
            )
        }

        // Send notification to user
        await adminSupabase
            .from('notifications')
            .insert({
                user_id: booking.user_id,
                content: 'Payment Received — your booking is confirmed!',
                type: 'payment',
                link: '/dashboard',
            })

        console.log('[Chapa Webhook] Booking updated to paid:', bookingId)
        return NextResponse.json({ code: 0, msg: 'success' })
    } catch (error) {
        console.error('[Chapa Webhook] Unhandled error:', error)
        // Always return 200 to prevent Chapa from retrying on our errors
        return NextResponse.json({ code: 0, msg: 'acknowledged (internal error)' })
    }
}
