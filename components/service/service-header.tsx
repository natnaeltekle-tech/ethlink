import { MapPin, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ServiceActions } from './ServiceActions'

interface ServiceHeaderProps {
    title: string
    price: number | null
    location: string | null
    category: string
    serviceId: string
    isFavorite: boolean
    isLoggedIn: boolean
    rating: number
    reviewCount: number
}

export function ServiceHeader({
    title,
    price,
    location,
    category,
    serviceId,
    isFavorite,
    isLoggedIn,
    rating,
    reviewCount
}: ServiceHeaderProps) {
    return (
        <div className="mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h1 className="text-3xl font-bold">{title}</h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-primary">
                            {price ? `$${price}` : 'Negotiable'}
                        </span>
                    </div>
                    <ServiceActions
                        serviceId={serviceId}
                        title={title}
                        initialIsFavorite={isFavorite}
                        isLoggedIn={isLoggedIn}
                    />
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <Badge variant="secondary">{category}</Badge>
                {location && (
                    <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{location}</span>
                    </div>
                )}

                {reviewCount > 0 ? (
                    <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-primary text-primary" />
                        <span>{rating.toFixed(1)} ({reviewCount} reviews)</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 text-muted-foreground/60">
                        <Star className="w-4 h-4 text-muted-foreground/40" />
                        <span>No ratings yet</span>
                    </div>
                )}
            </div>
        </div>
    )
}
