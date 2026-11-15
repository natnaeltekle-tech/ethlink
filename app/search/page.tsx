'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search as SearchIcon, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import dynamic from 'next/dynamic'

const ServiceMap = dynamic(() => import('@/components/map/service-map'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-secondary/20 animate-pulse rounded-lg" />
})
import { queryServices } from '@/lib/actions'
import { SERVICE_CATEGORIES } from '@/lib/service-filters'
import { cn } from '@/lib/utils'
import { Haptics } from '@/lib/haptics'

// Exact category values from the create-service form
const FILTER_CATEGORIES = ['All', ...SERVICE_CATEGORIES]

export default function SearchPage() {
  // useSearchParams needs a Suspense boundary for the static build
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SearchPageContent />
    </Suspense>
  )
}

function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlCategory = searchParams.get('category') || 'All'
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [selectedCategory, setSelectedCategory] = useState(urlCategory)
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')

  // Category links (/search?category=…) and back/forward update the selection
  useEffect(() => {
    setSelectedCategory(urlCategory)
  }, [urlCategory])

  const selectCategory = (category: string) => {
    setSelectedCategory(category)
    const qs = new URLSearchParams(searchParams.toString())
    if (category === 'All') qs.delete('category')
    else qs.set('category', category)
    const query = qs.toString()
    router.replace(query ? `/search?${query}` : '/search', { scroll: false })
  }

  useEffect(() => {
    let cancelled = false
    async function fetchServices() {
      setLoading(true)
      setError(null)
      try {
        const category = selectedCategory === 'All' ? undefined : selectedCategory
        const result = await queryServices({ category, search: searchQuery.trim() || undefined })
        if (cancelled) return
        setServices(result.services)
        setError(result.error)
      } catch (err) {
        console.error('Error fetching services:', err)
        if (!cancelled) setError('Could not load services. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    // Debounce typing so slow networks aren't hit on every keystroke
    const timer = setTimeout(fetchServices, searchQuery ? 300 : 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [selectedCategory, searchQuery, retryToken])

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Search Bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services..."
              className="pl-10 bg-secondary border-border"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              Haptics.light()
              setViewMode(viewMode === 'map' ? 'list' : 'map')
            }}
            className="shrink-0"
          >
            <Filter className="h-5 w-5" />
          </Button>
        </div>

        {/* Pill Filter Bar */}
        <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide pb-2">
          {FILTER_CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                Haptics.light()
                selectCategory(category)
              }}
              className={cn(
                'rounded-full whitespace-nowrap',
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground'
              )}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {viewMode === 'map' && error && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-sm">
          <span className="text-muted-foreground">{error}</span>
          <Button size="sm" variant="outline" onClick={() => setRetryToken((t) => t + 1)}>
            Retry
          </Button>
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="h-[calc(100vh-200px)] w-full">
          <ServiceMap services={services} />
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="space-y-4" aria-busy="true">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-secondary/50 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => setRetryToken((t) => t + 1)}>
                Retry
              </Button>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No services found
              {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
            </div>
          ) : (
            services.map((service) => (
              <div
                key={service.id}
                className="p-4 bg-card border border-border rounded-xl"
              >
                <h3 className="font-bold text-lg mb-2">{service.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{service.location}</p>
                <p className="text-primary font-bold">
                  {service.price ? `ETB ${service.price.toLocaleString()}` : 'Negotiable'}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
