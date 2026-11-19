import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin-auth'
import { releaseBooking } from '@/lib/escrow/service'
import { currentUser, errorResponse } from '@/lib/escrow/http'

export const dynamic = 'force-dynamic'

/** Customer confirms the job is done (or an admin releases) → escrow released to the provider's balance. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid booking' }, { status: 400 })
    const user = await currentUser()
    if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })

    const { data: booking } = await createAdminClient().from('bookings').select('user_id, status').eq('id', id).maybeSingle()
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    const admin = booking.user_id === user.id ? false : await isAdmin()
    if (booking.user_id !== user.id && !admin) return NextResponse.json({ error: 'Only the customer can confirm this job' }, { status: 403 })
    try {
        const result = await releaseBooking(id, admin ? 'admin' : 'customer')
        if (result === 'not_releasable') return NextResponse.json({ error: 'Only paid bookings can be completed' }, { status: 409 })
        return NextResponse.json({ ok: true, result })
    } catch (e) {
        return errorResponse(e, 'bookings/complete')
    }
}
