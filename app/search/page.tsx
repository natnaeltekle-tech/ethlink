'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Search as SearchIcon, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ServiceMap from '@/components/map/ServiceMap'
import { getFilteredServices } from '@/lib/actions'
import { cn } from '@/lib/utils'
import { Haptics } from '@/lib/haptics'

const FILTER_CATEGORIES = [
  'All',
  'Hotels',
  'Transport',
  'Home Services',
  'Tech',
  'Events',
  'Health',
  'Food',
]

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')

  useEffect(() => {
    async function fetchServices() {
      setLoading(true)
      try {
        const category = selectedCategory === 'All' ? undefined : selectedCategory
        const data = await getFilteredServices(category, searchQuery || undefined)
        setServices(data || [])
      } catch (error) {
        console.error('Error fetching services:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [selectedCategory, searchQuery])

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
                setSelectedCategory(category)
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
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No services found
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
