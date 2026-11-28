import { createClient } from '@/lib/supabase/server'
import { getServiceImageUrl } from '@/lib/service-image'
import { buildServicesHref } from '@/lib/service-filters'
import type { Criteria } from './parse'
import { clean } from './parse'

/** What a chat card needs (all from the database, never from the AI). */
export type ConciergeListing = {
    id: string
    title: string
    category: string
    price: number
    pricingUnit: string | null
    location: string | null
    avgRating: number
    reviewCount: number
    createdAt: string | null
    image: string
}

const LIMIT = 4

/**
 * Active listings for the criteria. Relaxes step by step so one wrong guess
 * (e.g. a category no listing uses yet) never hides real matches:
 *   category + terms (+ place) → terms (+ place) → category (+ place)
 * Returns `relaxed` when the first, strictest attempt found nothing.
 */
export async function searchListings(c: Criteria): Promise<{ listings: ConciergeListing[]; relaxed: boolean; browseHref: string }> {
    const supabase = await createClient()
    const terms = c.terms.map((t) => clean(t, 40)).filter((t) => t.length > 1).slice(0, 4)
    const location = c.location ? clean(c.location, 40) : null
    const maxPrice = c.maxPrice && c.maxPrice > 0 ? Math.min(c.maxPrice, 100_000_000) : null

    const attempts: { category: string | null; terms: string[] }[] = []
    if (c.category && terms.length) attempts.push({ category: c.category, terms })
    if (terms.length) attempts.push({ category: null, terms })
    if (c.category) attempts.push({ category: c.category, terms: [] })
    if (!attempts.length && location) attempts.push({ category: null, terms: [] })

    for (let i = 0; i < attempts.length; i++) {
        const a = attempts[i]
        let q = supabase.from('services_view').select('*').eq('is_active', true)
        if (a.category) q = q.eq('category', a.category)
        if (a.terms.length) q = q.or(a.terms.flatMap((t) => [`title.ilike.%${t}%`, `description.ilike.%${t}%`]).join(','))
        if (location) q = q.ilike('location', `%${location}%`)
        if (maxPrice) q = q.lte('price', maxPrice)
        if (c.sort === 'price_asc') q = q.order('price', { ascending: true })
        else if (c.sort === 'price_desc') q = q.order('price', { ascending: false })
        else q = q.order('avg_rating', { ascending: false, nullsFirst: false }).order('review_count', { ascending: false, nullsFirst: false })
        const { data, error } = await q.limit(LIMIT)
        if (error) { console.error('[concierge] search failed:', error.message); continue }
        if (data?.length) {
            return {
                relaxed: i > 0,
                browseHref: buildServicesHref({ search: a.terms[0], category: a.category ?? undefined, location: location ?? undefined, maxPrice: maxPrice ?? undefined }),
                listings: data.map((s) => ({
                    id: s.id, title: s.title, category: s.category, price: Number(s.price), pricingUnit: s.pricing_unit ?? null,
                    location: s.location, avgRating: Number(s.avg_rating) || 0, reviewCount: Number(s.review_count) || 0,
                    createdAt: s.created_at ?? null, image: getServiceImageUrl(s),
                })),
            }
        }
    }
    return { listings: [], relaxed: false, browseHref: buildServicesHref({ category: c.category ?? undefined }) }
}
