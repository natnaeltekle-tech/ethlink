import { searchParamsSchema } from '@/lib/validations'

/**
 * Explore filters — single source of truth shared by Home, Explore (/services),
 * /search and the mobile filter sheet.
 *
 * The URL is the canonical filter state (`/services?search=…&category=…`), so
 * filters survive reloads, the back button and Home ↔ Explore navigation.
 * Every field maps to a real `services_view` column:
 *   search → title/description, category → category, min/max price → price,
 *   location → location, min_rating → avg_rating.
 */

/** Categories providers can pick in the create-service form (app/services/new). */
export const SERVICE_CATEGORIES = [
    'Hospitality',
    'Transport',
    'Real Estate',
    'Professional Services',
    'Cleaning',
    'Tech',
    'Events',
] as const

export interface ServiceFilters {
    search?: string
    category?: string
    minPrice?: number
    maxPrice?: number
    location?: string
    minRating?: number
}

type RawParams =
    | URLSearchParams
    | { [key: string]: string | string[] | undefined }

/** Parse + validate filters from URL search params. Invalid values are dropped. */
export function parseServiceFilters(params: RawParams): ServiceFilters {
    const raw: Record<string, string | undefined> = {}
    if (params instanceof URLSearchParams) {
        params.forEach((value, key) => {
            raw[key] = value
        })
    } else {
        for (const [key, value] of Object.entries(params)) {
            raw[key] = Array.isArray(value) ? value[0] : value
        }
    }

    const parsed = searchParamsSchema.parse(raw)
    let minPrice = parsed.min_price
    let maxPrice = parsed.max_price
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
        ;[minPrice, maxPrice] = [maxPrice, minPrice]
    }

    return {
        search: parsed.search || undefined,
        category: parsed.category || undefined,
        minPrice,
        maxPrice,
        location: parsed.location || undefined,
        minRating: parsed.min_rating,
    }
}

/** Build the URL query string for a set of filters (empty values are omitted). */
export function serviceFiltersToQuery(filters: ServiceFilters): string {
    const qs = new URLSearchParams()
    if (filters.search?.trim()) qs.set('search', filters.search.trim())
    if (filters.category) qs.set('category', filters.category)
    if (filters.minPrice !== undefined) qs.set('min_price', String(filters.minPrice))
    if (filters.maxPrice !== undefined) qs.set('max_price', String(filters.maxPrice))
    if (filters.location?.trim()) qs.set('location', filters.location.trim())
    if (filters.minRating) qs.set('min_rating', String(filters.minRating))
    return qs.toString()
}

/** `/services?…` link for a set of filters. */
export function buildServicesHref(filters: ServiceFilters): string {
    const qs = serviceFiltersToQuery(filters)
    return qs ? `/services?${qs}` : '/services'
}

/** Number of active non-search filters (for the filter button badge). */
export function countActiveFilters(filters: ServiceFilters): number {
    return [
        filters.category,
        filters.minPrice !== undefined || filters.maxPrice !== undefined ? 'price' : undefined,
        filters.location,
        filters.minRating,
    ].filter(Boolean).length
}

export function hasAnyFilter(filters: ServiceFilters): boolean {
    return Boolean(filters.search) || countActiveFilters(filters) > 0
}

// ─── Last-used filters (per-device convenience) ─────────────────────────────
// Lets Home pre-fill its search box / filter sheet with what the user last
// applied on Explore. Never required: if storage is blocked, filters still
// work through the URL.
const LAST_FILTERS_KEY = 'ethlinks:last-service-filters'

export function rememberServiceFilters(filters: ServiceFilters): void {
    try {
        window.sessionStorage.setItem(LAST_FILTERS_KEY, serviceFiltersToQuery(filters))
    } catch {
        /* storage unavailable — URL remains the source of truth */
    }
}

export function recallServiceFilters(): ServiceFilters {
    try {
        const qs = window.sessionStorage.getItem(LAST_FILTERS_KEY)
        return qs ? parseServiceFilters(new URLSearchParams(qs)) : {}
    } catch {
        return {}
    }
}
