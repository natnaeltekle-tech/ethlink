import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCommissionRate } from '@/lib/actions/payments'
import { paymentWebhookSchema } from '@/lib/validations'
import { z } from 'zod'
import { logApiError } from '@/lib/api-error'
import {
    confirmBookingPaymentAtomic,
    detectPaymentProvider,
    extractBookingIdFromTxRef,
    logPaymentEvent,
    withRetry,
} from '@/lib/services/payments'
import { Booking } from '@/lib/types/database'

interface ChapaVerifyResponse {
    data?: { status?: string; amount?: string | number }
}

function getWebhookSecret(): string | undefined {
    return process.env.CHAPA_WEBHOOK_SECRET
}

function getSignatureHeader(request: NextRequest): string | null {
    return (
        request.headers.get('x-chapa-signature') ||
        request.headers.get('chapa-signature') ||
        request.headers.get('x-signature')
    )
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

    try {
        const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
        const receivedBuffer = Buffer.from(signatureHeader, 'utf8')

        if (expectedBuffer.length !== receivedBuffer.length) {
            return false
        }

        return timingSafeEqual(expectedBuffer, receivedBuffer)
    } catch {
        return false
    }
}

async function confirmChapaPayment(
    txRef: string
): Promise<{ confirmed: boolean; ackMessage: string; paidAmount?: number }> {
    const chapaSecretKey = process.env.CHAPA_SECRET_KEY

    if (!chapaSecretKey) {
        console.error('[Payment Webhook] CHAPA_SECRET_KEY not configured')
        return { confirmed: false, ackMessage: 'acknowledged (chapa not configured)' }
    }

    const verifyResponse = await withRetry(async () => {
        const response = await fetch(
            `https://api.chapa.co/v1/transaction/verify/${txRef}`,
            {
                headers: { Authorization: `Bearer ${chapaSecretKey}` },
            }
        )

        if (response.status >= 500) {
            throw new Error(`Chapa verify transient failure: ${response.status}`)
        }

        return response
    }, { attempts: 3, delayMs: 500 })

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

    const paidAmount = parseFloat(String(verifyResult.data.amount ?? '0'))

    return { confirmed: true, ackMessage: 'success', paidAmount }
}

type BookingWithService = Booking & { services: { price: number; user_id: string } }

export async function POST(request: NextRequest) {
    let rawBody = ''

    try {
        const contentLength = request.headers.get('content-length')
        if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) {
            return NextResponse.json({ code: 1, msg: 'Payload too large' }, { status: 413 })
        }

        rawBody = await request.text()
        if (rawBody.length > 1024 * 1024) {
            return NextResponse.json({ code: 1, msg: 'Payload too large' }, { status: 413 })
        }

        let parsedBody: unknown
        try {
            parsedBody = JSON.parse(rawBody)
        } catch {
            return NextResponse.json({ code: 1, msg: 'Invalid JSON payload' }, { status: 400 })
        }

        const bodyResult = paymentWebhookSchema.safeParse(parsedBody)
        if (!bodyResult.success) {
            return NextResponse.json(
                { code: 1, msg: 'Missing or invalid tx_ref' },
                { status: 400 }
            )
        }

        const body = bodyResult.data
        const txRef = body.tx_ref
        console.log('[Payment Webhook] Received callback for tx_ref:', txRef)

        const provider = detectPaymentProvider(txRef)
        if (!provider) {
            console.error('[Payment Webhook] Unrecognized payment provider for tx_ref:', txRef)
            return NextResponse.json(
                { code: 1, msg: 'Unrecognized payment provider' },
                { status: 400 }
            )
        }

        await logPaymentEvent({
            txRef,
            provider,
            status: 'received',
            payload: { status: body.status, hasMeta: Boolean(body.meta) },
        })

        const webhookSecret = getWebhookSecret()
        if (!webhookSecret) {
            console.error('[Payment Webhook] Chapa webhook secret not configured')
            return NextResponse.json(
                { code: 1, msg: 'Payment provider not configured' },
                { status: 503 }
            )
        }

        const signature = getSignatureHeader(request)
        if (!verifyProviderSignature(rawBody, signature, webhookSecret)) {
            console.error('[Payment Webhook] Chapa signature verification failed')
            return NextResponse.json(
                { code: 1, msg: 'Unauthorized: signature verification failed' },
                { status: 401 }
            )
        }

        console.log('[Payment Webhook] Chapa signature verified.')

        const { confirmed, ackMessage, paidAmount } = await confirmChapaPayment(txRef)
        if (!confirmed) {
            await logPaymentEvent({
                txRef,
                provider,
                status: 'ignored',
                message: ackMessage,
                payload: { status: body.status },
            })
            return NextResponse.json({ code: 0, msg: ackMessage })
        }

        await logPaymentEvent({ txRef, provider, status: 'verified' })

        const bookingId = extractBookingIdFromTxRef(txRef) || body.meta?.booking_id
        if (!bookingId) {
            console.error('[Payment Webhook] Could not extract bookingId from tx_ref:', txRef)
            await logPaymentEvent({
                txRef,
                provider,
                status: 'ignored',
                message: 'no_booking_id',
            })
            return NextResponse.json({ code: 0, msg: 'acknowledged (no booking ID)' })
        }

        const adminSupabase = createAdminClient()
        const { data, error: fetchError } = await adminSupabase
            .from('bookings')
            .select('*, services(price, user_id)')
            .eq('id', bookingId)
            .single()

        if (fetchError || !data) {
            console.error('[Payment Webhook] Booking not found:', bookingId)
            await logPaymentEvent({
                txRef,
                bookingId,
                provider,
                status: 'ignored',
                message: 'booking_not_found',
            })
            return NextResponse.json({ code: 0, msg: 'acknowledged (booking not found)' })
        }

        const booking = data as BookingWithService
        const price = booking.services.price

        // S2: Verify paid amount matches booking price (±1 ETB tolerance for rounding)
        if (paidAmount === undefined || Math.abs(paidAmount - price) > 1) {
            console.error('[Payment Webhook] Amount mismatch! Paid:', paidAmount, 'Expected:', price)
            await logPaymentEvent({
                txRef,
                bookingId,
                provider,
                status: 'ignored',
                message: 'amount_mismatch',
                payload: { paidAmount: paidAmount ?? null, expectedPrice: price },
            })
            return NextResponse.json({ code: 0, msg: 'acknowledged (amount mismatch)' })
        }

        const commissionRate = await getCommissionRate()
        const commission = price * commissionRate
        const earnings = price - commission

        const result = await confirmBookingPaymentAtomic({
            txRef,
            bookingId,
            provider,
            commission,
            providerEarnings: earnings,
        })

        if (result.status === 'error') {
            if (result.message === 'booking_not_found') {
                return NextResponse.json({ code: 0, msg: 'acknowledged (booking not found)' })
            }

            console.error('[Payment Webhook] Atomic payment confirmation failed:', result.message)
            await logPaymentEvent({
                txRef,
                bookingId,
                provider,
                status: 'failed',
                message: result.message,
            })
            return NextResponse.json(
                { code: 1, msg: 'Failed to update booking' },
                { status: 500 }
            )
        }

        if (result.status === 'already_processed') {
            console.log('[Payment Webhook] Payment already processed:', txRef)
            await logPaymentEvent({ txRef, bookingId, provider, status: 'already_processed' })
            return NextResponse.json({ code: 0, msg: 'already processed' })
        }

        console.log('[Payment Webhook] Booking updated to paid:', bookingId)
        await logPaymentEvent({ txRef, bookingId, provider, status: 'processed' })
        return NextResponse.json({ code: 0, msg: 'success' })
    } catch (error) {
        logApiError('payment/callback', error, { txRef: rawBody ? 'present' : 'empty' })
        // Non-2xx so Chapa retries delivery (only reachable after successful signature verification)
        return NextResponse.json(
            { code: 1, msg: 'Internal error while processing webhook' },
            { status: 500 }
        )
    }
}
