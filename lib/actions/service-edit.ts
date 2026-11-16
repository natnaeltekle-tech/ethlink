'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { serviceSchema } from '@/lib/validations'
import { sanitizeDescription } from '@/lib/sanitize'
import { PRICING_UNITS, WEEK_DAYS } from '@/lib/provider-screening'

export type EditableService = {
    id: string
    title: string
    category: string
    location: string
    price: number
    pricingUnit: string
    description: string
    whatsIncluded: string
    workingDays: string[]
    opensAt: string
    closesAt: string
    amenities: string[]
    gallery: string[]
    latitude: number | null
    longitude: number | null
    isActive: boolean
}

async function session() {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* no session */ }
    return { supabase, user }
}

/** The signed-in provider's own listing, or null if it isn't theirs. */
export async function getMyServiceForEdit(serviceId: string): Promise<{ userId: string; service: EditableService } | null> {
    if (!z.string().uuid().safeParse(serviceId).success) return null
    const { supabase, user } = await session()
    if (!user) return null
    const { data: s } = await supabase
        .from('services')
        .select('id, title, category, location, price, pricing_unit, description, whats_included, working_days, opens_at, closes_at, amenities, gallery, images, image_url, latitude, longitude, is_active, user_id')
        .eq('id', serviceId)
        .eq('user_id', user.id)
        .maybeSingle()
    if (!s) return null
    const gallery = (s.gallery?.length ? s.gallery : s.images?.length ? s.images : s.image_url ? [s.image_url] : []).filter(Boolean)
    return {
        userId: user.id,
        service: {
            id: s.id,
            title: s.title,
            category: s.category,
            location: s.location ?? '',
            price: Number(s.price),
            pricingUnit: s.pricing_unit ?? 'fixed',
            description: s.description ?? '',
            whatsIncluded: s.whats_included ?? '',
            workingDays: s.working_days ?? [],
            opensAt: (s.opens_at ?? '08:00').slice(0, 5),
            closesAt: (s.closes_at ?? '18:00').slice(0, 5),
            amenities: s.amenities ?? [],
            gallery: gallery.slice(0, 8),
            latitude: s.latitude,
            longitude: s.longitude,
            isActive: s.is_active !== false,
        },
    }
}

const optionalText = (max: number) =>
    z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(max).optional())

const extrasSchema = z.object({
    pricingUnit: z.enum(PRICING_UNITS.map((p) => p.value) as [string, ...string[]]),
    workingDays: z.array(z.enum(WEEK_DAYS.map((d) => d.value) as [string, ...string[]])).min(1, 'Choose your working days'),
    opensAt: z.string().regex(/^\d{2}:\d{2}$/, 'Opening time is required'),
    closesAt: z.string().regex(/^\d{2}:\d{2}$/, 'Closing time is required'),
    whatsIncluded: optionalText(1000),
    amenities: z.array(z.string().trim().max(60)).max(20),
    gallery: z.array(z.string().url().max(2000)).min(1, 'Keep at least one photo').max(8, 'Up to 8 photos'),
})

export type UpdateServiceResult = { ok: true } | { ok: false; error: string }

/** Update an existing listing in place (price, hours, description, photos…). The category stays fixed. */
export async function updateMyService(serviceId: string, formData: FormData): Promise<UpdateServiceResult> {
    const current = await getMyServiceForEdit(serviceId)
    if (!current) return { ok: false, error: 'Listing not found' }
    const { supabase } = await session()
    const { userId, service: existing } = current

    const str = (k: string) => (formData.get(k) as string | null) ?? ''
    const all = (k: string) => (formData.getAll(k) as string[]).filter(Boolean)

    const parsedBase = serviceSchema.safeParse({
        title: str('title'),
        category: existing.category,
        location: str('location'),
        price: str('price'),
        description: sanitizeDescription(str('description')),
        image_url: '',
        latitude: str('latitude') || undefined,
        longitude: str('longitude') || undefined,
    })
    if (!parsedBase.success) return { ok: false, error: parsedBase.error.issues[0]?.message ?? 'Check the form' }
    const parsedExtras = extrasSchema.safeParse({
        pricingUnit: str('pricing_unit') || 'fixed',
        workingDays: all('working_days'),
        opensAt: str('opens_at'),
        closesAt: str('closes_at'),
        whatsIncluded: str('whats_included'),
        amenities: all('amenities'),
        gallery: all('gallery'),
    })
    if (!parsedExtras.success) return { ok: false, error: parsedExtras.error.issues[0]?.message ?? 'Check the form' }
    const base = parsedBase.data
    const extras = parsedExtras.data
    if (extras.closesAt <= extras.opensAt) return { ok: false, error: 'Closing time must be after opening time' }

    // Photos: either already on this listing, or freshly uploaded to the provider's own folder.
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
    const ownPrefix = `${supabaseUrl}/storage/v1/object/public/service-images/${userId}/`
    if (extras.gallery.some((u) => !existing.gallery.includes(u) && !u.startsWith(ownPrefix))) {
        return { ok: false, error: 'Photos must be uploaded from this form' }
    }

    const { error } = await supabase
        .from('services')
        .update({
            title: base.title,
            location: base.location,
            price: base.price,
            description: base.description,
            latitude: base.latitude ?? existing.latitude,
            longitude: base.longitude ?? existing.longitude,
            pricing_unit: extras.pricingUnit as 'fixed',
            working_days: extras.workingDays,
            opens_at: extras.opensAt,
            closes_at: extras.closesAt,
            whats_included: extras.whatsIncluded ?? null,
            amenities: extras.amenities.length ? extras.amenities : null,
            gallery: extras.gallery,
            image_url: extras.gallery[0],
            is_active: str('is_active') === 'on',
            updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId)
        .eq('user_id', userId)
    if (error) {
        console.error('[service-edit] update failed:', error)
        return { ok: false, error: 'Could not save your changes. Please try again.' }
    }

    revalidatePath(`/services/${serviceId}`)
    revalidatePath('/services')
    revalidatePath('/dashboard')
    return { ok: true }
}
