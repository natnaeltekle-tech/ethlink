import { MapPin, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ServiceHeaderProps {
    title: string
    price: number | null
    location: string | null
    category: string
}

export function ServiceHeader({ title, price, location, category }: ServiceHeaderProps) {
    return (
        <div className="mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h1 className="text-3xl font-bold">{title}</h1>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">
                        {price ? `$${price}` : 'Negotiable'}
                    </span>
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
                {/* Placeholder for rating summary if available */}
                <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>4.8 (12 reviews)</span>
                </div>
            </div>
        </div>
    )
}
