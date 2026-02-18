import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getServiceDetails, getReviews, getFavoriteStatus } from '@/lib/actions'
import { getProviderInfo } from '@/lib/admin-actions'
import { ServicePageClient } from './ServicePageClient'

// Opt out of static generation since the page uses cookies for auth
export const dynamic = 'force-dynamic'

interface ServicePageProps {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
    const { id } = await params
    const service = await getServiceDetails(id)

    if (!service) {
        return {
            title: 'Service Not Found',
        }
    }

    return {
        title: `${service.title} | Eth-Links`,
        description: `Check out this service in ${service.location} for ${service.price} ETB.`,
        openGraph: {
            title: `${service.title} | Eth-Links`,
            description: `Check out this service in ${service.location} for ${service.price} ETB.`,
            images: service.image_url ? [{ url: service.image_url }] : [],
        },
    }
}

export default async function ServicePage({ params }: ServicePageProps) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const service = await getServiceDetails(id)

    if (!service) {
        notFound()
    }

    // Fetch reviews and favorite status in parallel
    const [reviews, isFavorite] = await Promise.all([
        getReviews(id),
        getFavoriteStatus(id)
    ])

    // Fetch provider info using our robust fallback logic
    const provider = await getProviderInfo(service.user_id)

    const reviewCount = reviews.length
    const averageRating = reviewCount > 0
        ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviewCount
        : 0

    return (
        <ServicePageClient
            service={service}
            reviews={reviews}
            isFavorite={isFavorite}
            user={user}
            provider={provider}
            averageRating={averageRating}
            reviewCount={reviewCount}
        />
    )
}
