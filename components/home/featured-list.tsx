"use client"

import React from 'react'
import { FeaturedCard } from './featured-card'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { ServiceDetails } from '@/components/home/service-details'

type Props = {
  services: any[]
  onBookNow: (id: string) => void
  isBottomSheetOpen: boolean
  onCloseBottomSheet: () => void
  selectedService: any | null
}

export function FeaturedList({
  services,
  onBookNow,
  isBottomSheetOpen,
  onCloseBottomSheet,
  selectedService,
}: Props) {
  return (
    <>
      <div className="space-y-6">
        {services.map((service) => (
          <FeaturedCard
            key={service.id}
            service={service}
            onBookNow={onBookNow}
          />
        ))}
      </div>

      <BottomSheet
        isOpen={isBottomSheetOpen}
        onClose={onCloseBottomSheet}
        title={selectedService?.title}
      >
        {selectedService && <ServiceDetails service={selectedService} />}
      </BottomSheet>
    </>
  )
}

export default FeaturedList
