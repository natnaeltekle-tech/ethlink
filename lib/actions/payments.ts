'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { txRefSchema } from '@/lib/validations'
import {
    confirmBookingPaymentAtomic,
    detectPaymentProvider,
    extractBookingIdFromTxRef,
    logPaymentEvent,
} from '@/lib/services/payments'
import { isSimulationMode, isSimulationAutoConfirm } from '@/lib/payment-mode'
import { sendReceiptEmail } from '@/lib/receipt-email'
import { formatBookingDateTime } from '@/lib/booking-time'
import { revalidatePath } from 'next/cache'

export async function getCommissionRate(): Promise<number> {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'commission_rate')
        .single()

    if (error || !data) {
        return 0.10
    }
    return parseFloat(data.value)
}

function buildTxRef(bookingId: string, suffix = 'pay'): string {
    const clean = suffix.replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'pay'
    return `tx-ethlink-${bookingId}-${Date.now()}-${clean}${crypto.randomUUID().slice(0, 6)}`
}

async function notifyCustomerPaid(params: {
    userId: string
    email?: string | null
    bookingId: string
    serviceTitle: string
    amount: number
    scheduledAt: string
}) {
    const adminSupabase = createAdminClient()
    try {
        await adminSupabase.from('notifications').insert({
            user_id: params.userId,
            content: `Payment confirmed for ${params.serviceTitle} (${params.amount} ETB). Tap to view your receipt.`,
            type: 'payment',
            link: `/book/success?bookingId=${params.bookingId}`,
        })
    } catch (e) {
        console.warn('[Payments] customer notify skipped:', e)
    }

    if (params.email) {
        void sendReceiptEmail({
            to: params.email,
            bookingId: params.bookingId,
            serviceTitle: params.serviceTitle,
            amount: params.amount,
            scheduledLabel: formatBookingDateTime(params.scheduledAt),
            reference: params.bookingId.slice(0, 8).toUpperCase(),
        })
    }
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
        .select('*, services(price, title)')
        .eq('id', bookingId)
        .single()

    if (error || !booking) {
        throw new Error('Booking not found')
    }

    if (booking.user_id !== user.id) {
        throw new Error('Unauthorized')
    }

    if (booking.status === 'paid' || booking.status === 'confirmed' || booking.status === 'completed') {
        throw new Error('This booking is already paid')
    }

    const price = booking.services.price
    const serviceTitle = booking.services.title || 'Service'
    const chapaSecretKey = process.env.CHAPA_SECRET_KEY
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const simulation = isSimulationMode()
    const autoConfirm = isSimulationAutoConfirm()
    const tx_ref = buildTxRef(bookingId, simulation ? 'sim' : 'pay')

    // ── Simulation path (no live Chapa) ─────────────────────────────────────
    if (simulation || !chapaSecretKey) {
        await logPaymentEvent({
            txRef: tx_ref,
            bookingId,
            provider: 'chapa',
            status: 'received',
            message: autoConfirm ? 'simulation_auto_pay' : 'simulation_payment_intent',
            payload: {
                mode: 'simulation',
                auto_confirm: autoConfirm,
                amount: price,
                user_id: user.id,
                source: 'initiatePayment',
            },
        })

        if (autoConfirm) {
            // User pays → mark paid immediately (same RPC as live webhooks).
            // You do NOT need to click Confirm on every payment.
            const commissionRate = await getCommissionRate()
            const commission = price * commissionRate
            const earnings = price - commission

            const result = await confirmBookingPaymentAtomic({
                txRef: tx_ref,
                bookingId,
                provider: 'chapa',
                commission,
                providerEarnings: earnings,
            })

            if (result.status === 'error') {
                console.error('[Payments] Simulation auto-confirm failed:', result.message)
                throw new Error('Could not complete payment. Please try again.')
            }

            await logPaymentEvent({
                txRef: tx_ref,
                bookingId,
                provider: 'chapa',
                status: 'processed',
                message: 'simulation_auto_confirmed',
                payload: { amount: price },
            })

            await notifyCustomerPaid({
                userId: user.id,
                email: user.email,
                bookingId,
                serviceTitle,
                amount: price,
                scheduledAt: booking.date,
            })

            revalidatePath('/dashboard')
            revalidatePath('/admin')

            return {
                success: true,
                checkout_url: `${baseUrl}/book/success?bookingId=${bookingId}&tx_ref=${encodeURIComponent(tx_ref)}`,
                tx_ref,
                test_mode: true,
                simulation: true,
                auto_confirmed: true,
            }
        }

        // Manual admin-confirm mode (SIMULATION_AUTO_CONFIRM=false)
        try {
            const adminSupabase = createAdminClient()
            const { data: adminProfile } = await adminSupabase
                .from('profiles')
                .select('id')
                .eq('role', 'admin')
                .limit(5)

            const adminIds = (adminProfile ?? []).map((p: { id: string }) => p.id)
            if (adminIds.length > 0) {
                await adminSupabase.from('notifications').insert(
                    adminIds.map((id: string) => ({
                        user_id: id,
                        content: `Payment pending confirmation — booking ${bookingId.slice(0, 8).toUpperCase()} (${price} ETB)`,
                        type: 'payment',
                        link: '/admin',
                    }))
                )
            }
        } catch (e) {
            console.warn('[Payments] Admin notify skipped:', e)
        }

        return {
            success: true,
            checkout_url: `${baseUrl}/book/success?bookingId=${bookingId}&tx_ref=${encodeURIComponent(tx_ref)}&simulated=1`,
            tx_ref,
            test_mode: true,
            simulation: true,
            auto_confirmed: false,
        }
    }

    // ── Live Chapa path ─────────────────────────────────────────────────────
    const payload = {
        amount: String(price),
        currency: 'ETB',
        email: user.email || 'customer@eth-links.com',
        first_name:
            user.user_metadata?.first_name ||
            user.user_metadata?.full_name?.split(' ')[0] ||
            'Customer',
        last_name:
            user.user_metadata?.last_name ||
            user.user_metadata?.full_name?.split(' ').slice(1).join(' ') ||
            'User',
        phone_number: user.user_metadata?.phone || undefined,
        tx_ref,
        callback_url: `${baseUrl}/api/payment/callback`,
        return_url: `${baseUrl}/book/success?bookingId=${bookingId}&tx_ref=${tx_ref}`,
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

    await logPaymentEvent({
        txRef: tx_ref,
        bookingId,
        provider: 'chapa',
        status: 'received',
        message: 'chapa_initialize_success',
        payload: { mode: 'live', amount: price },
    })

    return {
        success: true,
        checkout_url: result.data.checkout_url,
        tx_ref,
        test_mode: false,
        simulation: false,
        auto_confirmed: false,
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

    if (isSimulationMode()) {
        if (!isSimulationAutoConfirm()) {
            return {
                success: false,
                message: 'Simulation mode — payment awaits admin confirmation',
                pending: true,
            }
        }
        // Allow verify path to confirm in auto mode (idempotent)
        const price = booking.services.price
        const commissionRate = await getCommissionRate()
        const result = await confirmBookingPaymentAtomic({
            txRef: tx_ref,
            bookingId,
            provider,
            commission: price * commissionRate,
            providerEarnings: price - price * commissionRate,
        })
        if (result.status === 'error') throw new Error('Failed to update booking status')
        revalidatePath('/dashboard')
        return { success: true }
    }

    const chapaSecretKey = process.env.CHAPA_SECRET_KEY
    const commissionRate = await getCommissionRate()

    if (!chapaSecretKey) {
        throw new Error('Payment gateway is not configured')
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

    const paidAmount = parseFloat(verifyResult.data?.amount ?? '0')
    const expectedPrice = booking.services.price
    if (Math.abs(paidAmount - expectedPrice) > 1) {
        console.error('[Chapa] Amount mismatch! Paid:', paidAmount, 'Expected:', expectedPrice)
        throw new Error('Payment amount does not match booking price')
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

export type ReconcileResult =
    | { status: 'paid' }
    | { status: 'pending' }
    | { status: 'failed'; message: string }

export async function reconcileBookingPayment(
    bookingId: string,
    txRef?: string | null
): Promise<ReconcileResult> {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired/corrupt session */
    }

    if (!user) return { status: 'failed', message: 'Not authenticated' }

    const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, services(price)')
        .eq('id', bookingId)
        .single()

    if (error || !booking || booking.user_id !== user.id) {
        return { status: 'failed', message: 'Booking not found' }
    }

    if (booking.status === 'paid') {
        revalidatePath('/dashboard')
        return { status: 'paid' }
    }

    if (isSimulationMode() && !isSimulationAutoConfirm()) {
        return { status: 'pending' }
    }

    const candidates: string[] = []
    if (
        txRef &&
        txRefSchema.safeParse(txRef).success &&
        detectPaymentProvider(txRef) === 'chapa' &&
        extractBookingIdFromTxRef(txRef) === bookingId
    ) {
        candidates.push(txRef)
    }

    try {
        const adminSupabase = createAdminClient() as any
        const { data: events } = await adminSupabase
            .from('payment_webhook_events')
            .select('tx_ref')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: false })
            .limit(5)

        for (const ref of ((events ?? []) as { tx_ref: string | null }[])
            .map((e) => e.tx_ref)
            .filter((r): r is string => Boolean(r))) {
            if (!candidates.includes(ref)) candidates.push(ref)
        }
    } catch {
        /* best-effort */
    }

    // Simulation auto-confirm: confirm with recorded tx_ref if still pending
    if (isSimulationMode() && isSimulationAutoConfirm() && candidates.length > 0) {
        const price = booking.services.price
        const commissionRate = await getCommissionRate()
        for (const candidate of candidates) {
            const result = await confirmBookingPaymentAtomic({
                txRef: candidate,
                bookingId,
                provider: 'chapa',
                commission: price * commissionRate,
                providerEarnings: price - price * commissionRate,
            })
            if (result.status === 'success' || result.status === 'already_processed') {
                revalidatePath('/dashboard')
                return { status: 'paid' }
            }
        }
    }

    const chapaSecretKey = process.env.CHAPA_SECRET_KEY
    if (!chapaSecretKey || isSimulationMode()) {
        return { status: 'pending' }
    }

    for (const candidate of candidates) {
        try {
            const verifyResponse = await fetch(
                `https://api.chapa.co/v1/transaction/verify/${candidate}`,
                { headers: { Authorization: `Bearer ${chapaSecretKey}` } }
            )
            if (!verifyResponse.ok) continue

            const verifyResult = await verifyResponse.json()
            if (verifyResult.data?.status !== 'success') continue

            const paidAmount = parseFloat(verifyResult.data?.amount ?? '0')
            if (Math.abs(paidAmount - booking.services.price) > 1) continue

            const price = booking.services.price
            const commissionRate = await getCommissionRate()
            const result = await confirmBookingPaymentAtomic({
                txRef: candidate,
                bookingId,
                provider: detectPaymentProvider(candidate)!,
                commission: price * commissionRate,
                providerEarnings: price - price * commissionRate,
            })

            if (result.status === 'success' || result.status === 'already_processed') {
                revalidatePath('/dashboard')
                return { status: 'paid' }
            }
        } catch {
            /* next */
        }
    }

    const { data: refreshed } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', bookingId)
        .single()

    if (refreshed?.status === 'paid') {
        revalidatePath('/dashboard')
        return { status: 'paid' }
    }

    return { status: 'pending' }
}

export async function getPublicPaymentMode(): Promise<'simulation' | 'live'> {
    return isSimulationMode() ? 'simulation' : 'live'
}
