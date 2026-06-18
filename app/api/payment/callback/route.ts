import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHmac } from 'crypto'
import { txRefSchema } from '@/lib/validations'
import { getCommissionRate } from '@/lib/actions/payments'
import { Booking } from '@/lib/types/database'

interface WebhookPayload {
    tx_ref: string
    status: string
    [key: string]: unknown
}

interface ChapaVerifyResponse {
    data?: { status?: string }
}

type PaymentProvider = 'chapa' | 'telebirr' | 'cbe'

function detectPaymentProvider(txRef: string): PaymentProvider | null {
    if (txRef.startsWith('tx-ethlink-')) return 'chapa'
    if (txRef.startsWith('tx-telebirr-')) return 'telebirr'
    if (txRef.startsWith('tx-cbe-')) return 'cbe'
    return null
}

function getProviderWebhookSecret(provider: PaymentProvider): string | undefined {
    switch (provider) {
        case 'chapa':
            return process.env.CHAPA_WEBHOOK_SECRET
        case 'telebirr':
            return process.env.TELEBIRR_PUBLIC_KEY
        case 'cbe':
            return process.env.CBE_BIRR_SECRET
    }
}

function getSignatureHeader(request: NextRequest, provider: PaymentProvider): string | null {
    switch (provider) {
        case 'chapa':
            return (
                request.headers.get('x-chapa-signature') ||
                request.headers.get('chapa-signature') ||
                request.headers.get('x-signature')
            )
        case 'telebirr':
            return (
                request.headers.get('x-telebirr-signature') ||
                request.headers.get('x-signature')
            )
        case 'cbe':
            return (
                request.headers.get('x-cbe-signature') ||
                request.headers.get('x-signature')
            )
    }
}

function verifyProviderSignature(
    rawBody: string,
    signatureHeader: string | null,
    secret: string | undefined
): boolean {
    if (!signatureHeader || !secret) {
        return false
    }

    const expectedSignature = createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')

    return expectedSignature === signatureHeader
}

async function confirmChapaPayment(
    txRef: string
): Promise<{ confirmed: boolean; ackMessage: string }> {
    const chapaSecretKey = process.env.CHAPA_SECRET_KEY
    const isProduction = process.env.NODE_ENV === 'production'

    if (!chapaSecretKey) {
        console.error('[Payment Webhook] CHAPA_SECRET_KEY not configured')
        return {
            confirmed: false,
            ackMessage: isProduction
                ? 'acknowledged (chapa not configured)'
                : 'acknowledged (chapa not configured)',
        }
    }

    const verifyResponse = await fetch(
        `https://api.chapa.co/v1/transaction/verify/${txRef}`,
        {
            headers: { Authorization: `Bearer ${chapaSecretKey}` },
        }
    )

    if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text()
        console.error('[Payment Webhook] Chapa verify API error:', verifyResponse.status, errorText)
        return { confirmed: false, ackMessage: 'acknowledged (verify failed)' }
    }

    const verifyResult = (await verifyResponse.json()) as ChapaVerifyResponse
    if (verifyResult.data?.status !== 'success') {
        console.warn('[Payment Webhook] Transaction status not success:', verifyResult.data?.status)
        return { confirmed: false, ackMessage: 'acknowledged (not successful)' }
    }

    return { confirmed: true, ackMessage: 'success' }
}

function confirmWebhookOnlyPayment(
    provider: 'telebirr' | 'cbe',
    body: WebhookPayload
): { confirmed: boolean; ackMessage: string } {
    // No provider verify API in codebase — require explicit success in webhook payload
    if (body.status !== 'success') {
        console.warn(`[Payment Webhook] ${provider} webhook status not success:`, body.status)
        return { confirmed: false, ackMessage: 'acknowledged (not successful)' }
    }

    return { confirmed: true, ackMessage: 'success' }
}

async function confirmPaymentWithProvider(
    provider: PaymentProvider,
    txRef: string,
    body: WebhookPayload
): Promise<{ confirmed: boolean; ackMessage: string }> {
    switch (provider) {
        case 'chapa':
            return confirmChapaPayment(txRef)
        case 'telebirr':
        case 'cbe':
            return confirmWebhookOnlyPayment(provider, body)
    }
}

type BookingWithService = Booking & { services: { price: number; user_id: string } }

function extractBookingId(txRef: string): string | null {
    const parts = txRef.split('-')
    if (parts.length < 8) return null
    return parts.slice(2, 7).join('-')
}

export async function POST(request: NextRequest) {
    let rawBody = ''

    try {
        // Limit body size to 1MB
        const contentLength = request.headers.get('content-length')
        if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) {
            return NextResponse.json({ code: 1, msg: 'Payload too large' }, { status: 413 })
        }

        rawBody = await request.text()
        if (rawBody.length > 1024 * 1024) {
            return NextResponse.json({ code: 1, msg: 'Payload too large' }, { status: 413 })
        }

        const body: WebhookPayload = JSON.parse(rawBody)
        console.log('[Payment Webhook] Received callback for tx_ref:', body.tx_ref)

        // Validate tx_ref format
        if (!body.tx_ref || !txRefSchema.safeParse(body.tx_ref).success) {
            return NextResponse.json(
                { code: 1, msg: 'Missing or invalid tx_ref' },
                { status: 400 }
            )
        }

        const txRef = body.tx_ref
        const provider = detectPaymentProvider(txRef)

        if (!provider) {
            console.error('[Payment Webhook] Unrecognized payment provider for tx_ref:', txRef)
            return NextResponse.json(
                { code: 1, msg: 'Unrecognized payment provider' },
                { status: 400 }
            )
        }

        const webhookSecret = getProviderWebhookSecret(provider)
        if (!webhookSecret) {
            console.error(`[Payment Webhook] ${provider} webhook secret not configured`)
            return NextResponse.json(
                { code: 1, msg: 'Payment provider not configured' },
                { status: 503 }
            )
        }

        const signature = getSignatureHeader(request, provider)
        if (!verifyProviderSignature(rawBody, signature, webhookSecret)) {
            console.error(`[Payment Webhook] ${provider} signature verification failed`)
            return NextResponse.json(
                { code: 1, msg: 'Unauthorized: signature verification failed' },
                { status: 401 }
            )
        }

        console.log(`[Payment Webhook] ${provider} signature verified.`)

        const { confirmed, ackMessage } = await confirmPaymentWithProvider(provider, txRef, body)
        if (!confirmed) {
            return NextResponse.json({ code: 0, msg: ackMessage })
        }

        const meta = body.meta as Record<string, string> | undefined
        const bookingId = extractBookingId(txRef) || meta?.booking_id

        if (!bookingId) {
            console.error('[Payment Webhook] Could not extract bookingId from tx_ref:', txRef)
            return NextResponse.json({ code: 0, msg: 'acknowledged (no booking ID)' })
        }

        const adminSupabase = createAdminClient()

        // Fetch booking to get price for commission calculation
        const { data, error: fetchError } = await adminSupabase
            .from('bookings')
            .select('*, services(price, user_id)')
            .eq('id', bookingId)
            .single()

        if (fetchError || !data) {
            console.error('[Payment Webhook] Booking not found:', bookingId)
            return NextResponse.json({ code: 0, msg: 'acknowledged (booking not found)' })
        }

        const booking = data as BookingWithService

        if (booking.status === 'paid') {
            console.log('[Payment Webhook] Booking already paid — skipping:', bookingId)
            return NextResponse.json({ code: 0, msg: 'already processed' })
        }

        // Calculate dynamic commission and update booking
        const price = booking.services.price
        const commissionRate = await getCommissionRate()
        const commission = price * commissionRate
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
            console.error('[Payment Webhook] Failed to update booking:', updateError)
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

        console.log('[Payment Webhook] Booking updated to paid:', bookingId)
        return NextResponse.json({ code: 0, msg: 'success' })
    } catch (error) {
        console.error('[Payment Webhook] Unhandled error:', error)
        return NextResponse.json({ code: 0, msg: 'acknowledged (internal error)' })
    }
}
