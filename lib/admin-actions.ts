'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { escrowResolutionSchema, uuidSchema } from '@/lib/validations'
import { isAdmin } from '@/lib/admin-auth'
import {
    confirmBookingPaymentAtomic,
    logPaymentEvent,
} from '@/lib/services/payments'
import { getCommissionRate } from '@/lib/actions/payments'

async function checkAdmin() {
    return isAdmin()
}

export async function getAdminStats() {
    const isAdminUser = await checkAdmin()
    if (!isAdminUser) return null

    const supabase = await createClient()

    const { count: servicesCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })

    const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })

    const adminSupabase = createAdminClient()
    const { count: usersCount } = await adminSupabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

    const { data: revenueData, error: revenueError } = await supabase
        .from('bookings')
        .select('commission_amount')
        .eq('status', 'paid')

    let totalRevenue = 0
    if (!revenueError && revenueData) {
        totalRevenue = revenueData.reduce(
            (sum, booking) => sum + (booking.commission_amount || 0),
            0
        )
    }

    return {
        totalUsers: usersCount,
        totalServices: servicesCount || 0,
        totalBookings: bookingsCount || 0,
        totalRevenue,
    }
}

export async function getRecentServices() {
    const isAdminUser = await checkAdmin()
    if (!isAdminUser) return []

    const supabase = await createClient()
    const { data } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

    return data || []
}

export async function getRecentBookings() {
    const isAdminUser = await checkAdmin()
    if (!isAdminUser) return []

    const supabase = await createClient()
    const { data } = await supabase
        .from('bookings')
        .select('*, services(title)')
        .order('created_at', { ascending: false })
        .limit(10)

    return data || []
}

/** Pending bookings waiting for payment confirmation (simulation / offline). */
export async function getPendingPaymentBookings() {
    const isAdminUser = await checkAdmin()
    if (!isAdminUser) return []

    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
        .from('bookings')
        .select('id, status, date, created_at, user_id, services(id, title, price)')
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(30)

    if (error) {
        console.error('[Admin] getPendingPaymentBookings:', error)
        return []
    }
    return data || []
}

/**
 * Manually confirm a pending booking as paid.
 * Uses the same idempotent process_payment_confirmation RPC as Chapa webhooks.
 */
export async function adminConfirmBookingPayment(
    bookingId: string,
    note?: string,
    details?: { method: 'telebirr' | 'cbe' | 'cash' | 'other'; reference?: string },
) {
    const isAdminUser = await checkAdmin()
    if (!isAdminUser) {
        throw new Error('Unauthorized')
    }

    if (!uuidSchema.safeParse(bookingId).success) {
        throw new Error('Invalid booking ID')
    }

    const adminSupabase = createAdminClient()
    const { data: booking, error } = await adminSupabase
        .from('bookings')
        .select('id, status, user_id, quoted_price, services(price, title, user_id)')
        .eq('id', bookingId)
        .single()

    if (error || !booking) {
        throw new Error('Booking not found')
    }

    if (['paid', 'completed', 'disputed', 'refunded'].includes(booking.status)) {
        return { success: true, status: 'already_paid' as const }
    }

    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
        throw new Error(`Cannot confirm payment for status: ${booking.status}`)
    }

    const service = Array.isArray(booking.services) ? booking.services[0] : booking.services
    // Charge the price locked when the booking was made, not today's listing price.
    const price = Number(booking.quoted_price ?? service?.price ?? 0)
    if (!price || price <= 0) {
        throw new Error('Invalid service price')
    }

    const commissionRate = await getCommissionRate()
    const commission = price * commissionRate
    const earnings = price - commission
    const txRef = `tx-ethlink-${bookingId}-${Date.now()}-adm${crypto.randomUUID().slice(0, 6)}`

    const result = await confirmBookingPaymentAtomic({
        txRef,
        bookingId,
        provider: 'chapa',
        commission,
        providerEarnings: earnings,
    })

    if (result.status === 'error') {
        throw new Error(result.message || 'Failed to confirm payment')
    }

    // What the admin verified: shown as the payment method + reference on the receipt.
    if (details && ['telebirr', 'cbe', 'cash', 'other'].includes(details.method)) {
        const reference = (details.reference ?? '').trim().slice(0, 120)
        await adminSupabase
            .from('bookings')
            .update({ payment_method: details.method, ...(reference ? { payment_reference: reference } : {}) })
            .eq('id', bookingId)
    }

    await logPaymentEvent({
        txRef,
        bookingId,
        provider: 'chapa',
        status: 'processed',
        message: 'admin_manual_confirm',
        payload: {
            note: note?.slice(0, 500) || null,
            amount: price,
            source: 'adminConfirmBookingPayment',
        },
    })

    // Notify customer — deep-link to receipt page so they can print/save it
    try {
        const title = service?.title ?? 'your booking'
        await adminSupabase.from('notifications').insert({
            user_id: booking.user_id,
            content: `Payment confirmed for ${title} (${price} ETB). Tap to view your receipt.`,
            type: 'payment',
            link: `/receipt/${bookingId}`,
        })
    } catch (e) {
        console.warn('[Admin] customer notify skipped:', e)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard')
    revalidatePath('/book/success')
    revalidatePath(`/receipt/${bookingId}`)

    return { success: true, status: result.status }
}

export async function adminDeleteService(id: string) {
    const isAdminUser = await checkAdmin()
    if (!isAdminUser) {
        throw new Error('Unauthorized')
    }

    if (!uuidSchema.safeParse(id).success) {
        throw new Error('Invalid service ID')
    }

    const supabase = await createClient()
    const { error } = await supabase.from('services').delete().eq('id', id)

    if (error) {
        console.error('Error deleting service:', error)
        throw new Error('Failed to delete service')
    }

    revalidatePath('/admin')
    revalidatePath('/services')
}

export async function resolveEscrowDispute(input: {
    bookingId: string
    resolution: 'release_to_provider' | 'refund_customer'
    reason: string
}) {
    const isAdminUser = await checkAdmin()
    if (!isAdminUser) {
        throw new Error('Unauthorized')
    }

    const parsed = escrowResolutionSchema.safeParse(input)
    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Invalid dispute resolution')
    }

    const { bookingId, resolution, reason } = parsed.data
    const adminSupabase = createAdminClient()

    const { data: booking, error: fetchError } = await adminSupabase
        .from('bookings')
        .select('id, status, user_id, service_id, dispute_reason, services(user_id, title)')
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        throw new Error('Booking not found')
    }

    if (!['paid', 'disputed'].includes(booking.status)) {
        throw new Error('Only paid or disputed escrow bookings can be resolved')
    }

    const nextStatus = resolution === 'release_to_provider' ? 'completed' : 'refunded'
    const { error: updateError } = await adminSupabase
        .from('bookings')
        .update({
            status: nextStatus,
            // Keep the customer's own description when they opened the dispute.
            dispute_reason: booking.dispute_reason || reason,
            dispute_resolution: resolution,
            dispute_resolved_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .in('status', ['paid', 'disputed'])

    if (updateError) {
        console.error('Failed to resolve escrow dispute:', updateError)
        throw new Error('Failed to resolve escrow dispute')
    }

    const service = Array.isArray(booking.services) ? booking.services[0] : booking.services
    const title = service?.title ?? 'your booking'
    const providerId = service?.user_id
    const content =
        resolution === 'release_to_provider'
            ? `Dispute resolved for ${title}: payment released to the provider. Note from Eth-Links: ${reason}`
            : `Dispute resolved for ${title}: the customer is refunded. Note from Eth-Links: ${reason}`

    await adminSupabase.from('notifications').insert([
        {
            user_id: booking.user_id,
            content,
            type: 'payment' as const,
            link: '/dashboard',
        },
        ...(providerId
            ? [
                  {
                      user_id: providerId,
                      content,
                      type: 'payment' as const,
                      link: '/dashboard',
                  },
              ]
            : []),
    ])

    revalidatePath('/admin')
    revalidatePath('/dashboard')

    return { success: true, status: nextStatus }
}

export async function getProviderInfo(userId: string) {
    const isAdminUser = await checkAdmin()
    if (!isAdminUser) return null

    if (!uuidSchema.safeParse(userId).success) return null

    const adminSupabase = createAdminClient()

    const { data: profileData } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    if (profileData && profileData.full_name) {
        return profileData
    }

    try {
        const {
            data: { user: authUser },
        } = await adminSupabase.auth.admin.getUserById(userId)

        if (authUser) {
            return {
                id: authUser.id,
                full_name: authUser.user_metadata?.full_name || '',
                email: authUser.email,
                avatar_url: authUser.user_metadata?.avatar_url,
                created_at: authUser.created_at,
            }
        }
    } catch (e) {
        console.error('Failed to fetch provider details via Admin API:', e)
    }

    return profileData || null
}

// ─── Escrow queues: disputes + provider payouts ─────────────────────────────
export type EscrowQueueItem = {
    id: string
    status: string
    date: string
    amount: number
    providerEarnings: number
    disputeReason: string | null
    serviceTitle: string
    customer: { id: string; name: string }
    provider: { id: string; name: string; telebirr: string | null; cbe: string | null; accountName: string | null }
}

export async function getEscrowQueues(): Promise<{ disputes: EscrowQueueItem[]; payouts: EscrowQueueItem[] } | null> {
    if (!(await checkAdmin())) return null
    const admin = createAdminClient()
    const rate = await getCommissionRate()
    const select = 'id, status, date, user_id, provider_earnings, commission_amount, dispute_reason, services(title, price, user_id)'
    const [{ data: disputes }, { data: payouts }] = await Promise.all([
        admin.from('bookings').select(select).eq('status', 'disputed').order('created_at', { ascending: true }).limit(50),
        admin.from('bookings').select(select).eq('status', 'completed').eq('payout_status', 'unpaid').order('date', { ascending: true }).limit(100),
    ])
    type Row = { id: string; status: string; date: string; user_id: string; provider_earnings: number | null; commission_amount: number | null; dispute_reason: string | null; services: { title: string; price: number; user_id: string } | { title: string; price: number; user_id: string }[] | null }
    const rows = [...((disputes ?? []) as unknown as Row[]), ...((payouts ?? []) as unknown as Row[])]
    const svc = (r: Row) => (Array.isArray(r.services) ? r.services[0] : r.services)
    const ids = [...new Set(rows.flatMap((r) => [r.user_id, svc(r)?.user_id].filter((x): x is string => !!x)))]
    const [{ data: people }, { data: apps }] = ids.length
        ? await Promise.all([
            admin.from('profiles').select('id, first_name, last_name, full_name, business_name').in('id', ids),
            admin.from('provider_verifications').select('user_id, payout_telebirr_phone, payout_cbe_account, payout_account_name').in('user_id', ids),
        ])
        : [{ data: [] }, { data: [] }]
    const nameOf = (id: string) => {
        const p = (people ?? []).find((x) => x.id === id)
        return p?.business_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || p?.full_name || 'Unknown user'
    }
    const toItem = (r: Row): EscrowQueueItem => {
        const s = svc(r)
        const price = Number(s?.price ?? 0)
        const earnings = r.provider_earnings != null ? Number(r.provider_earnings) : Math.round(price * (1 - rate) * 100) / 100
        const amount = r.provider_earnings != null && r.commission_amount != null ? Number(r.provider_earnings) + Number(r.commission_amount) : price
        const app = (apps ?? []).find((a) => a.user_id === s?.user_id)
        return {
            id: r.id, status: r.status, date: r.date, amount, providerEarnings: earnings, disputeReason: r.dispute_reason,
            serviceTitle: s?.title ?? 'Service',
            customer: { id: r.user_id, name: nameOf(r.user_id) },
            provider: {
                id: s?.user_id ?? '', name: s?.user_id ? nameOf(s.user_id) : 'Unknown',
                telebirr: app?.payout_telebirr_phone ?? null, cbe: app?.payout_cbe_account ?? null, accountName: app?.payout_account_name ?? null,
            },
        }
    }
    return { disputes: ((disputes ?? []) as unknown as Row[]).map(toItem), payouts: ((payouts ?? []) as unknown as Row[]).map(toItem) }
}

export async function markPayoutSent(input: { bookingId: string; method: 'telebirr' | 'cbe' | 'cash' | 'other'; reference: string }) {
    if (!(await checkAdmin())) throw new Error('Unauthorized')
    if (!uuidSchema.safeParse(input.bookingId).success) throw new Error('Invalid booking ID')
    if (!['telebirr', 'cbe', 'cash', 'other'].includes(input.method)) throw new Error('Choose a payout method')
    const reference = (input.reference ?? '').trim().slice(0, 100)
    if (input.method !== 'cash' && reference.length < 3) throw new Error('Enter the transfer reference')

    const admin = createAdminClient()
    const { data: updated, error } = await admin
        .from('bookings')
        .update({ payout_status: 'paid_out', paid_out_at: new Date().toISOString(), payout_method: input.method, payout_reference: reference || null })
        .eq('id', input.bookingId)
        .eq('status', 'completed')
        .eq('payout_status', 'unpaid')
        .select('id, provider_earnings, services(title, user_id)')
        .maybeSingle()
    if (error) {
        console.error('[Admin] markPayoutSent:', error)
        throw new Error('Could not record the payout')
    }
    if (!updated) throw new Error('This booking is not awaiting a payout')

    const service = Array.isArray(updated.services) ? updated.services[0] : updated.services
    if (service?.user_id) {
        const amount = updated.provider_earnings != null ? `${Number(updated.provider_earnings).toLocaleString()} ETB` : 'Your earnings'
        const via = { telebirr: 'Telebirr', cbe: 'CBE', cash: 'cash', other: 'transfer' }[input.method]
        await admin.from('notifications').insert({
            user_id: service.user_id,
            type: 'payment' as const,
            content: `${amount} for ${service.title ?? 'your job'} was sent via ${via}${reference ? ` (ref ${reference})` : ''}.`,
            link: '/dashboard?mode=provider&tab=overview',
        })
    }
    revalidatePath('/admin')
    revalidatePath('/dashboard')
    return { success: true }
}
