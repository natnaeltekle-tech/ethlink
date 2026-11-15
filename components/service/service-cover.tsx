'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { DEFAULT_SERVICE_IMAGE } from '@/lib/constants'
import { getServiceImageUrl, isOptimizableImage } from '@/lib/service-image'

interface ServiceCoverProps {
  service: {
    title?: string | null
    image_url?: string | null
    gallery?: unknown
    images?: unknown
  }
  /** Eager-load (above-the-fold first card only). */
  priority?: boolean
  /** Responsive sizes hint; defaults to full width on phones, grid column on desktop. */
  sizes?: string
  className?: string
  /** Overlays (badges, gradients, price) rendered on top of the image. */
  children?: ReactNode
}

/**
 * The one service cover image used on Home and Explore.
 * Fixed 4:3 box (no layout shift), object-cover, image_url → gallery[0] →
 * default fallback, placeholder while loading, fade-in, error → default image.
 * Card must have the `group` class for the hover zoom.
 */
export function ServiceCover({
  service,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  className,
  children,
}: ServiceCoverProps) {
  const [src, setSrc] = useState(() => getServiceImageUrl(service))
  const [loaded, setLoaded] = useState(false)

  return (
    <div className={cn('relative w-full aspect-[4/3] overflow-hidden bg-muted', className)}>
      {!loaded && <div aria-hidden className="absolute inset-0 animate-pulse bg-muted" />}
      <Image
        src={src}
        alt={service.title || 'Service'}
        fill
        sizes={sizes}
        priority={priority}
        quality={70}
        unoptimized={!isOptimizableImage(src)}
        className={cn(
          'object-cover transition-[opacity,transform] duration-500 group-hover:scale-110',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (src !== DEFAULT_SERVICE_IMAGE) {
            setSrc(DEFAULT_SERVICE_IMAGE)
          } else {
            setLoaded(true) // stop the shimmer; bg-muted shows instead
          }
        }}
      />
      {children}
    </div>
  )
}
