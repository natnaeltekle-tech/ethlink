import { Suspense } from 'react'
import { StickyHeader } from '@/components/home/sticky-header'
import { CategoryCircles } from '@/components/home/category-circles'
import { FeaturedFeed } from '@/components/home/featured-feed'
import { ShimmerCard } from '@/components/ui/shimmer-card'

function FeaturedFeedSkeleton() {
  return (
    <div className="px-4 py-6">
      {[1, 2, 3].map((i) => (
        <ShimmerCard key={i} />
      ))}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <StickyHeader />
      
      {/* Category Circles */}
      <div className="py-6">
        <CategoryCircles />
      </div>

      {/* Featured Feed */}
      <div className="px-4">
        <h2 className="text-2xl font-bold mb-4 px-4">Featured Services</h2>
        <Suspense fallback={<FeaturedFeedSkeleton />}>
          <FeaturedFeed />
        </Suspense>
      </div>
    </div>
  )
}
