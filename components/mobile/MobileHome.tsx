'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Handshake,
  Search,
  Star,
  SlidersHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/notification-bell'
import { ServiceCover } from '@/components/service/service-cover'
import { FavoriteHeart, useFavoriteIds } from '@/components/service/favorite-heart'
import {
  buildServicesHref,
  countActiveFilters,
  recallServiceFilters,
  type ServiceFilters,
} from '@/lib/service-filters'
import MobileMapExplore from './MobileMapExplore'
import MobileSearchFilters from './MobileSearchFilters'
import MobileNotifications from './MobileNotifications'

export default function MobileHome({ services = [] }: { services?: any[] }) {
  const fav = useFavoriteIds()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  // Last filters applied on Explore (this device/session) so Home ↔ Explore keeps them.
  const [lastFilters, setLastFilters] = useState<ServiceFilters>({})
  const [searchText, setSearchText] = useState('')

  React.useEffect(() => {
    const recalled = recallServiceFilters()
    setLastFilters(recalled)
    setSearchText(recalled.search ?? '')
  }, [])

  const activeFilterCount = countActiveFilters(lastFilters)

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(buildServicesHref({ ...lastFilters, search: searchText.trim() || undefined }))
  }

  React.useEffect(() => {
    try {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setUserId(data.user.id)
      }).catch(() => {
        /* auth optional on home */
      })
    } catch {
      /* missing env should not black-screen the home */
    }
  }, [])

  if (showNotifications) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0B0C15]">
        <MobileNotifications />
        <button
          onClick={() => setShowNotifications(false)}
          className="absolute top-12 right-6 z-[110] text-white/60 hover:text-white bg-black/50 p-2 rounded-full backdrop-blur-sm"
        >
          ✕
        </button>
      </div>
    )
  }

  if (showMap) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0B0C15]">
        <MobileMapExplore services={services} onClose={() => setShowMap(false)} />
      </div>
    )
  }

  return (
    <div className="bg-[#f8f8f5] dark:bg-[#0B0C15] font-sans text-white selection:bg-[#f5c619] selection:text-black min-h-screen pb-32">
      <div className="sticky top-0 z-50 bg-[#f8f8f5]/80 dark:bg-[#0B0C15]/80 backdrop-blur-md">
        <div className="flex items-center p-4 pb-2 justify-between">
          <div className="flex items-center justify-center gap-3">
            <Handshake className="w-6 h-6 text-[#f5c619]" />
            <h2 className="text-[#f5c619] text-xl font-extrabold leading-tight tracking-tight">
              Eth-Links
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell userId={userId} />
          </div>
        </div>

        <div className="px-4 py-3 flex flex-row gap-2 items-center w-full">
          <form
            role="search"
            onSubmit={submitSearch}
            className="flex w-full items-stretch bg-white/5 backdrop-blur-md border border-white/5 rounded-full h-12 overflow-hidden ring-1 ring-white/10 focus-within:ring-[#f5c619]/50 transition-all">
            <div className="text-[#f5c619] flex items-center justify-center pl-4">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="search"
              enterKeyHint="search"
              aria-label="Search services"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              maxLength={200}
              className="form-input flex w-full min-w-0 flex-1 border-none bg-transparent focus:outline-0 focus:ring-0 h-full placeholder:text-gray-500 px-4 text-base font-medium text-white"
              placeholder="Search for luxury stays, cars, guides..."
            />
          </form>
          <button
            type="button"
            aria-label="Filters"
            onClick={() => setShowFilters(true)}
            className="relative h-12 w-12 shrink-0 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <SlidersHorizontal className="w-5 h-5 text-[#f5c619]" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#f5c619] text-black text-[11px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <main>
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-[#f5c619] text-2xl font-extrabold tracking-tight">
            Featured Services
          </h2>
          <Link href="/services">
            <button className="text-[#f5c619] text-sm font-bold">View all</button>
          </Link>
        </div>

        <div className="p-4 space-y-6">
          {(!services || services.length === 0) && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/70 text-sm">
              No featured services yet. Pull to refresh or open Explore.
            </div>
          )}

          {(services || []).map((service, index) => (
            <div
              key={service.id || index}
              className="flex flex-col items-stretch justify-start rounded-3xl overflow-hidden bg-white/5 backdrop-blur-md border border-white/5 group relative"
            >
              <FavoriteHeart
                serviceId={service.id}
                saved={fav.ids.has(service.id)}
                signedIn={fav.signedIn}
                className="absolute top-4 right-4 z-10"
                onChange={(on) => fav.setIds((prev) => { const next = new Set(prev); if (on) next.add(service.id); else next.delete(service.id); return next })}
              />
              <div className="absolute top-4 left-4 z-10 bg-[#f5c619] text-black text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                Premium
              </div>
              <Link href={'/services/' + service.id} className="flex flex-col w-full h-full">
                <ServiceCover
                  service={service}
                  priority={index === 0}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="flex w-full flex-col gap-3 p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[#f5c619] text-sm font-bold uppercase tracking-wider">
                        {service.category}{' '}
                        {service.location ? `• ${service.location}` : ''}
                      </p>
                      <h3 className="text-white text-xl font-bold leading-tight mt-1">
                        {service.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                      <Star className="w-[18px] h-[18px] text-[#f5c619] fill-[#f5c619]" />
                      <span className="text-white font-bold text-sm">
                        {Number(service.avg_rating) > 0
                          ? Number(service.avg_rating).toFixed(1)
                          : 'New'}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2">{service.description}</p>
                  <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[#f5c619] text-xl font-extrabold">
                        {service.price} ETB
                      </span>
                    </div>
                    <div className="flex items-center justify-center rounded-full h-10 px-6 bg-[#f5c619] text-black text-sm font-bold hover:bg-white transition-colors">
                      Explore
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </main>

      {showFilters && (
        <MobileSearchFilters
          initialFilters={{ ...lastFilters, search: searchText.trim() || undefined }}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  )
}
