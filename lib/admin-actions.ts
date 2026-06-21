'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { escrowResolutionSchema, uuidSchema } from '@/lib/validations'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
if (!ADMIN_EMAIL) {
    console.error("CRITICAL: ADMIN_EMAIL env var is not set. Admin features are disabled.");
}

async function checkAdmin() {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }

    if (!user || user.email !== ADMIN_EMAIL) {
        return false
    }
    return true
}

export async function getAdminStats() {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return null

    const supabase = await createClient()

    // Count Services
    const { count: servicesCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })

    // Count Bookings
    const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })

    // Count Users from profiles table
    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    const { count: usersCount } = await adminSupabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

    // Calculate Platform Revenue
    // Sum commission_amount from bookings
    const { data: revenueData, error: revenueError } = await supabase
        .from('bookings')
        .select('commission_amount')
        .eq('status', 'paid')

    let totalRevenue = 0
    if (!revenueError && revenueData) {
        totalRevenue = revenueData.reduce((sum, booking) => sum + (booking.commission_amount || 0), 0)
    }

    return {
        totalUsers: usersCount,
        totalServices: servicesCount || 0,
        totalBookings: bookingsCount || 0,
        totalRevenue
    }
}

export async function getRecentServices() {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return []

    const supabase = await createClient()
    const { data } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

    return data || []
}

export async function getRecentBookings() {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return []

    const supabase = await createClient()
    const { data } = await supabase
        .from('bookings')
        .select('*, services(title)')
        .order('created_at', { ascending: false })
        .limit(10)

    return data || []
}

export async function adminDeleteService(id: string) {
    const isAdmin = await checkAdmin()
    if (!isAdmin) {
        throw new Error('Unauthorized')
    }

    if (!uuidSchema.safeParse(id).success) {
        throw new Error('Invalid service ID')
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)

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
    const isAdmin = await checkAdmin()
    if (!isAdmin) {
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
    const content = resolution === 'release_to_provider'
        ? `Escrow released to provider for ${title}.`
        : `Escrow refund approved for ${title}.`

    await adminSupabase.from('notifications').insert([
        {
            user_id: booking.user_id,
            content,
            type: 'payment',
            link: '/dashboard',
        },
        ...(providerId ? [{
            user_id: providerId,
            content,
            type: 'payment',
            link: '/dashboard',
        }] : []),
    ])

    revalidatePath('/admin')
    revalidatePath('/dashboard')

    return { success: true, status: nextStatus }
}

/**
 * Fetches provider information, falling back to Auth Admin API if profile is missing or incomplete.
 * This is used to display user details like "User (email@email.com)" when they haven't set up a profile.
 */
export async function getProviderInfo(userId: string) {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return null

    if (!uuidSchema.safeParse(userId).success) return null

    const adminSupabase = createAdminClient()

    // 1. Try Profiles Table
    const { data: profileData } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    // Check if we have a valid profile with a name
    if (profileData && profileData.full_name) {
        return profileData
    }

    // 2. Fallback: Try Auth Admin to get metadata/email
    try {
        const { data: { user: authUser } } = await adminSupabase.auth.admin.getUserById(userId)

        if (authUser) {
            // Construct a profile-like object from auth data
            return {
                id: authUser.id,
                full_name: authUser.user_metadata?.full_name || '', // Leave empty to let UI decide display
                email: authUser.email,
                avatar_url: authUser.user_metadata?.avatar_url,
                created_at: authUser.created_at
            }
        }
    } catch (e) {
        console.error('Failed to fetch provider details via Admin API:', e)
    }

    // 3. Last resort: Return whatever profile data we had (even if empty name) or null
    return profileData || null
}
