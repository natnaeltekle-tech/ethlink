
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Building2 } from 'lucide-react'

export function ServiceCard({ service }: { service: any }) {
    return (
        <Link href={`/services/${service.id}`} className="group block">
            <Card className="h-full overflow-hidden border transition-all hover:shadow-lg hover:-translate-y-1">
                <div className="aspect-[4/3] relative bg-slate-100 overflow-hidden">
                    {service.images?.[0] ? (
                        <img
                            src={service.images[0]}
                            alt={service.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Building2 className="h-12 w-12 opacity-20" />
                        </div>
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-xs font-semibold shadow-sm">
                        {service.category}
                    </div>
                </div>
                <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-blue-600 transition-colors">{service.title}</h3>
                    </div>
                    <div className="flex items-center text-slate-500 text-sm mb-3">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        <span className="line-clamp-1">{service.location}</span>
                    </div>
                    <div className="font-bold text-lg text-slate-900">
                        {service.price.toLocaleString()} ETB
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
