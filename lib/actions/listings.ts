'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { serviceSchema, reviewSchema, cleanLandmark } from '@/lib/validations'
import { sanitizeReviewComment, sanitizeDescription } from '@/lib/sanitize'
import { revalidatePath } from 'next/cache'
import { redirect, unstable_rethrow } from 'next/navigation'
import { Service, ServiceView, ReviewWithProfile } from '@/lib/types/database'
import type { ServiceFilters } from '@/lib/service-filters'
import { revalidateWorkspaces } from '@/lib/revalidate'

export async function searchServices(query: string): Promise<ServiceView[]> {
    const supabase = await createClient()
    if (!query) return []
    if (query.length > 500) query = query.slice(0, 500)
    const safeQuery = query.replace(/[.(),%_\\]/g, ' ')
    const { data, error } = await supabase.from('services_view').select('*').eq('is_active', true).or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%,category.ilike.%${safeQuery}%`).limit(50).returns<ServiceView[]>()
    if (error) { console.error('Error searching services:', error); return [] }
    return data || []
}

export async function searchServicesAdvanced(query: string, location?: string, maxPrice?: number, category?: string): Promise<ServiceView[]> {
    const supabase = await createClient()
    let queryBuilder = supabase.from('services_view').select('*').eq('is_active', true)
    if (query) {
        const safeQuery = query.replace(/[.(),%_\\]/g, ' ')
        queryBuilder = queryBuilder.or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`)
    }
    if (category) queryBuilder = queryBuilder.eq('category', category)
    if (location) queryBuilder = queryBuilder.ilike('location', `%${location}%`)
    if (maxPrice) queryBuilder = queryBuilder.lte('price', maxPrice)
    const { data, error } = await queryBuilder.limit(50).returns<ServiceView[]>()
    if (error) { console.error('Error searching services (advanced):', error); return [] }
    return data || []
}

/**
 * Explore query. Reads services_view through the request-scoped client (RLS
 * applies) and only returns active listings. Every filter maps to a real column.
 * Returns `error` separately so the UI can tell "no matches" from "query failed".
 */
export async function queryServices(
    filters: ServiceFilters = {}
): Promise<{ services: ServiceView[]; error: string | null }> {
    try {
        const supabase = await createClient()
        let dbQuery = supabase.from('services_view').select('*').eq('is_active', true)

        if (filters.category) dbQuery = dbQuery.eq('category', filters.category)
        if (filters.search) {
            const safeQuery = filters.search.slice(0, 200).replace(/[.(),%_\\]/g, ' ')
            dbQuery = dbQuery.or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`)
        }
        if (filters.location) {
            const safeLocation = filters.location.slice(0, 100).replace(/[%_\\]/g, ' ')
            dbQuery = dbQuery.ilike('location', `%${safeLocation}%`)
        }
        if (filters.minPrice !== undefined) dbQuery = dbQuery.gte('price', filters.minPrice)
        if (filters.maxPrice !== undefined) dbQuery = dbQuery.lte('price', filters.maxPrice)
        if (filters.minRating) dbQuery = dbQuery.gte('avg_rating', filters.minRating)

        const { data, error } = await dbQuery
            .order('created_at', { ascending: false })
            .limit(50)
            .returns<ServiceView[]>()

        if (error) {
            console.error('Error fetching filtered services:', error)
            return { services: [], error: 'Could not load services. Please try again.' }
        }
        return { services: data || [], error: null }
    } catch (err) {
        // Let Next.js control-flow errors (dynamic rendering, redirects) through
        unstable_rethrow(err)
        console.error('Exception fetching filtered services:', err)
        return { services: [], error: 'Could not load services. Please try again.' }
    }
}

/** Backward-compatible wrapper (Home, /search). Returns [] on error. */
export async function getFilteredServices(category?: string, query?: string): Promise<ServiceView[]> {
    const { services } = await queryServices({
        category: category || undefined,
        search: query || undefined,
    })
    return services
}

export async function searchServicesGreedy(keyword: string, maxPrice?: number): Promise<ServiceView[]> {
    const supabase = await createClient()
    let queryBuilder = supabase.from('services_view').select('*').eq('is_active', true)
    if (maxPrice) queryBuilder = queryBuilder.lte('price', maxPrice)
    if (keyword) {
        const safeQuery = keyword.replace(/[.(),%_\\]/g, ' ')
        queryBuilder = queryBuilder.or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%,category.ilike.%${safeQuery}%,location.ilike.%${safeQuery}%`)
    }
    const { data, error } = await queryBuilder.limit(50).returns<ServiceView[]>()
    if (error) { console.error('Error searching services (greedy):', error); return [] }
    return data || []
}

export async function getServiceDetails(id: string): Promise<Service | null> {
    const supabase = await createClient()
    const { data: service, error } = await supabase.from('services').select('*').eq('id', id).single()
    if (error) { console.error('Error fetching service details:', error); return null }
    return service
}

export async function getReviews(serviceId: string): Promise<any[]> {
    const supabase = await createClient()
    const { data: reviews, error } = await supabase.from('reviews').select('*').eq('service_id', serviceId).order('created_at', { ascending: false })
    if (error) { console.error('Error fetching reviews:', error); return [] }
    if (!reviews || reviews.length === 0) return []
    const userIds = [...new Set(reviews.map(r => r.user_id))]
    const profilesMap: Record<string, any> = {}
    if (userIds.length > 0) {
        try {
            const { data: profiles, error: profilesError } = await supabase.from('public_profiles').select('id, full_name, username, avatar_url').in('id', userIds)
            if (profilesError) console.error('Error fetching profiles:', profilesError)
            if (profiles) profiles.forEach(p => { profilesMap[p.id] = p })
        } catch (profileError) { console.error('Exception fetching profiles:', profileError) }
    }
    return reviews.map(r => {
        const profile = profilesMap[r.user_id]
        let formattedProfile = null
        if (profile && profile.full_name) {
            const nameParts = profile.full_name.split(' ')
            formattedProfile = { first_name: nameParts[0], last_name: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '', username: profile.username, avatar_url: profile.avatar_url, full_name: profile.full_name }
        } else if (profile && profile.username) {
            formattedProfile = { first_name: profile.username, last_name: '', username: profile.username, avatar_url: profile.avatar_url, full_name: profile.username }
        } else {
            const shortId = r.user_id ? r.user_id.substring(0, 8) : 'Unknown'
            const fallbackName = `User ${shortId}`
            formattedProfile = { first_name: fallbackName, last_name: '', username: null, avatar_url: profile?.avatar_url || null, full_name: fallbackName }
        }
        return { ...r, profiles: formattedProfile }
    })
}

export async function createService(formData: FormData): Promise<void> {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }
    if (!user) redirect('/auth/login')
    const rawData = { title: formData.get('title'), category: formData.get('category'), location: formData.get('location'), price: formData.get('price'), description: formData.get('description'), image_url: formData.get('image_url') || '', latitude: formData.get('latitude'), longitude: formData.get('longitude') }
    const amenities = (formData.getAll('amenities') as string[]).filter(Boolean)
    try {
        const validatedData = serviceSchema.parse(rawData)
        const sanitizedData = { ...validatedData, description: sanitizeDescription(validatedData.description) }
        // amenities is not on generated Insert type → caused Type 'string[] | null' is not assignable to type 'never'
        const insertPayload: Record<string, unknown> = { ...sanitizedData, landmark: cleanLandmark(formData.get('landmark')), user_id: user.id }
        if (amenities.length > 0) insertPayload.amenities = amenities
        const { data, error } = await supabase.from('services').insert(insertPayload as never).select().single()
        if (error) { console.error('Error creating service:', error); throw new Error('Failed to create service') }
        revalidatePath('/services'); revalidateWorkspaces(); redirect(`/services/${data.id}`)
    } catch (error) {
        if (error instanceof Error) { console.error('Validation/Creation Error:', error.message); throw error }
        throw new Error('An unexpected error occurred')
    }
}

export async function submitReview(serviceId: string, rating: number, comment: string): Promise<void> {
    const parsed = reviewSchema.safeParse({ serviceId, rating, comment })
    if (!parsed.success) throw new Error('Invalid review data')
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase.from('reviews').insert({ service_id: serviceId, user_id: user.id, rating, comment: sanitizeReviewComment(comment) })
    if (error) { console.error('Error submitting review:', error); throw new Error('Failed to submit review') }
    revalidatePath(`/services/${serviceId}`)
}

export async function toggleFavorite(serviceId: string): Promise<{ isFavorite: boolean }> {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }
    if (!user) throw new Error('Not authenticated')
    const { data: existing } = await supabase.from('favorites').select('*').eq('user_id', user.id).eq('service_id', serviceId).single()
    if (existing) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('service_id', serviceId)
        revalidatePath(`/services/${serviceId}`)
        return { isFavorite: false }
    } else {
        await supabase.from('favorites').insert({ user_id: user.id, service_id: serviceId })
        revalidatePath(`/services/${serviceId}`)
        return { isFavorite: true }
    }
}

export async function getFavoriteStatus(serviceId: string): Promise<boolean> {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }
    if (!user) return false
    const { data } = await supabase.from('favorites').select('*').eq('user_id', user.id).eq('service_id', serviceId).single()
    return !!data
}

export async function getProviderServices(): Promise<Service[]> {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }
    if (!user) return []
    const { data: services } = await supabase.from('services').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).returns<Service[]>()
    return services || []
}

export async function toggleServiceStatus(serviceId: string, isActive: boolean): Promise<void> {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase.from('services').update({ is_active: isActive }).eq('id', serviceId).eq('user_id', user.id)
    if (error) throw new Error('Failed to update service status')
    revalidatePath(`/services/${serviceId}`)
}

export async function getServicesByCategory(category: string, limit: number = 4): Promise<ServiceView[]> {
    const supabase = await createClient()
    const { data: services } = await supabase.from('services_view').select('*').eq('is_active', true).ilike('category', `%${category}%`).order('created_at', { ascending: false }).limit(limit).returns<ServiceView[]>()
    return services || []
}

export async function getLatestServices(limit: number = 4): Promise<ServiceView[]> {
    const supabase = await createClient()
    const { data: services } = await supabase.from('services_view').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(limit).returns<ServiceView[]>()
    return services || []
}

export async function getServicesByCategoryStrict(category: string, limit: number = 24): Promise<ServiceView[]> {
    const supabase = await createClient()
    const { data: services } = await supabase.from('services_view').select('*').eq('is_active', true).eq('category', category).order('created_at', { ascending: false }).limit(limit).returns<ServiceView[]>()
    return services || []
}

export async function getBuses(limit: number = 24): Promise<ServiceView[]> {
    const supabase = await createClient()
    const { data: services } = await supabase.from('services_view').select('*').eq('is_active', true).eq('category', 'Transport').ilike('title', '%bus%').order('created_at', { ascending: false }).limit(limit).returns<ServiceView[]>()
    return services || []
}

export async function deleteService(serviceId: string): Promise<void> {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }
    if (!user) throw new Error('Not authenticated')
    const { data: service } = await supabase.from('services').select('user_id').eq('id', serviceId).single()
    if (!service || service.user_id !== user.id) throw new Error('Unauthorized')
    const { error } = await supabase.from('services').delete().eq('id', serviceId)
    if (error) throw new Error('Failed to delete service')
    revalidateWorkspaces()
}

export async function resetServiceImage(serviceId: string): Promise<void> {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* expired/corrupt session */ }
    if (!user) throw new Error('Not authenticated')
    const { data: service } = await supabase.from('services').select('user_id').eq('id', serviceId).single()
    if (!service || service.user_id !== user.id) throw new Error('Unauthorized')
    const { error } = await supabase.from('services').update({ image_url: null, gallery: [] }).eq('id', serviceId)
    if (error) { console.error('Error resetting service image:', error); throw new Error('Failed to reset service image') }
    revalidateWorkspaces(); revalidatePath(`/services/${serviceId}`)
}
