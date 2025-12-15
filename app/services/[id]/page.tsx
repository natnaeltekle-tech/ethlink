import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServiceDetails, getReviews, getFavoriteStatus } from '@/lib/actions'
import { createAdminClient } from '@/lib/supabase/admin'
import { ServiceHeader } from '@/components/service/ServiceHeader'
import { ServiceGallery } from '@/components/service/ServiceGallery'
import { ProviderCard } from '@/components/service/ProviderCard'
import { ChatBox } from '@/components/service/ChatBox'
import { ReviewsList } from '@/components/service/ReviewsList'
import { ReviewForm } from '@/components/review-form'

interface ServicePageProps {
    params: Promise<{ id: string }>
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

    // For provider info, we might need to fetch it if it's not fully in service object
    // Assuming service.user_id is the provider's ID.
    // We'll try to fetch the provider profile if we can, or pass what we have.
    // Since getServiceDetails returns the service object, and we didn't implement a separate getProviderInfo that returns full profile,
    // we'll rely on what we have or fetch it here if needed.
    // Let's try to fetch the provider's public profile here if possible.

    // Fetch provider info using Admin Client to bypass RLS
    let provider = null
    const adminSupabase = createAdminClient()

    // 1. Try Profiles Table
    const { data: profileData } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', service.user_id)
        .single()

    if (profileData && profileData.full_name) {
        provider = profileData
    } else {
        // 2. Fallback: Try Auth Admin to get metadata/email
        // This only works if SUPABASE_SERVICE_ROLE_KEY is set.
        try {
            const { data: { user: authUser }, error: authError } = await adminSupabase.auth.admin.getUserById(service.user_id)

            if (authUser) {
                // Construct a profile-like object from auth data
                provider = {
                    id: authUser.id,
                    full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown Provider',
                    email: authUser.email,
                    avatar_url: authUser.user_metadata?.avatar_url,
                    created_at: authUser.created_at
                }
            } else if (profileData) {
                // If auth fetch failed but we have a profile (even without name), use it
                provider = profileData
            }
        } catch (e) {
            console.error('Failed to fetch provider details via Admin API:', e)
            if (profileData) provider = profileData
        }
    }

    const reviewCount = reviews.length
    const averageRating = reviewCount > 0
        ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviewCount
        : 0

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
                    <ServiceGallery imageUrl={service.image_url} title={service.title} />

                    <div className="prose dark:prose-invert max-w-none">
                        <h2 className="text-2xl font-bold mb-4">About this Service</h2>
                        <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                            {service.description}
                        </p>
                    </div>

                    <ReviewsList reviews={reviews} />

                    {user ? (
                        <ReviewForm serviceId={service.id} />
                    ) : (
                        <div className="mt-8 p-6 border border-dashed border-border rounded-lg bg-secondary/20 text-center">
                            <p className="text-muted-foreground mb-2">
                                Want to write a review?
                            </p>
                            <a href={`/auth/login?next=/services/${service.id}`} className="text-primary hover:text-primary/80 hover:underline font-medium">
                                Log in to share your experience
                            </a>
                        </div>
                    )}
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
        </div>
    )
}
