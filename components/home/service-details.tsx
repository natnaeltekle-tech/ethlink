'use client'

import { Button } from '@/components/ui/button'
import { MapPin, Star } from 'lucide-react'
import { DEFAULT_SERVICE_IMAGE } from '@/lib/constants'
import { Haptics } from '@/lib/haptics'
import Link from 'next/link'
import { SafeImage } from '@/components/ui/safe-image'

interface ServiceDetailsProps {
  service: any
}

export function ServiceDetails({ service }: ServiceDetailsProps) {
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
  }

  return (
    <div className="space-y-6">
      {/* Image - Bulletproof with SafeImage component */}
      <div className="rounded-xl overflow-hidden">
        <SafeImage
          src={getImageSrc()}
          alt={service.title}
          containerClassName="aspect-video w-full min-h-[300px] bg-muted relative overflow-hidden"
        />
      </div>

      {/* Title and Rating */}
      <div>
        <h2 className="text-2xl font-bold mb-2">{service.title}</h2>
        {service.avg_rating && service.avg_rating > 0 && (
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{service.avg_rating.toFixed(1)}</span>
            <span className="text-muted-foreground">
              ({service.review_count || 0} reviews)
            </span>
          </div>
        )}
      </div>

      {/* Price */}
      <div className="text-3xl font-bold text-primary">
        {service.price ? (
          <>
            ETB {service.price.toLocaleString()}
            {['Hospitality', 'Hotels', 'Transport'].includes(service.category) && (
              <span className="text-lg font-normal text-foreground"> / night</span>
            )}
          </>
        ) : (
          'Negotiable'
        )}
      </div>

      {/* Location */}
      <div className="flex items-start gap-3">
        <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">{service.location}</p>
          {service.latitude && service.longitude && (
            <p className="text-sm text-muted-foreground">Location available</p>
          )}
        </div>
      </div>

      {/* Description */}
      {service.description && (
        <div>
          <h3 className="font-semibold mb-2">Description</h3>
          <p className="text-muted-foreground leading-relaxed">{service.description}</p>
        </div>
      )}

      {/* Category */}
      {service.category && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Category:</span>
          <span className="px-3 py-1 bg-secondary rounded-full text-sm font-medium">
            {service.category}
          </span>
        </div>
      )}

      {/* Book Now Button */}
      <Link href={`/book/${service.id}`} className="block">
        <Button
          onClick={handleBookNow}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg font-semibold rounded-full"
        >
          Book Now
        </Button>
      </Link>
    </div>
  )
}
