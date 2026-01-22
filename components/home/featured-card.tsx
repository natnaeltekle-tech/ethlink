'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Star, MapPin } from 'lucide-react'
import { DEFAULT_SERVICE_IMAGE } from '@/lib/constants'
import { Haptics } from '@/lib/haptics'
import { useState } from 'react'
// Using regular img tag for external URLs

interface FeaturedCardProps {
  service: any
  onBookNow?: (serviceId: string) => void
}

export function FeaturedCard({ service, onBookNow }: FeaturedCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)

  const getImageSrc = () => {
    if (service.gallery && service.gallery.length > 0) {
      return service.gallery[0].startsWith('/')
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/service-images/${service.gallery[0]}`
        : service.gallery[0]
    }
    if (service.image_url) {
      return service.image_url.startsWith('/')
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/service-images/${service.image_url}`
        : service.image_url
    }
    return DEFAULT_SERVICE_IMAGE
  }

  const handleBookNow = () => {
    Haptics.medium()
    if (onBookNow) {
      onBookNow(service.id)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative w-full mb-6 rounded-2xl overflow-hidden bg-card border border-border"
    >
      {/* Image Container with 4:3 Aspect Ratio */}
      <div className="relative aspect-[4/3] w-full bg-secondary/50 overflow-hidden">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/50 to-secondary animate-pulse" />
        )}
        <img
          src={getImageSrc()}
          alt={service.title}
          className="w-full h-full object-cover"
          onLoad={() => setImageLoaded(true)}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          {/* Rating Badge */}
          {service.avg_rating && service.avg_rating > 0 && (
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              {service.avg_rating.toFixed(1)}
            </div>
          )}

          {/* Title */}
          <h3 className="text-2xl font-bold mb-2 line-clamp-2 drop-shadow-lg">
            {service.title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-2 mb-4 text-white/90">
            <MapPin className="w-4 h-4" />
            <span className="text-sm line-clamp-1">{service.location}</span>
          </div>

          {/* Price and Book Button Row */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-3xl font-bold">
                {service.price ? (
                  <>
                    ETB {service.price.toLocaleString()}
                    {['Hospitality', 'Hotels', 'Transport'].includes(service.category) && (
                      <span className="text-lg font-normal"> / night</span>
                    )}
                  </>
                ) : (
                  'Negotiable'
                )}
              </span>
            </div>

            {/* Book Now Button - Absolute positioned */}
            <Button
              onClick={handleBookNow}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-full font-semibold shadow-lg shadow-primary/30 transition-all hover:scale-105"
            >
              Book Now
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
