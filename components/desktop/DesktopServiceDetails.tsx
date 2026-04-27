import React from 'react'
import { ServiceHeader } from '@/components/service/service-header'
import { ServiceGallery } from '@/components/service/service-gallery'
import { ProviderCard } from '@/components/service/provider-card'
import { ChatBox } from '@/components/service/chat-box'
import { ReviewsList } from '@/components/service/reviews-list'
import { ReviewForm } from '@/components/review-form'

interface DesktopServiceDetailsProps {
    service: any
    reviews: any[]
    isFavorite: boolean
    user: any
    provider: any
    averageRating: number
    reviewCount: number
}

export default function DesktopServiceDetails({
    service,
    reviews,
    isFavorite,
    user,
    provider,
    averageRating,
    reviewCount
}: DesktopServiceDetailsProps) {
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
                description={service.description}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Description and Images */}
                <div className="lg:col-span-2 space-y-8">
                    <ServiceGallery
                        images={service.gallery || []}
                        title={service.title}
                        isOwner={user?.id && service.user_id && String(user.id) === String(service.user_id)}
                        serviceId={service.id}
                        imageUrl={service.image_url}
                    />
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
