'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SlidersHorizontal, X } from 'lucide-react'
import MobileSearchFilters from '@/components/mobile/MobileSearchFilters'
import {
    buildServicesHref,
    countActiveFilters,
    rememberServiceFilters,
    type ServiceFilters,
} from '@/lib/service-filters'

/**
 * Filter button + removable chips for the active Explore filters.
 * Also remembers the applied filters so Home can pre-fill them.
 */
export function ServiceFilterBar({ filters }: { filters: ServiceFilters }) {
    const [open, setOpen] = useState(false)
    const activeCount = countActiveFilters(filters)

    useEffect(() => {
        rememberServiceFilters(filters)
    }, [filters])

    const chips: { label: string; without: ServiceFilters }[] = []
    if (filters.search) chips.push({ label: `“${filters.search}”`, without: { ...filters, search: undefined } })
    if (filters.category) chips.push({ label: filters.category, without: { ...filters, category: undefined } })
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        const label =
            filters.minPrice !== undefined && filters.maxPrice !== undefined
                ? `${filters.minPrice.toLocaleString()}–${filters.maxPrice.toLocaleString()} ETB`
                : filters.minPrice !== undefined
                    ? `≥ ${filters.minPrice.toLocaleString()} ETB`
                    : `≤ ${filters.maxPrice!.toLocaleString()} ETB`
        chips.push({ label, without: { ...filters, minPrice: undefined, maxPrice: undefined } })
    }
    if (filters.location) chips.push({ label: filters.location, without: { ...filters, location: undefined } })
    if (filters.minRating) chips.push({ label: `${filters.minRating}★+`, without: { ...filters, minRating: undefined } })

    return (
        <>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-full border border-border bg-secondary text-sm font-semibold hover:bg-secondary/80"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {activeCount > 0 && (
                        <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-black inline-flex items-center justify-center">
                            {activeCount}
                        </span>
                    )}
                </button>
                {chips.map((chip) => (
                    <Link
                        key={chip.label}
                        href={buildServicesHref(chip.without)}
                        scroll={false}
                        aria-label={`Remove filter ${chip.label}`}
                        className="shrink-0 inline-flex items-center gap-1.5 h-9 pl-3 pr-2 rounded-full bg-primary/10 text-primary text-sm font-medium whitespace-nowrap"
                    >
                        {chip.label}
                        <X className="h-3.5 w-3.5" />
                    </Link>
                ))}
                {chips.length > 1 && (
                    <Link
                        href="/services"
                        scroll={false}
                        className="shrink-0 h-9 px-3 inline-flex items-center text-sm text-muted-foreground underline-offset-2 hover:underline"
                    >
                        Clear all
                    </Link>
                )}
            </div>
            {open && <MobileSearchFilters initialFilters={filters} onClose={() => setOpen(false)} />}
        </>
    )
}
