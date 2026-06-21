'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SafeImageProps {
  src?: string | null
  alt?: string
  className?: string
  containerClassName?: string
  fallbackClassName?: string
  sizes?: string
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
}

export function SafeImage({
  src,
  alt = '',
  className,
  containerClassName,
  fallbackClassName,
  sizes = '(max-width: 768px) 100vw, 50vw',
  priority = false,
  onLoad,
  onError,
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleError = () => {
    setHasError(true)
    setIsLoading(false)
    onError?.()
  }

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  // Force container with defined dimensions - prevents layout shifts
  const containerClasses = cn(
    'aspect-video w-full min-h-[300px] bg-muted relative overflow-hidden',
    containerClassName
  )



  return (
    <div className={containerClasses}>
      {/* Loading skeleton */}
      {isLoading && src && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 animate-pulse z-10" />
      )}

      {/* Fallback UI - gradient + icon (NO broken image icon) */}
      {(!src || hasError) && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600/20 to-blue-600/20 z-20',
            fallbackClassName
          )}
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageOff className="w-12 h-12 opacity-50" />
            <span className="text-sm opacity-50">
              {!src ? 'No image available' : 'Failed to load image'}
            </span>
          </div>
        </div>
      )}

      {/* Actual image - only render if src exists and no error */}
      {src && !hasError && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn('object-cover', className)}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  )
}
