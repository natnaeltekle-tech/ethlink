'use client'

import { notFound } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getServiceDetails, getReviews, getFavoriteStatus } from '@/lib/actions'
import { getProviderInfo } from '@/lib/admin-actions'
import { ServiceHeader } from '@/components/service/ServiceHeader'
import { ServiceGallery } from '@/components/service/ServiceGallery'
import { ProviderCard } from '@/components/service/ProviderCard'
import { ChatBox } from '@/components/service/ChatBox'
import { ReviewsList } from '@/components/service/ReviewsList'
import { ReviewForm } from '@/components/review-form'

interface ServicePageClientProps {
    service: any
    reviews: any[]
    isFavorite: boolean
    user: any
    provider: any
    averageRating: number
    reviewCount: number
}

export function ServicePageClient({
    service,
    reviews,
    isFavorite,
    user,
    provider,
    averageRating,
    reviewCount
}: ServicePageClientProps) {
    // Debug logging for ownership verification (development only)
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('🔐 Ownership Check:', {
                currentUserId: user?.id,
                serviceOwnerId: service.user_id,
                isOwner: user?.id === service.user_id
            });
        }
    }, [user?.id, service.user_id]);

    return (
        <div className="container mx-auto px-4 py-8">
            <ServiceHeader
                title={service.title}
                price={service.price}
                location={service.location || 'Location not specified'}
                category={service.category}
                serviceId={service.id}
                isFavorite={isFavorite}
                isLoggedIn={!!user}
                rating={averageRating}
                reviewCount={reviewCount}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Description and Images */}
                <div className="lg:col-span-2 space-y-8">
                    <ServiceGallery
                        images={service.images || service.gallery || []}
                        title={service.title}
                        isOwner={user?.id === service.user_id}
                        serviceId={service.id}
                        imageUrl={service.image_url}
                    />

                    <div className="prose dark:prose-invert max-w-none">
                        <h2 className="text-2xl font-bold mb-4">About this Service</h2>
                        <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                            {service.description}
                        </p>
                    </div>
                </div>

                {/* Right Column: The Deal Zone */}
                <div className="space-y-6">
                    <ProviderCard provider={provider || { id: service.user_id }} />

                    <ChatBox
                        serviceId={service.id}
                        providerId={service.user_id}
                        currentUserId={user?.id || null}
                    />
                </div>
            </div>

            <hr className="my-8 border-border" />

            <div className="space-y-8">
                <ReviewsList reviews={reviews} />

                {user ? (
                    <div className="w-full">
                        <ReviewForm serviceId={service.id} />
                    </div>
                ) : (
                    <div className="p-8 border border-dashed border-border rounded-lg bg-secondary/10 text-center">
                        <p className="text-muted-foreground mb-4 text-lg">
                            Have you used this service? Share your experience!
                        </p>
                        <a href={`/auth/login?next=/services/${service.id}`} className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
                            Log in to write a review
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}
