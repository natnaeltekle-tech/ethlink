'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const ADMIN_EMAIL = 'natnaeltekle236@gmail.com'

async function checkAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

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

    // Count Users (Proxy via unique user_ids in bookings/services if no profiles table)
    // For now, let's just return a placeholder or 0 if we can't access auth.users
    // If there is a profiles table, we could use that.
    // Let's check if 'profiles' table exists by trying to select from it.
    let usersCount = 0
    const { count: profilesCount, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

    if (!error) {
        usersCount = profilesCount || 0
    }

    return {
        totalUsers: usersCount,
        totalServices: servicesCount || 0,
        totalBookings: bookingsCount || 0
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
