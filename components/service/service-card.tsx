'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MapPin, Star, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ServiceCover } from '@/components/service/service-cover'

interface ServiceCardProps {
    service: {
        id: string
        title: string
        category: string
        price: number
        location: string
        image_url?: string | null
        gallery?: unknown
        images?: unknown
        // services_view columns
        avg_rating?: number | null
        total_reviews?: number | null
    }
    className?: string
    distance?: number
    /** Eager-load the cover (first card above the fold). */
    priority?: boolean
}

export function ServiceCard({ service, className, distance, priority = false }: ServiceCardProps) {
    const rating = Number(service.avg_rating) || 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
            className={cn('h-full', className)}
        >
            <Link href={`/services/${service.id}`} className="block h-full">
                <Card className="h-full flex flex-col overflow-hidden border-border/50 bg-card hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group">
                    <ServiceCover service={service} priority={priority}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />

                        <Badge
                            variant="secondary"
                            className="absolute top-3 right-3 backdrop-blur-md bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-sm"
                        >
                            {service.category}
                        </Badge>

                        <div className="absolute bottom-3 left-3 flex flex-col items-start">
                            <span className="text-xs font-medium text-white/80 uppercase tracking-wider">Starting at</span>
                            <span className="text-lg font-bold text-white">
                                {service.price ? `${service.price.toLocaleString()} ETB` : 'Negotiable'}
                            </span>
                        </div>
                    </ServiceCover>

                    <CardContent className="flex-1 p-5 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                            <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                {service.title}
                            </h3>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="line-clamp-1">{service.location}</span>
                            </div>

                            {rating > 0 && (
                                <div className="flex items-center gap-1 text-amber-500 font-medium">
                                    <Star className="h-3.5 w-3.5 fill-current" />
                                    <span>{rating.toFixed(1)}</span>
                                    <span className="text-muted-foreground ml-0.5 font-normal">
                                        ({service.total_reviews || 0})
                                    </span>
                                </div>
                            )}

                            {distance !== undefined && (
                                <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full ml-auto">
                                    {distance < 1
                                        ? `${(distance * 1000).toFixed(0)}m`
                                        : `${distance.toFixed(1)}km`
                                    }
                                </div>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="p-5 pt-0 mt-auto">
                        <Button variant="ghost" className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                            View Details
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </CardFooter>
                </Card>
            </Link>
        </motion.div>
    )
}
