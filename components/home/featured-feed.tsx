'use client'

import { useEffect, useState } from 'react'
import { FeaturedCard } from './featured-card'
import { ShimmerCard } from '@/components/ui/shimmer-card'
import { getLatestServices } from '@/lib/actions'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { ServiceDetails } from '@/components/home/service-details'

export function FeaturedFeed() {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<any | null>(null)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)

  useEffect(() => {
    async function fetchServices() {
      try {
        const data = await getLatestServices(20)
        setServices(data || [])
      } catch (error) {
        console.error('Error fetching services:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [])

  const handleBookNow = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId)
    if (service) {
      setSelectedService(service)
      setIsBottomSheetOpen(true)
    }
  }

  if (loading) {
    return (
      <div>
        {[1, 2, 3].map((i) => (
          <ShimmerCard key={i} />
        ))}
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No services available at the moment.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {services.map((service) => (
          <FeaturedCard
            key={service.id}
            service={service}
            onBookNow={handleBookNow}
          />
        ))}
      </div>

      <BottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => {
          setIsBottomSheetOpen(false)
          setSelectedService(null)
        }}
        title={selectedService?.title}
      >
        {selectedService && (
          <ServiceDetails service={selectedService} />
        )}
      </BottomSheet>
    </>
  )
}
