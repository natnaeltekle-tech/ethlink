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
        .eq('status', 'pending')
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
export async function adminConfirmBookingPayment(bookingId: string, note?: string) {
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
        .select('id, status, user_id, services(price, title, user_id)')
        .eq('id', bookingId)
        .single()

    if (error || !booking) {
        throw new Error('Booking not found')
    }

    if (booking.status === 'paid' || booking.status === 'confirmed' || booking.status === 'completed') {
        return { success: true, status: 'already_paid' as const }
    }

    if (booking.status !== 'pending') {
        throw new Error(`Cannot confirm payment for status: ${booking.status}`)
    }

    const service = Array.isArray(booking.services) ? booking.services[0] : booking.services
    const price = Number(service?.price ?? 0)
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
            link: `/book/success?bookingId=${bookingId}`,
        })
    } catch (e) {
        console.warn('[Admin] customer notify skipped:', e)
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard')
    revalidatePath('/book/success')

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
        .select('id, status, user_id, service_id, services(user_id, title)')
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
            dispute_reason: reason,
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
            ? `Escrow released to provider for ${title}.`
            : `Escrow refund approved for ${title}.`

    await adminSupabase.from('notifications').insert([
        {
            user_id: booking.user_id,
            content,
            type: 'payment',
            link: '/dashboard',
        },
        ...(providerId
            ? [
                  {
                      user_id: providerId,
                      content,
                      type: 'payment',
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
