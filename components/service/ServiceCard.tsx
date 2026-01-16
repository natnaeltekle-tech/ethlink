
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Building2, Star } from 'lucide-react'

// Category-specific placeholder images from Unsplash
import { DEFAULT_SERVICE_IMAGE } from '@/lib/constants'

// Category-specific placeholder images from Unsplash
const CATEGORY_PLACEHOLDERS: Record<string, string> = {
    'Hospitality': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    'Transport': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800',
    'Home Services': 'https://images.unsplash.com/photo-1581578731117-104f2a9d4547?w=800',
    'Tech': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
    'Events': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800',
}

export function ServiceCard({ service, distance }: { service: any, distance?: number }) {
    // Determine the image to display
    const getImageSrc = () => {
        // 1. Check Gallery First
        const galleryImage = service.gallery?.[0]
        if (galleryImage) {
            return galleryImage.startsWith('http')
                ? galleryImage
                : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/service-images/${galleryImage}`
        }

        // 2. Check Old Image Field
        if (service.image_url) {
            return service.image_url
        }

        // 3. Smart Category Placeholder or Global Default
        return CATEGORY_PLACEHOLDERS[service.category] || DEFAULT_SERVICE_IMAGE
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

                    {/* Top Right Badge - Rating (only if reviews exist) */}
                    {service.avg_rating && service.avg_rating > 0 && (
                        <div className="absolute top-3 right-3 bg-white text-black px-2 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {service.avg_rating.toFixed(1)}
                        </div>
                    )}
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
