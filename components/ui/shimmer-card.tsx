'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function ShimmerCard() {
  return (
    <div className="w-full mb-6 rounded-2xl overflow-hidden bg-card border border-border">
      {/* Image Skeleton */}
      <div className="relative aspect-[4/3] w-full bg-secondary/50">
        <Skeleton className="w-full h-full" />
      </div>

      {/* Content Skeleton */}
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
      </div>
    </div>
  )
}
