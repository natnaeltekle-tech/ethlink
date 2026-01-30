'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Building2, Star, Heart } from 'lucide-react'
import { toggleFavorite } from '@/lib/actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/lib/hooks/useHaptics'

// Category-specific placeholder images from Unsplash
import { DEFAULT_SERVICE_IMAGE } from '@/lib/constants'

export function ServiceCard({ service, distance, isFavorite = false }: { service: any, distance?: number, isFavorite?: boolean }) {
    const [isFavorited, setIsFavorited] = useState(isFavorite)
    const [isPending, setIsPending] = useState(false)
    const haptics = useHaptics()

    // Determine the image to display
    const getImageSrc = () => {
        let imageSrc;

        // 1. Check if service.gallery has items. Use gallery[0].
        if (service.gallery && service.gallery.length > 0) {
            imageSrc = service.gallery[0];
        }
        // 2. If not, check service.image_url.
        else if (service.image_url) {
            imageSrc = service.image_url;
        }
        // 3. ONLY if both are null/empty, use DEFAULT_IMAGE.
        else {
            imageSrc = DEFAULT_SERVICE_IMAGE;
        }

        // URL Fix: If the image string is a relative path (starts with /), automatically prepend the Supabase Storage Base URL.
        if (imageSrc.startsWith('/')) {
            imageSrc = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/service-images/${imageSrc}`;
        }

        return imageSrc;
    }

    const handleToggleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault() // Prevent navigation
        e.stopPropagation()

        if (isPending) return

        // Haptic feedback
        haptics.light()

        // Optimistic Update
        const previousState = isFavorited
        setIsFavorited(!previousState)
        setIsPending(true)

        try {
            const result = await toggleFavorite(service.id)
            setIsFavorited(result.isFavorite)

            // Success haptic
            if (result.isFavorite) {
                haptics.success()
            }
        } catch (error) {
            // Revert
            setIsFavorited(previousState)
            toast.error('Failed to update favorites. Please login first.')
            haptics.error()
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Link href={`/services/${service.id}`} className="group block">
            <Card className="h-full overflow-hidden border-border bg-card transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/50 relative">
                {/* Image Area */}
                <div className="relative aspect-[4/3] w-full bg-secondary/50 overflow-hidden">
                    <img
                        src={getImageSrc()}
                        alt={service.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />

                    {/* Pending Spinner Overlay */}
                    {isPending && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                    )}

                    {/* Top Right Badge - Rating (only if reviews exist) */}
                    {service.avg_rating && service.avg_rating > 0 && (
                        <div className="absolute top-3 left-3 bg-white text-black px-2 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 z-20">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {service.avg_rating.toFixed(1)}
                        </div>
                    )}

                    {/* Favorite Button */}
                    <button
                        onClick={handleToggleFavorite}
                        className="absolute top-3 right-3 p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all z-20 group/heart min-h-[44px] min-w-[44px] active:scale-90"
                        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                    >
                        <Heart
                            className={cn(
                                "w-5 h-5 transition-all duration-300",
                                isFavorited
                                    ? "fill-red-500 text-red-500 scale-110"
                                    : "text-white group-hover/heart:scale-110"
                            )}
                        />
                    </button>
                </div>

                {/* Details Area */}
                <CardContent className="p-4">
                    <div className="mb-1">
                        <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors text-foreground">
                            {service.title}
                        </h3>
                    </div>

                    <div className="flex items-center text-muted-foreground text-sm mb-3">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        <span className="line-clamp-1">
                            {service.location}
                            {distance !== undefined && (
                                <span className="text-green-600 font-medium ml-1">
                                    • {distance.toFixed(1)} km away
                                </span>
                            )}
                        </span>
                    </div>

                    <div className="text-green-600 text-xl font-bold">
                        {service.price ? (
                            <>
                                ETB {service.price.toLocaleString()}
                                {['Hospitality', 'Hotels', 'Transport'].includes(service.category) && ' / night'}
                            </>
                        ) : 'Negotiable'}
                    </div>
                </CardContent>
            </Card>
        </Link >
    )
}
