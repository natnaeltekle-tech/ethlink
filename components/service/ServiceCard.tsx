
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Building2, Star } from 'lucide-react'

export function ServiceCard({ service }: { service: any }) {
    return (
        <Link href={`/services/${service.id}`} className="group block">
            <Card className="h-full overflow-hidden border-border bg-card transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/50 relative">
                {/* Image Area */}
                <div className="aspect-[4/3] relative bg-secondary/50 overflow-hidden">
                    {service.images?.[0] ? (
                        <img
                            src={service.images[0]}
                            alt={service.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                            <Building2 className="h-12 w-12" />
                        </div>
                    )}

                    {/* Top Right Badge - Dynamic Rating */}
                    <div className="absolute top-3 right-3 bg-white text-black px-2 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {service.avg_rating && service.avg_rating > 0
                            ? service.avg_rating.toFixed(1)
                            : 'New'
                        }
                    </div>
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
                        <span className="line-clamp-1">{service.location}</span>
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
        </Link>
    )
}
