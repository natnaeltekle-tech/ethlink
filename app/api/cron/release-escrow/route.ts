import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { recheckPendingPayouts, releaseDueEscrow } from '@/lib/escrow/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(request: NextRequest): boolean {
    const secret = process.env.CRON_SECRET?.trim()
    if (!secret) return false
    const got = Buffer.from(request.headers.get('authorization') ?? '')
    const want = Buffer.from(`Bearer ${secret}`)
    return got.length === want.length && timingSafeEqual(got, want)
}

/** Daily (vercel.json): release escrow 48h after the service date if nobody disputed; settle stuck live payouts. */
export async function GET(request: NextRequest) {
    if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
        const released = await releaseDueEscrow()
        const payoutsSettled = await recheckPendingPayouts()
        return NextResponse.json({ ok: true, released: released.length, payoutsSettled })
    } catch (e) {
        console.error('[cron/release-escrow]', e)
        return NextResponse.json({ ok: false }, { status: 500 })
    }
}
