# Component Standardization Analysis

## 1. Files to Rename (PascalCase -> kebab-case)

The following files were identified as needing renaming to match the kebab-case convention:

### `components/`
-   [ ] `AddLink.tsx` -> `add-link.tsx`
-   [ ] `PrefetchAddRoute.tsx` -> `prefetch-add-route.tsx`

### `components/service/`
-   [ ] `ChatBox.tsx` -> `chat-box.tsx`
-   [ ] `ImageUploader.tsx` -> `image-uploader.tsx`
-   [ ] `ProviderCard.tsx` -> `provider-card.tsx`
-   [ ] `ReviewsList.tsx` -> `reviews-list.tsx`
-   [ ] `ServiceActions.tsx` -> `service-actions.tsx`
-   [ ] `ServiceCard.tsx` -> `service-card-old.tsx` (or merge with `components/service-card.tsx`)
-   [ ] `ServiceGallery.tsx` -> `service-gallery.tsx`
-   [ ] `ServiceHeader.tsx` -> `service-header.tsx`
-   [ ] `ServiceListing.tsx` -> `service-listing.tsx`

### `components/dashboard/`
-   [ ] `DashboardClient.tsx` -> `dashboard-client.tsx`
-   [ ] `DashboardTabs.tsx` -> `dashboard-tabs.tsx`
-   [ ] `ProviderPanel.tsx` -> `provider-panel.tsx`
-   [ ] `SettingsTab.tsx` -> `settings-tab.tsx`

**Note:** `components/service-card.tsx` already exists and seems to be a lighter version of `components/service/ServiceCard.tsx`. You should verify if these are duplicates.

---

## 2. Standardized `ServiceCard` Structure

Here is the recommended internal structure for `components/service/service-card.tsx` (or `components/service-card.tsx`), incorporating Shadcn UI (Card, Badge, Button) and Framer Motion for animations.

```tsx
'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { MapPin, Star, Building2, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ServiceCardProps {
    service: {
        id: string
        title: string
        category: string
        price: number
        location: string
        image_url?: string | null
        rating?: number
        review_count?: number
        // Support array of images from views if necessary
        images?: string[]
    }
    className?: string
}

export function ServiceCard({ service, className }: ServiceCardProps) {
    // Determine image source with fallback
    const mainImage = service.images?.[0] || service.image_url

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
                    
                    {/* Image Container */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {mainImage ? (
                            <Image
                                src={mainImage}
                                alt={service.title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground/20">
                                <Building2 className="h-16 w-16" />
                            </div>
                        )}
                        
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />

                        {/* Category Badge */}
                        <Badge 
                            variant="secondary" 
                            className="absolute top-3 right-3 backdrop-blur-md bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-sm"
                        >
                            {service.category}
                        </Badge>

                        {/* Price Tag */}
                         <div className="absolute bottom-3 left-3 flex flex-col items-start">
                            <span className="text-xs font-medium text-white/80 uppercase tracking-wider">Starting at</span>
                            <span className="text-lg font-bold text-white">
                                {service.price ? `${service.price.toLocaleString()} ETB` : 'Negotiable'}
                            </span>
                        </div>
                    </div>

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
                            
                            {/* Optional: Rating */}
                            {(service.rating || 0) > 0 && (
                                <div className="flex items-center gap-1 text-amber-500 font-medium">
                                    <Star className="h-3.5 w-3.5 fill-current" />
                                    <span>{service.rating}</span>
                                    <span className="text-muted-foreground ml-0.5 font-normal">
                                        ({service.review_count || 0})
                                    </span>
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
```
