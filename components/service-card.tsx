
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Building2 } from 'lucide-react'

export function ServiceCard({ service }: { service: any }) {
    return (
        <Link href={`/services/${service.id}`} className="group block">
            <Card className="h-full overflow-hidden border-border bg-card transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/50">
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
                    <div className="absolute top-3 right-3 bg-background/80 backdrop-blur px-2 py-1 rounded-full text-xs font-semibold shadow-sm text-foreground border border-border/50">
                        {service.category}
                    </div>
                </div>
                <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors text-foreground">{service.title}</h3>
                    </div>
                    <div className="flex items-center text-muted-foreground text-sm mb-3">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        <span className="line-clamp-1">{service.location}</span>
                    </div>
                    <div className="font-bold text-lg text-primary">
                        {service.price ? `${service.price.toLocaleString()} ETB` : 'Negotiable'}
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
