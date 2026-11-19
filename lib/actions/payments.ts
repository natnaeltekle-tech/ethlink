'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRequestBaseUrl } from '@/lib/base-url'
import { isAdmin } from '@/lib/admin-auth'
import { chapaMode, REFERENCE_PATTERN } from '@/lib/chapa'
import {
    EscrowError,
    sandboxSelfServe,
    settleCharge,
    simulateChargeWebhook,
    startCheckout,
} from '@/lib/escrow/service'

async function sessionUser() {
    const supabase = await createClient()
    try {
        const { data } = await supabase.auth.getUser()
        return data.user
    } catch {
        return null
    }
}

/** Platform default commission as a fraction (0.10 = 10%). Display only — the database computes the real split. */
export async function getCommissionRate(): Promise<number> {
    try {
        const { data } = await createAdminClient().from('commission_rules').select('rate_bps').eq('scope', 'default').maybeSingle()
        if (data?.rate_bps != null) return data.rate_bps / 10000
    } catch { /* table missing before the migration */ }
    return 0.10
}

/**
 * Pay button → a checkout attempt (cents split stored) → Chapa hosted checkout,
 * or /checkout/chapa-sandbox when no CHAPA_SECRET_KEY is set.
 */
export async function initiatePayment(bookingId: string) {
    const user = await sessionUser()
    if (!user) throw new Error('Please sign in to pay')
    try {
        const r = await startCheckout({ bookingId, user, baseUrl: await getRequestBaseUrl() })
        return {
            success: true,
            checkout_url: r.checkoutUrl,
            tx_ref: r.txRef,
            amount_cents: r.amountCents,
            test_mode: r.mode === 'mock',
            simulation: r.mode === 'mock',
            auto_confirmed: false,
        }
    } catch (e) {
        throw new Error(e instanceof EscrowError ? e.message : 'Payment could not be started. Please try again.')
    }
}

export type ReconcileResult =
    | { status: 'paid' }
    | { status: 'pending' }
    | { status: 'failed'; message: string }

/** Success page polling: re-checks open checkouts with Chapa (live) in case the webhook is late. */
export async function reconcileBookingPayment(bookingId: string, txRef?: string | null): Promise<ReconcileResult> {
    const user = await sessionUser()
    if (!user) return { status: 'failed', message: 'Not authenticated' }
    const admin = createAdminClient()
    const { data: booking } = await admin.from('bookings').select('user_id, status').eq('id', bookingId).maybeSingle()
    if (!booking || booking.user_id !== user.id) return { status: 'failed', message: 'Booking not found' }
    if (['paid', 'completed', 'disputed', 'refunded'].includes(booking.status)) return { status: 'paid' }

    const { data: attempts } = await admin.from('payment_attempts')
        .select('tx_ref, status').eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(5)
    const list = attempts ?? []
    if (chapaMode() === 'live') {
        const refs = list.filter((a) => a.status === 'initialized').map((a) => a.tx_ref)
        if (txRef && REFERENCE_PATTERN.test(txRef) && !refs.includes(txRef)) refs.unshift(txRef)
        for (const ref of refs) {
            try {
                const r = await settleCharge(ref)
                if (r.outcome === 'paid' || r.outcome === 'already_processed') return { status: 'paid' }
            } catch { /* try the next one */ }
        }
    }
    const latest = txRef ? list.find((a) => a.tx_ref === txRef) ?? list[0] : list[0]
    if (latest?.status === 'failed') return { status: 'failed', message: 'The payment did not go through. You were not charged.' }
    return { status: 'pending' }
}

export async function getPublicPaymentMode(): Promise<'simulation' | 'live'> {
    return chapaMode() === 'mock' ? 'simulation' : 'live'
}

/**
 * Sandbox "Simulate successful / failed payment": posts a signed Chapa-style
 * webhook to our real /api/webhooks/chapa endpoint, exactly like Chapa would.
 */
export async function simulateSandboxPayment(txRef: string, outcome: 'success' | 'failed') {
    if (chapaMode() !== 'mock') throw new Error('The sandbox is off: live Chapa keys are configured')
    if (!REFERENCE_PATTERN.test(txRef) || !['success', 'failed'].includes(outcome)) throw new Error('Invalid request')
    const user = await sessionUser()
    if (!user) throw new Error('Please sign in')

    const admin = createAdminClient()
    const { data: attempt } = await admin.from('payment_attempts').select('booking_id, customer_id, status').eq('tx_ref', txRef).maybeSingle()
    if (!attempt) throw new Error('Checkout not found')
    const owner = attempt.customer_id === user.id
    const allowed = (owner && sandboxSelfServe()) || (await isAdmin())
    if (!allowed) throw new Error('In test mode an Eth-Links admin confirms payments')

    const baseUrl = await getRequestBaseUrl()
    const status = await simulateChargeWebhook(txRef, outcome, baseUrl)
    if (status !== 200) throw new Error(`Webhook rejected the simulated payment (HTTP ${status})`)
    const { data: after_ } = await admin.from('payment_attempts').select('status').eq('tx_ref', txRef).maybeSingle()
    return {
        bookingId: attempt.booking_id,
        status: after_?.status ?? 'initialized',
        redirect: outcome === 'success'
            ? `/book/success?bookingId=${attempt.booking_id}&tx_ref=${txRef}`
            : `/payment/${attempt.booking_id}?failed=1`,
    }
}
