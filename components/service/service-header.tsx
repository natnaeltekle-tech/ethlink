import { MapPin, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { ServiceActions } from './service-actions';

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
    description: string | null
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
    reviewCount,
    description
}: ServiceHeaderProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const MAX_LENGTH = 150
    const shouldTruncate = description && description.length > MAX_LENGTH

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

            <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
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

            {description && (
                <div className="mt-4">
                    <p className={`text-muted-foreground leading-relaxed whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
                        {shouldTruncate && !isExpanded
                            ? `${description.slice(0, MAX_LENGTH)}...`
                            : description}
                    </p>
                    {shouldTruncate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-primary p-0 h-auto hover:bg-transparent hover:text-primary/80"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? (
                                <div className="flex items-center gap-1">
                                    Show Less <ChevronUp className="w-4 h-4" />
                                </div>
                            ) : (
                                <div className="flex items-center gap-1">
                                    Read More <ChevronDown className="w-4 h-4" />
                                </div>
                            )}
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}
