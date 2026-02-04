

'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { serviceSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function searchServices(query: string) {
    const supabase = await createClient()

    if (!query) {
        return []
    }

    // Sanitize query to prevent injection in .or()
    const safeQuery = query.replace(/[.(),]/g, ' ')

    const { data, error } = await supabase
        .from('services_view') // Ensure we query the view for ratings
        .select('*')
        .eq('is_active', true)
        .or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%,category.ilike.%${safeQuery}%`)

    if (error) {
        console.error('Error searching services:', error)
        return []
    }

    return data
}

export async function searchServicesAdvanced(query: string, location?: string, maxPrice?: number, category?: string) {
    const supabase = await createClient()

    let queryBuilder = supabase.from('services_view').select('*').eq('is_active', true);

    if (query) {
        const safeQuery = query.replace(/[.(),]/g, ' ')
        // Note: Mix of AND/OR with Supabase query builder determines priority.
        // .or() is usually AND'd with previous .eq() filters if chained simply.
        queryBuilder = queryBuilder.or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`);
    }

    if (category) {
        queryBuilder = queryBuilder.eq('category', category);
    }

    if (location) {
        queryBuilder = queryBuilder.ilike('location', `%${location}%`);
    }

    if (maxPrice) {
        queryBuilder = queryBuilder.lte('price', maxPrice);
    }

    const { data, error } = await queryBuilder;

    if (error) {
        console.error('Error searching services (advanced):', error);
        return [];
    }

    return data || [];
}

export async function getFilteredServices(category?: string, query?: string) {
    const supabase = await createClient()

    let dbQuery = supabase.from('services_view').select('*').eq('is_active', true);

    if (category) {
        dbQuery = dbQuery.eq('category', category);
    }

    if (query) {
        const safeQuery = query.replace(/[.(),]/g, ' ')
        // We want (title matches OR description matches) AND other filters
        // .or() applies to the rows that match the REST of the filters by default in this chain order
        dbQuery = dbQuery.or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`);
    }

    const { data, error } = await dbQuery;

    if (error) {
        console.error('Error fetching filtered services:', error);
        return [];
    }

    return data || [];
}

export async function searchServicesGreedy(keyword: string, maxPrice?: number) {
    const supabase = await createClient()

    let queryBuilder = supabase.from('services_view').select('*').eq('is_active', true);

    if (maxPrice) {
        queryBuilder = queryBuilder.lte('price', maxPrice);
    }

    if (keyword) {
        const safeQuery = keyword.replace(/[.(),]/g, ' ')
        queryBuilder = queryBuilder.or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%,category.ilike.%${safeQuery}%,location.ilike.%${safeQuery}%`);
    }

    const { data, error } = await queryBuilder;

    if (error) {
        console.error('Error searching services (greedy):', error);
        return [];
    }

    return data || [];
}

export async function getServiceDetails(id: string) {
    const supabase = await createClient()

    const { data: service, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching service details:', error)
        return null
    }

    return service
}

export async function getReviews(serviceId: string) {
    const supabase = await createClient()

    // 1. Fetch reviews
    const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching reviews:', error)
        return []
    }

    if (!reviews || reviews.length === 0) {
        return []
    }

    // 2. Fetch user profiles manually
    const userIds = [...new Set(reviews.map(r => r.user_id))]

    let profilesMap: Record<string, any> = {}

    if (userIds.length > 0) {
        try {
            const { data: profiles, error: profilesError } = await supabase
                .from('public_profiles')
                .select('id, full_name, username, avatar_url')
                .in('id', userIds)

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError)
            }

            if (profiles) {
                profiles.forEach(p => {
                    profilesMap[p.id] = p
                })
            }
        } catch (profileError) {
            console.error('Exception fetching profiles:', profileError)
        }
    }

    // 4. Merge data
    return reviews.map(r => {
        const profile = profilesMap[r.user_id]

        let formattedProfile = null
        if (profile && profile.full_name) {
            const nameParts = profile.full_name.split(' ')
            const firstName = nameParts[0]
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

            formattedProfile = {
                first_name: firstName,
                last_name: lastName,
                username: profile.username,
                avatar_url: profile.avatar_url,
                full_name: profile.full_name
            }
        } else if (profile && profile.username) {
            formattedProfile = {
                first_name: profile.username,
                last_name: '',
                username: profile.username,
                avatar_url: profile.avatar_url,
                full_name: profile.username
            }
        } else {
            const shortId = r.user_id ? r.user_id.substring(0, 8) : 'Unknown'
            const fallbackName = `User ${shortId}`

            formattedProfile = {
                first_name: fallbackName,
                last_name: '',
                username: null,
                avatar_url: profile?.avatar_url || null,
                full_name: fallbackName
            }
        }

        return {
            ...r,
            profiles: formattedProfile
        }
    })
}

export async function getMessages(serviceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false }) // Get newest first
        .limit(30)

    if (error) {
        console.error('Error fetching messages:', JSON.stringify(error, null, 2))
        return []
    }

    return messages.reverse() // Return in chronological order
}

export async function sendMessage(serviceId: string, receiverId: string, content: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('messages')
        .insert({
            service_id: serviceId,
            sender_id: user.id,
            receiver_id: receiverId,
            content,
        })

    if (error) {
        console.error('Error sending message:', JSON.stringify(error, null, 2))
        throw new Error(`Database Error: ${error.message || error.details || 'Unknown error'}`)
    }

    // Trigger Notification for Receiver
    const adminSupabase = createAdminClient()
    await adminSupabase.from('notifications').insert({
        user_id: receiverId,
        content: 'New Message',
        link: `/services/${serviceId}`,
        type: 'message'
    })
}

export async function createService(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Parse and validate with Zod
    const rawData = {
        title: formData.get('title'),
        category: formData.get('category'),
        location: formData.get('location'),
        price: formData.get('price'),
        description: formData.get('description'),
        image_url: formData.get('image_url') || '', // Handle empty string as optional
        latitude: formData.get('latitude'),
        longitude: formData.get('longitude'),
    };

    try {
        const validatedData = serviceSchema.parse(rawData);

        const { data, error } = await supabase
            .from('services')
            .insert({
                ...validatedData,
                user_id: user.id
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating service:', error)
            throw new Error('Failed to create service')
        }

        revalidatePath('/services');
        revalidatePath('/dashboard');
        redirect(`/services/${data.id}`)
    } catch (error) {
        if (error instanceof Error) {
            console.error('Validation/Creation Error:', error.message)
            throw error;
        }
        throw new Error('An unexpected error occurred');
    }
}

export async function submitReview(serviceId: string, rating: number, comment: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    if (rating < 1 || rating > 5) {
        throw new Error('Invalid rating')
    }

    const { error } = await supabase
        .from('reviews')
        .insert({
            service_id: serviceId,
            user_id: user.id,
            rating,
            comment,
        })

    if (error) {
        console.error('Error submitting review:', error)
        throw new Error('Failed to submit review')
    }

    revalidatePath(`/services/${serviceId}`)
}

export async function toggleFavorite(serviceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    // Check if already favorited
    const { data: existing } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('service_id', serviceId)
        .single()

    if (existing) {
        // Remove from favorites
        await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('service_id', serviceId)

        revalidatePath(`/services/${serviceId}`)
        return { isFavorite: false }
    } else {
        // Add to favorites
        await supabase
            .from('favorites')
            .insert({
                user_id: user.id,
                service_id: serviceId
            })

        revalidatePath(`/services/${serviceId}`)
        return { isFavorite: true }
    }
}

export async function getFavoriteStatus(serviceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    const { data } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('service_id', serviceId)
        .single()

    return !!data
}

export async function getProviderServices() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return services || []
}

export async function toggleServiceStatus(serviceId: string, isActive: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('services')
        .update({ is_active: isActive })
        .eq('id', serviceId)
        .eq('user_id', user.id)

    if (error) throw new Error('Failed to update service status')

    revalidatePath(`/services/${serviceId}`)
}

export async function getServicesByCategory(category: string, limit: number = 4) {
    const supabase = await createClient()

    const { data: services } = await supabase
        .from('services_view')
        .select('*')
        .eq('is_active', true)
        .ilike('category', `%${category}%`)
        .order('created_at', { ascending: false })
        .limit(limit)

    return services || []
}

export async function getLatestServices(limit: number = 4) {
    const supabase = await createClient()

    const { data: services } = await supabase
        .from('services_view')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit)

    return services || []
}

export async function getServicesByCategoryStrict(category: string, limit: number = 24) {
    const supabase = await createClient()

    const { data: services } = await supabase
        .from('services_view')
        .select('*')
        .eq('is_active', true)
        .eq('category', category) // STRICT filtering
        .order('created_at', { ascending: false })
        .limit(limit)

    return services || []
}

export async function getBuses(limit: number = 24) {
    const supabase = await createClient()

    const { data: services } = await supabase
        .from('services_view')
        .select('*')
        .eq('is_active', true)
        .eq('category', 'Transport')
        .ilike('title', '%bus%')
        .order('created_at', { ascending: false })
        .limit(limit)

    return services || []
}

export async function deleteService(serviceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // Verify ownership
    const { data: service } = await supabase
        .from('services')
        .select('user_id')
        .eq('id', serviceId)
        .single()

    if (!service || service.user_id !== user.id) {
        throw new Error('Unauthorized')
    }

    const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)

    if (error) throw new Error('Failed to delete service')

    revalidatePath('/dashboard')
}

export async function resetServiceImage(serviceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // Verify ownership
    const { data: service } = await supabase
        .from('services')
        .select('user_id')
        .eq('id', serviceId)
        .single()

    if (!service || service.user_id !== user.id) {
        throw new Error('Unauthorized')
    }

    const { error } = await supabase
        .from('services')
        .update({
            image_url: null,
            gallery: []
        })
        .eq('id', serviceId)

    if (error) {
        console.error('Error resetting service image:', error)
        throw new Error('Failed to reset service image')
    }

    revalidatePath('/dashboard')
    revalidatePath(`/services/${serviceId}`)
}

export async function createServiceWithProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // 1. Extract Provider Details
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const phoneNumber = formData.get('phoneNumber') as string
    const idCardLink = formData.get('idCardLink') as string

    // 2. Extract Service Details
    const title = formData.get('title') as string
    const category = formData.get('category') as string
    const location = formData.get('location') as string
    const price = parseFloat(formData.get('price') as string)
    const description = formData.get('description') as string
    const imageUrl = formData.get('image_url') as string

    // Extract coordinates if available
    const latitudeStr = formData.get('latitude') as string
    const longitudeStr = formData.get('longitude') as string
    const latitude = latitudeStr ? parseFloat(latitudeStr) : null
    const longitude = longitudeStr ? parseFloat(longitudeStr) : null

    // Validation
    if (!firstName || !lastName || !phoneNumber || !idCardLink) {
        throw new Error('All Provider Details are required')
    }
    if (!title || !category || !location || isNaN(price) || !description) {
        throw new Error('All Service Details are required')
    }

    // 3. Upsert Profile
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            full_name: `${firstName} ${lastName}`,
            phone_number: phoneNumber,
            id_card_link: idCardLink,
            role: 'provider'
        })

    if (profileError) {
        console.error('Warning: Failed to update provider profile. Proceeding with service creation.', profileError)
    }

    // 4. Create Service
    const { data: service, error: serviceError } = await supabase
        .from('services')
        .insert({
            title,
            category,
            location,
            price,
            description,
            image_url: imageUrl,
            user_id: user.id,
            latitude,
            longitude
        })
        .select()
        .single()

    if (serviceError) {
        console.error('Error creating service:', serviceError)
        throw new Error('Failed to create service')
    }

    redirect(`/services/${service.id}`)
}
