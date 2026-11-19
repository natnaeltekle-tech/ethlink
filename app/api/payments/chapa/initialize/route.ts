import { NextResponse } from 'next/server'
import { z } from 'zod'
import { startCheckout } from '@/lib/escrow/service'
import { currentUser, errorResponse } from '@/lib/escrow/http'
import { getRequestBaseUrl } from '@/lib/base-url'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({ bookingId: z.string().uuid() })

/** POST { bookingId } → { checkout_url, tx_ref, amount_cents, mode } (Chapa hosted checkout, or the sandbox page in mock mode). */
export async function POST(request: Request) {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid booking' }, { status: 400 })
    try {
        const r = await startCheckout({ bookingId: parsed.data.bookingId, user, baseUrl: await getRequestBaseUrl() })
        return NextResponse.json({ checkout_url: r.checkoutUrl, tx_ref: r.txRef, amount_cents: r.amountCents, currency: 'ETB', mode: r.mode })
    } catch (e) {
        return errorResponse(e, 'payments/initialize')
    }
}
