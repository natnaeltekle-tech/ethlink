import { NextRequest, NextResponse } from 'next/server'
import { isMockMode, REFERENCE_PATTERN, verifyTransfer, verifyWebhookSignature, webhookConfigured } from '@/lib/chapa'
import { settleCharge, settlePayout } from '@/lib/escrow/service'
import { errorResponse, parseJson, readRawBody } from '@/lib/escrow/http'

export const dynamic = 'force-dynamic'

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/**
 * Chapa webhook (charges + payouts). Also receives the sandbox's simulated
 * callbacks, signed the same way. Signature first, then every charge is
 * re-verified with Chapa's API before money moves.
 */
export async function POST(request: NextRequest) {
    const raw = await readRawBody(request)
    if (raw === null) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    if (!webhookConfigured()) return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 })
    if (!verifyWebhookSignature(raw, request.headers)) {
        console.warn('[Chapa webhook] invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    const body = parseJson(raw)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const event = (str(body.event) ?? '').toLowerCase()
    const status = (str(body.status) ?? '').toLowerCase()
    const isPayout = event.startsWith('payout') || event.startsWith('transfer') || str(body.type)?.toLowerCase() === 'payout'

    try {
        if (isPayout) {
            const reference = str(body.reference) ?? str(body.merchant_reference)
            if (!reference || !REFERENCE_PATTERN.test(reference)) return NextResponse.json({ ok: true, ignored: 'unknown reference' })
            const claimed = status === 'success' || event.endsWith('success') ? 'success' : status === 'failed' || event.endsWith('failed') || event.endsWith('reversed') ? 'failed' : 'pending'
            // Live: trust Chapa's verify endpoint over the body when it gives a definite answer.
            const checked = isMockMode() ? 'pending' : await verifyTransfer(reference)
            const final = checked !== 'pending' ? checked : claimed
            if (final === 'pending') return NextResponse.json({ ok: true, payout: 'pending' })
            const result = await settlePayout(reference, final === 'success', str(body.chapa_reference) ?? null, final === 'failed' ? (str(body.reason) ?? str(body.message) ?? 'Transfer failed') : null)
            return NextResponse.json({ ok: true, payout: result })
        }

        const txRef = str(body.tx_ref) ?? str(body.merchant_reference) ?? str(body.trx_ref)
        if (!txRef || txRef.length > 50) return NextResponse.json({ ok: true, ignored: 'no tx_ref' })
        const outcome = await settleCharge(txRef, status === 'success' ? 'success' : 'failed')
        return NextResponse.json({ ok: true, charge: outcome.outcome })
    } catch (e) {
        // 5xx so Chapa retries; every step is idempotent.
        return errorResponse(e, 'Chapa webhook')
    }
}

/** Chapa v1 also calls callback_url with GET ?trx_ref=…&status=… — safe because we verify with Chapa before acting. */
export async function GET(request: NextRequest) {
    const p = request.nextUrl.searchParams
    const txRef = p.get('trx_ref') ?? p.get('tx_ref')
    if (!txRef || txRef.length > 50 || isMockMode()) return NextResponse.json({ ok: true })
    try {
        const outcome = await settleCharge(txRef)
        return NextResponse.json({ ok: true, charge: outcome.outcome })
    } catch (e) {
        return errorResponse(e, 'Chapa callback')
    }
}
