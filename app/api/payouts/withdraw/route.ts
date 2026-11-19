import { NextResponse, after } from 'next/server'
import { z } from 'zod'
import { requestWithdrawal, simulateTransfer } from '@/lib/escrow/service'
import { currentUser, errorResponse } from '@/lib/escrow/http'
import { getRequestBaseUrl } from '@/lib/base-url'
import { isMockMode } from '@/lib/chapa'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({ amount_cents: z.number().int().positive().max(100_000_000_00), account_id: z.string().uuid() })

/** POST { amount_cents, account_id } — withdraw from the available balance (overdraft-safe in the database). */
export async function POST(request: Request) {
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid amount and account' }, { status: 400 })
    try {
        const baseUrl = await getRequestBaseUrl()
        const r = await requestWithdrawal({ userId: user.id, amountCents: parsed.data.amount_cents, accountId: parsed.data.account_id, baseUrl })
        if (r.status === 'pending' && isMockMode() && r.accountNumber) {
            const acct = r.accountNumber
            after(() => simulateTransfer(r.reference, acct, baseUrl))
        }
        return NextResponse.json({ ok: r.status !== 'failed', reference: r.reference, status: r.status, message: r.message })
    } catch (e) {
        return errorResponse(e, 'payouts/withdraw')
    }
}
