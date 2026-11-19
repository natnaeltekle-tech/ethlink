import { createAdminClient } from '@/lib/supabase/admin'
import {
    chapaMode,
    initializeCheckout,
    initiateTransfer,
    isMockMode,
    newReference,
    signSandboxPayload,
    verifyTransaction,
    verifyTransfer,
} from '@/lib/chapa'
import { CURRENCY, formatETB } from '@/lib/money'
import { logPaymentEvent } from '@/lib/services/payments'
import { sendReceiptEmail } from '@/lib/receipt-email'
import { formatBookingDateTime } from '@/lib/booking-time'
import { revalidateWorkspaces } from '@/lib/revalidate'

/**
 * Escrow money flow (server-only). Every state change goes through one of the
 * service-role SQL functions in 20261122090000_escrow_ledger.sql, which are
 * idempotent and row-locked; this module adds Chapa calls and notifications.
 *
 *   startCheckout → (Chapa / sandbox) → settleCharge → booking paid, escrow held
 *   releaseBooking (customer / admin / 48h cron) → seller balance credited
 *   requestWithdrawal → transfer → approvePayout → settlePayout
 */

export const MIN_WITHDRAWAL_CENTS = 10_000 // 100 ETB
export const AUTO_RELEASE_HOURS = 48

type Admin = ReturnType<typeof createAdminClient>
const db = () => createAdminClient()

/** Sandbox buttons on /checkout/chapa-sandbox: admins always; everyone when this is on. */
export function sandboxSelfServe(): boolean {
    const on = (k: string) => /^(1|true|yes|on)$/i.test((process.env[k] ?? '').trim())
    return on('CHAPA_SANDBOX_SELF_SERVE') || on('SIMULATION_AUTO_CONFIRM')
}

export class EscrowError extends Error {
    constructor(message: string, readonly code: string, readonly status = 400) {
        super(message)
        this.name = 'EscrowError'
    }
}

function sqlError(error: { message?: string } | null): EscrowError {
    const m = error?.message ?? ''
    const pick = (code: string) => m.includes(code)
    if (pick('BOOKING_NOT_FOUND')) return new EscrowError('Booking not found', 'not_found', 404)
    if (pick('NOT_YOUR_BOOKING')) return new EscrowError('This is not your booking', 'forbidden', 403)
    if (pick('BOOKING_NOT_PAYABLE')) return new EscrowError('This booking is already paid or can no longer be paid', 'not_payable', 409)
    if (pick('INVALID_PRICE')) return new EscrowError('This booking has no valid price', 'invalid_price', 422)
    if (pick('PAYOUT_ACCOUNT_NOT_FOUND')) return new EscrowError('Choose one of your payout accounts', 'account_not_found', 404)
    if (pick('PAYOUT_ACCOUNT_COOLDOWN')) {
        const until = m.split('PAYOUT_ACCOUNT_COOLDOWN:')[1]?.trim()
        const when = until ? new Date(until).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'soon'
        return new EscrowError(`For your security, a new or changed payout account can receive money from ${when}.`, 'account_cooldown', 409)
    }
    if (pick('PAYOUT_BELOW_MINIMUM')) return new EscrowError(`The minimum withdrawal is ${formatETB(MIN_WITHDRAWAL_CENTS, { compact: true })}`, 'below_minimum', 422)
    if (pick('INSUFFICIENT_BALANCE')) return new EscrowError('That is more than your available balance', 'insufficient_balance', 409)
    console.error('[Escrow] database error:', m)
    return new EscrowError('Something went wrong. Please try again.', 'internal', 500)
}

async function notify(admin: Admin, rows: { user_id: string | null | undefined; content: string; link: string }[]) {
    const list = rows.filter((r): r is { user_id: string; content: string; link: string } => !!r.user_id)
    if (!list.length) return
    // Each row fires a push through the push_dispatch database webhook.
    const { error } = await admin.from('notifications').insert(list.map((r) => ({ ...r, type: 'payment' as const })))
    if (error) console.warn('[Escrow] notification insert failed:', error.message)
}

async function adminIds(admin: Admin): Promise<string[]> {
    const { data } = await admin.from('profiles').select('id').eq('role', 'admin').limit(10)
    return (data ?? []).map((p: { id: string }) => p.id)
}

// ── Checkout ────────────────────────────────────────────────────────────────
export type CheckoutUser = { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }

export async function startCheckout(params: { bookingId: string; user: CheckoutUser; baseUrl: string }) {
    const admin = db()
    const mock = isMockMode()
    const { data: attempt, error } = await admin.rpc('create_payment_attempt', {
        p_booking: params.bookingId,
        p_customer: params.user.id,
        p_provider: mock ? 'sandbox' : 'chapa',
        p_tx_ref: newReference('EL'),
    })
    if (error || !attempt) throw sqlError(error)

    const returnUrl = `${params.baseUrl}/book/success?bookingId=${params.bookingId}&tx_ref=${attempt.tx_ref}`
    if (attempt.checkout_url) {
        return { txRef: attempt.tx_ref, checkoutUrl: attempt.checkout_url, amountCents: attempt.amount_cents, mode: chapaMode(), returnUrl }
    }

    const { data: booking } = await admin.from('bookings').select('id, services(title)').eq('id', params.bookingId).maybeSingle()
    const svc = booking?.services as { title?: string } | { title?: string }[] | null | undefined
    const title = (Array.isArray(svc) ? svc[0]?.title : svc?.title) || 'Eth-Links service'
    const meta = params.user.user_metadata ?? {}
    const full = typeof meta.full_name === 'string' ? meta.full_name.trim().split(/\s+/) : []

    try {
        const { checkoutUrl } = await initializeCheckout({
            txRef: attempt.tx_ref,
            amountCents: attempt.amount_cents,
            email: params.user.email,
            firstName: (typeof meta.first_name === 'string' && meta.first_name) || full[0] || null,
            lastName: (typeof meta.last_name === 'string' && meta.last_name) || full.slice(1).join(' ') || null,
            phone: typeof meta.phone === 'string' ? meta.phone : null,
            title: 'Eth-Links',
            description: `Escrow payment for ${title}`,
            callbackUrl: `${params.baseUrl}/api/webhooks/chapa`,
            returnUrl,
            baseUrl: params.baseUrl,
            bookingId: params.bookingId,
        })
        await admin.from('payment_attempts').update({ checkout_url: checkoutUrl }).eq('id', attempt.id)
        await logPaymentEvent({ txRef: attempt.tx_ref, bookingId: params.bookingId, provider: 'chapa', status: 'received', message: `checkout_initialized:${chapaMode()}`, payload: { amount_cents: attempt.amount_cents } })

        if (mock && !sandboxSelfServe()) {
            // Real customers in sandbox mode: an admin confirms from the same sandbox page.
            const ids = await adminIds(admin)
            await notify(admin, ids.map((id) => ({
                user_id: id,
                content: `Sandbox payment waiting: ${title} — ${formatETB(attempt.amount_cents)}. Tap to simulate the Chapa result.`,
                link: `/checkout/chapa-sandbox?tx_ref=${attempt.tx_ref}`,
            })))
        }
        return { txRef: attempt.tx_ref, checkoutUrl, amountCents: attempt.amount_cents, mode: chapaMode(), returnUrl }
    } catch (e) {
        await admin.from('payment_attempts').update({ status: 'failed', failure_reason: (e instanceof Error ? e.message : 'initialize failed').slice(0, 300) }).eq('id', attempt.id).eq('status', 'initialized')
        throw new EscrowError(e instanceof Error ? e.message : 'Payment could not be started', 'gateway_error', 502)
    }
}

// ── Charge result ───────────────────────────────────────────────────────────
const METHOD_MAP: Record<string, string> = { telebirr: 'telebirr', cbebirr: 'cbe', cbe: 'cbe', 'cbe birr': 'cbe', card: 'card', visa: 'card', mastercard: 'card', test: 'test' }

export type ChargeOutcome = 'paid' | 'already_processed' | 'pending' | 'failed' | 'amount_mismatch' | 'duplicate' | 'orphaned' | 'unknown'

/**
 * Settle one checkout. Always re-verifies with Chapa (live) — the webhook body
 * is only a hint. In mock mode the signed sandbox webhook's outcome is used.
 */
export async function settleCharge(txRef: string, mockOutcome?: 'success' | 'failed'): Promise<{ outcome: ChargeOutcome; bookingId?: string }> {
    const admin = db()
    const { data: attempt } = await admin.from('payment_attempts').select('*').eq('tx_ref', txRef).maybeSingle()
    if (!attempt) return { outcome: 'unknown' }
    if (attempt.status !== 'initialized') {
        return { outcome: attempt.status === 'succeeded' ? 'already_processed' : attempt.status === 'failed' ? 'failed' : (attempt.status as ChargeOutcome), bookingId: attempt.booking_id }
    }

    const verified = await verifyTransaction(txRef, isMockMode() ? { status: mockOutcome ?? 'failed', amountCents: attempt.amount_cents } : undefined)

    if (verified.status === 'pending') return { outcome: 'pending', bookingId: attempt.booking_id }

    if (verified.status === 'failed' || (verified.currency && verified.currency.toUpperCase() !== CURRENCY)) {
        const reason = verified.status === 'failed' ? 'Payment was not completed' : `Unexpected currency ${verified.currency}`
        const { data: changed } = await admin.from('payment_attempts')
            .update({ status: 'failed', failure_reason: reason, provider_reference: verified.providerReference })
            .eq('id', attempt.id).eq('status', 'initialized').select('id')
        if (changed?.length) {
            await notify(admin, [{ user_id: attempt.customer_id, content: 'Your payment did not go through and you were not charged. Tap to try again.', link: `/payment/${attempt.booking_id}` }])
            await logPaymentEvent({ txRef, bookingId: attempt.booking_id, provider: 'chapa', status: 'ignored', message: reason })
        }
        return { outcome: 'failed', bookingId: attempt.booking_id }
    }

    const method = METHOD_MAP[(verified.method ?? '').toLowerCase()] ?? (isMockMode() ? 'test' : 'chapa')
    const { data, error } = await admin.rpc('confirm_escrow_payment', {
        p_tx_ref: txRef,
        p_amount_cents: verified.amountCents,
        p_provider_reference: verified.providerReference,
        p_method: method,
    })
    if (error) {
        console.error('[Escrow] confirm_escrow_payment failed:', error.message)
        throw new EscrowError('Could not record the payment', 'internal', 500)
    }
    const r = (data ?? {}) as { status?: string; message?: string; booking_id?: string }
    await logPaymentEvent({ txRef, bookingId: r.booking_id ?? attempt.booking_id, provider: 'chapa', status: r.status === 'success' ? 'processed' : 'ignored', message: r.message ?? r.status ?? null })

    if (r.status === 'success') {
        await afterPaid(admin, attempt.booking_id)
        return { outcome: 'paid', bookingId: attempt.booking_id }
    }
    if (r.status === 'already_processed') return { outcome: 'already_processed', bookingId: attempt.booking_id }
    if (r.message === 'amount_mismatch') {
        const ids = await adminIds(admin)
        await notify(admin, ids.map((id) => ({ user_id: id, content: `Payment ${txRef} amount did not match the booking — check it in Chapa.`, link: '/admin' })))
        return { outcome: 'amount_mismatch', bookingId: attempt.booking_id }
    }
    if (r.status === 'duplicate' || r.status === 'orphaned') {
        const ids = await adminIds(admin)
        await notify(admin, ids.map((id) => ({ user_id: id, content: `A ${r.status} payment (${txRef}) needs a manual refund.`, link: '/admin' })))
        return { outcome: r.status, bookingId: attempt.booking_id }
    }
    return { outcome: 'unknown', bookingId: attempt.booking_id }
}

type PaidBooking = {
    id: string; date: string; user_id: string | null; gross_amount_cents: number | null; seller_net_amount_cents: number | null
    services: { title: string | null; user_id: string | null } | { title: string | null; user_id: string | null }[] | null
}

async function loadBooking(admin: Admin, bookingId: string) {
    const { data } = await admin.from('bookings')
        .select('id, date, user_id, gross_amount_cents, seller_net_amount_cents, services(title, user_id)')
        .eq('id', bookingId).maybeSingle()
    if (!data) return null
    const b = data as unknown as PaidBooking
    const s = Array.isArray(b.services) ? b.services[0] : b.services
    return { ...b, title: s?.title || 'your booking', sellerId: s?.user_id ?? null }
}

async function afterPaid(admin: Admin, bookingId: string) {
    const b = await loadBooking(admin, bookingId)
    if (!b) return
    await notify(admin, [
        { user_id: b.user_id, content: `Payment of ${formatETB(b.gross_amount_cents)} for ${b.title} is held safely in escrow. Tap for your receipt.`, link: `/receipt/${b.id}` },
        { user_id: b.sellerId, content: `New paid booking: ${b.title}. ${formatETB(b.seller_net_amount_cents)} is held in escrow for you until the job is done.`, link: '/provider/jobs?tab=active' },
    ])
    if (b.user_id) {
        try {
            const { data: u } = await admin.auth.admin.getUserById(b.user_id)
            const { data: receipt } = await admin.from('bookings').select('receipt_number').eq('id', b.id).maybeSingle()
            if (u?.user?.email) {
                void sendReceiptEmail({
                    to: u.user.email, bookingId: b.id, serviceTitle: b.title,
                    amount: (b.gross_amount_cents ?? 0) / 100,
                    scheduledLabel: formatBookingDateTime(b.date),
                    reference: receipt?.receipt_number ?? b.id.slice(0, 8).toUpperCase(),
                })
            }
        } catch (e) { console.warn('[Escrow] receipt email skipped:', e) }
    }
    revalidateWorkspaces()
}

/** Admin recorded an offline payment (cash, Telebirr to the company number, bank transfer). */
export async function confirmManualPayment(params: { bookingId: string; method: string; reference: string | null }) {
    const admin = db()
    const { data: attempt, error } = await admin.rpc('create_payment_attempt', {
        p_booking: params.bookingId, p_customer: null, p_provider: 'manual', p_tx_ref: newReference('EL'),
    })
    if (error || !attempt) throw sqlError(error)
    const { data, error: e2 } = await admin.rpc('confirm_escrow_payment', {
        p_tx_ref: attempt.tx_ref, p_amount_cents: attempt.amount_cents, p_provider_reference: params.reference, p_method: params.method,
    })
    if (e2) throw sqlError(e2)
    const r = (data ?? {}) as { status?: string }
    if (r.status === 'success') await afterPaid(admin, params.bookingId)
    return r.status ?? 'unknown'
}

// ── Release ─────────────────────────────────────────────────────────────────
export async function releaseBooking(bookingId: string, by: 'customer' | 'admin' | 'auto'): Promise<string> {
    const admin = db()
    const { data, error } = await admin.rpc('release_escrow', { p_booking: bookingId })
    if (error) throw sqlError(error)
    if (data === 'released') await afterRelease(admin, bookingId, by)
    return data as string
}

async function afterRelease(admin: Admin, bookingId: string, by: 'customer' | 'admin' | 'auto') {
    const b = await loadBooking(admin, bookingId)
    if (!b) return
    const why = by === 'customer' ? 'The customer confirmed the job' : by === 'auto' ? `No issue was reported within ${AUTO_RELEASE_HOURS}h` : 'Eth-Links released the escrow'
    await notify(admin, [{ user_id: b.sellerId, content: `${why} — ${formatETB(b.seller_net_amount_cents)} for ${b.title} is now available to withdraw.`, link: '/provider/earnings' }])
    revalidateWorkspaces()
}

export async function releaseDueEscrow(): Promise<string[]> {
    const admin = db()
    const { data, error } = await admin.rpc('release_due_escrow', { p_hours: AUTO_RELEASE_HOURS })
    if (error) throw sqlError(error)
    const ids = (data ?? []) as string[]
    for (const id of ids) await afterRelease(admin, id, 'auto')
    return ids
}

// ── Withdrawals ─────────────────────────────────────────────────────────────
export async function requestWithdrawal(params: { userId: string; amountCents: number; accountId: string; baseUrl: string }) {
    if (!Number.isInteger(params.amountCents) || params.amountCents <= 0) throw new EscrowError('Enter a valid amount', 'invalid_amount', 422)
    const admin = db()
    const reference = newReference('PO')
    const { data: req, error } = await admin.rpc('request_payout', {
        p_user: params.userId, p_amount_cents: params.amountCents, p_account: params.accountId,
        p_reference: reference, p_provider: isMockMode() ? 'sandbox' : 'chapa', p_min_cents: MIN_WITHDRAWAL_CENTS,
    })
    if (error || !req) throw sqlError(error)

    const { data: acc } = await admin.from('payout_accounts').select('*').eq('id', params.accountId).single()
    if (!acc) {
        await settlePayout(reference, false, null, 'Payout account was removed')
        throw new EscrowError('Payout account was removed', 'account_not_found', 404)
    }
    const transfer = await initiateTransfer({
        reference, amountCents: params.amountCents, accountName: acc.account_name, accountNumber: acc.account_number, bankCode: acc.bank_code,
    })
    if (transfer.status === 'failed') {
        await settlePayout(reference, false, null, transfer.message ?? 'Transfer rejected')
        return { reference, status: 'failed' as const, message: transfer.message }
    }
    if (transfer.providerReference) await admin.from('payout_requests').update({ provider_reference: transfer.providerReference }).eq('id', req.id)
    revalidateWorkspaces()
    return { reference, status: 'pending' as const, accountNumber: acc.account_number, message: null }
}

export async function approvePayout(reference: string): Promise<boolean> {
    const { data, error } = await db().rpc('approve_payout', { p_reference: reference })
    if (error) throw sqlError(error)
    return data === true
}

export async function settlePayout(reference: string, success: boolean, providerReference: string | null, reason: string | null): Promise<string> {
    const admin = db()
    const { data, error } = await admin.rpc('finalize_payout', { p_reference: reference, p_success: success, p_provider_reference: providerReference, p_reason: reason })
    if (error) throw sqlError(error)
    if (data === 'completed' || data === 'failed') {
        const { data: r } = await admin.from('payout_requests').select('user_id, amount_cents, account_snapshot').eq('reference', reference).maybeSingle()
        const snap = (r?.account_snapshot ?? {}) as { bank_name?: string; account_number_masked?: string }
        const dest = [snap.bank_name, snap.account_number_masked].filter(Boolean).join(' ')
        await notify(admin, [{
            user_id: r?.user_id,
            content: data === 'completed'
                ? `${formatETB(r?.amount_cents)} was sent to ${dest || 'your account'}.`
                : `Your withdrawal of ${formatETB(r?.amount_cents)} failed${reason ? ` (${reason})` : ''}. The money is back in your available balance.`,
            link: '/provider/earnings',
        }])
        revalidateWorkspaces()
    }
    return data as string
}

/** Live mode: settle payouts whose webhook never arrived. */
export async function recheckPendingPayouts(): Promise<number> {
    if (isMockMode()) return 0
    const admin = db()
    const { data } = await admin.from('payout_requests').select('reference')
        .eq('status', 'pending').eq('provider', 'chapa').lt('requested_at', new Date(Date.now() - 30 * 60_000).toISOString()).limit(50)
    let settled = 0
    for (const { reference } of data ?? []) {
        const s = await verifyTransfer(reference)
        if (s !== 'pending') { await settlePayout(reference, s === 'success', null, s === 'failed' ? 'Transfer failed at the bank' : null); settled++ }
    }
    return settled
}

// ── Sandbox simulation (mock mode only) ─────────────────────────────────────
async function postSigned(url: string, body: Record<string, unknown>, purpose: 'webhook' | 'transfer-approval') {
    const raw = JSON.stringify(body)
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-eth-links-sandbox': '1', ...signSandboxPayload(raw, purpose) },
        body: raw,
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
    })
    return res.status
}

/** What Chapa would POST after checkout — sent to our real webhook endpoint, signed. */
export async function simulateChargeWebhook(txRef: string, outcome: 'success' | 'failed', baseUrl: string): Promise<number> {
    if (!isMockMode()) throw new EscrowError('The sandbox is off: live Chapa keys are configured', 'sandbox_disabled', 403)
    const { data: a } = await db().from('payment_attempts').select('amount_cents, booking_id').eq('tx_ref', txRef).maybeSingle()
    if (!a) throw new EscrowError('Unknown checkout', 'not_found', 404)
    const body = {
        event: outcome === 'success' ? 'charge.success' : 'charge.failed',
        type: 'API',
        status: outcome,
        tx_ref: txRef,
        reference: `SANDBOX-${txRef.slice(-8).toUpperCase()}`,
        amount: (a.amount_cents / 100).toFixed(2),
        currency: CURRENCY,
        payment_method: 'test',
        meta: { booking_id: a.booking_id, sandbox: true },
    }
    try {
        return await postSigned(`${baseUrl}/api/webhooks/chapa`, body, 'webhook')
    } catch (e) {
        // Our own host unreachable from itself (rare): run the same handler logic in-process.
        console.warn('[Escrow] sandbox webhook self-call failed, settling in-process:', e)
        await settleCharge(txRef, outcome)
        return 200
    }
}

/** Simulated bank: Chapa asks for approval, then reports the result. Accounts ending in 0000 fail. */
export async function simulateTransfer(reference: string, accountNumber: string, baseUrl: string) {
    if (!isMockMode()) return
    const { data: r } = await db().from('payout_requests').select('amount_cents').eq('reference', reference).maybeSingle()
    if (!r) return
    const amount = (r.amount_cents / 100).toFixed(2)
    const fail = accountNumber.endsWith('0000')
    try {
        const approval = await postSigned(`${baseUrl}/api/webhooks/chapa/transfer-approval`, { reference, amount, currency: CURRENCY }, 'transfer-approval')
        if (approval !== 200) {
            await postSigned(`${baseUrl}/api/webhooks/chapa`, { event: 'payout.failed', type: 'Payout', status: 'failed', reference, amount, currency: CURRENCY, reason: 'Transfer not approved' }, 'webhook')
            return
        }
        await new Promise((res) => setTimeout(res, 1500))
        await postSigned(`${baseUrl}/api/webhooks/chapa`, {
            event: fail ? 'payout.failed' : 'payout.success', type: 'Payout', status: fail ? 'failed' : 'success',
            reference, chapa_reference: `SANDBOX-TRF-${reference.slice(-8).toUpperCase()}`, amount, currency: CURRENCY,
            reason: fail ? 'Sandbox bank rejected the account (ends in 0000)' : undefined,
        }, 'webhook')
    } catch (e) {
        console.warn('[Escrow] sandbox transfer self-call failed, settling in-process:', e)
        await approvePayout(reference)
        await settlePayout(reference, !fail, `SANDBOX-TRF-${reference.slice(-8).toUpperCase()}`, fail ? 'Sandbox bank rejected the account (ends in 0000)' : null)
    }
}
