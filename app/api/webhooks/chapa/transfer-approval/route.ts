import { NextRequest, NextResponse } from 'next/server'
import { REFERENCE_PATTERN, verifyTransferApprovalSignature } from '@/lib/chapa'
import { approvePayout } from '@/lib/escrow/service'
import { parseJson, readRawBody } from '@/lib/escrow/http'

export const dynamic = 'force-dynamic'

/**
 * Chapa transfer approval: Chapa asks before sending each payout.
 * 200 only for a correctly signed request about a payout that is still pending;
 * anything else (bad signature, unknown or already-processed reference) → 400, so Chapa cancels it.
 */
export async function POST(request: NextRequest) {
    const raw = await readRawBody(request)
    if (raw === null) return NextResponse.json({ approved: false, error: 'Payload too large' }, { status: 400 })
    if (!verifyTransferApprovalSignature(raw, request.headers)) {
        console.warn('[Transfer approval] invalid signature')
        return NextResponse.json({ approved: false, error: 'Invalid signature' }, { status: 400 })
    }
    const body = parseJson(raw)
    const data = body?.data && typeof body.data === 'object' ? (body.data as Record<string, unknown>) : body
    const ref = [data?.reference, data?.merchant_reference, body?.reference].find((v): v is string => typeof v === 'string')
    if (!ref || !REFERENCE_PATTERN.test(ref)) return NextResponse.json({ approved: false, error: 'Unknown reference' }, { status: 400 })
    try {
        const ok = await approvePayout(ref)
        if (!ok) return NextResponse.json({ approved: false, error: 'Unknown or already processed payout' }, { status: 400 })
        return NextResponse.json({ approved: true, reference: ref })
    } catch (e) {
        console.error('[Transfer approval]', e)
        return NextResponse.json({ approved: false, error: 'Could not approve' }, { status: 400 })
    }
}
