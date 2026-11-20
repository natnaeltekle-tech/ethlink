'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCommissionRate } from '@/lib/actions/payments'
import { getServiceImageUrl } from '@/lib/service-image'
import { sanitizeDescription, sanitizeReviewComment } from '@/lib/sanitize'
import { ADDIS_ZONES, SERVICE_MODES, normalizeEthiopianPhone, type VerificationStatus } from '@/lib/provider-screening'
import { revalidateWorkspaces } from '@/lib/revalidate'

// ─── Shared shapes ──────────────────────────────────────────────────────────
export type Person = { id: string; name: string; avatarUrl: string | null; isVerified: boolean; hasLicense: boolean }

export type DashboardBooking = {
    id: string
    status: string
    date: string
    createdAt: string
    guests: number
    /** What the customer paid / will pay (ETB) */
    amount: number
    /** Provider's net (after commission) */
    providerEarnings: number
    disputeReason: string | null
    disputeResolution: string | null
    payoutStatus: 'unpaid' | 'paid_out'
    paidOutAt: string | null
    payoutMethod: string | null
    payoutReference: string | null
    /** Where the job happens: the customer's landmark, else the listing's area + landmark */
    where: string | null
    service: { id: string; title: string; category: string; image: string; pricingUnit: string | null; price: number }
    /** The other party: provider (customer view) or customer (provider view) */
    counterpart: Person
    reviewed: boolean
}

export type CustomerDashboard = {
    bookings: DashboardBooking[]
    favorites: { serviceId: string; title: string; category: string; price: number; pricingUnit: string | null; location: string | null; image: string }[]
    recentSearches: { id: string; query: string; createdAt: string }[]
}

export type ProviderDashboard = {
    income: { netEarned: number; inEscrow: number; awaitingPayout: number; paidOut: number }
    payouts: DashboardBooking[]
    jobs: { requests: DashboardBooking[]; upcoming: DashboardBooking[]; history: DashboardBooking[] }
    services: {
        id: string; title: string; category: string; price: number; pricingUnit: string | null; image: string
        isActive: boolean; avgRating: number; reviewCount: number; bookingCount: number; openBookings: number
    }[]
    verification: {
        status: VerificationStatus
        rejectionReason: string | null
        isVerified: boolean
        hasLicense: boolean
        accountType: 'individual' | 'business' | null
        businessName: string | null
    }
    serviceArea: {
        zones: string[]; modes: string[]; yearsExperience: number | null; bio: string | null
        payout: { telebirr: string | null; cbe: string | null; accountName: string } | null
    } | null
}

async function session() {
    const supabase = await createClient()
    try {
        const { data } = await supabase.auth.getUser()
        return { supabase, user: data.user }
    } catch {
        return { supabase, user: null }
    }
}

const mask = (v: string | null, keep = 4) => (v ? `${'•'.repeat(Math.max(0, v.length - keep))}${v.slice(-keep)}` : null)
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0)

type RawBooking = {
    id: string; status: string; date: string; created_at: string; guests: number | null; user_id: string | null
    commission_amount: number | null; provider_earnings: number | null
    quoted_price: number | null; amount_paid: number | null
    dispute_reason: string | null; dispute_resolution: string | null
    payout_status: 'unpaid' | 'paid_out'; paid_out_at: string | null; payout_method: string | null; payout_reference: string | null
    landmark: string | null
    services: { id: string; title: string; category: string; price: number; pricing_unit: string | null; image_url: string | null; gallery: string[] | null; images: string[] | null; user_id: string; location: string | null; landmark: string | null } | null
}

const BOOKING_SELECT =
    'id, status, date, created_at, guests, user_id, commission_amount, provider_earnings, quoted_price, amount_paid, dispute_reason, dispute_resolution, payout_status, paid_out_at, payout_method, payout_reference, landmark, services(id, title, category, price, pricing_unit, image_url, gallery, images, user_id, location, landmark)'

async function peopleById(supabase: Awaited<ReturnType<typeof createClient>>, ids: string[]): Promise<Map<string, Person>> {
    const unique = [...new Set(ids.filter(Boolean))]
    const map = new Map<string, Person>()
    if (!unique.length) return map
    const { data } = await supabase
        .from('public_profiles')
        .select('id, full_name, first_name, avatar_url, is_verified, has_business_license')
        .in('id', unique)
    for (const p of data ?? []) {
        map.set(p.id, {
            id: p.id,
            name: p.full_name?.trim() || p.first_name || 'Eth-Links user',
            avatarUrl: p.avatar_url,
            isVerified: Boolean(p.is_verified),
            hasLicense: Boolean(p.has_business_license),
        })
    }
    return map
}

function toBooking(b: RawBooking, counterpart: Person, rate: number, reviewed: boolean): DashboardBooking {
    // Locked at booking/payment time — later price edits never change past bookings.
    const price = num(b.quoted_price ?? b.services?.price)
    const charged = b.provider_earnings != null && b.commission_amount != null ? num(b.provider_earnings) + num(b.commission_amount) : null
    const amount = b.amount_paid != null ? num(b.amount_paid) : charged ?? price
    const earnings = b.provider_earnings ?? amount * (1 - rate)
    return {
        id: b.id, status: b.status, date: b.date, createdAt: b.created_at, guests: b.guests ?? 1,
        amount, providerEarnings: num(earnings),
        disputeReason: b.dispute_reason, disputeResolution: b.dispute_resolution,
        payoutStatus: b.payout_status ?? 'unpaid', paidOutAt: b.paid_out_at, payoutMethod: b.payout_method, payoutReference: b.payout_reference,
        where: b.landmark || [b.services?.location, b.services?.landmark].filter(Boolean).join(' · ') || null,
        service: {
            id: b.services?.id ?? '', title: b.services?.title ?? 'Service', category: b.services?.category ?? '',
            image: getServiceImageUrl(b.services ?? undefined), pricingUnit: b.services?.pricing_unit ?? null, price,
        },
        counterpart, reviewed,
    }
}

const unknownPerson = (id: string | null): Person => ({ id: id ?? '', name: id ? 'Eth-Links user' : 'Deleted account', avatarUrl: null, isVerified: false, hasLicense: false })

// ─── Customer ───────────────────────────────────────────────────────────────
export async function getCustomerDashboard(): Promise<CustomerDashboard | null> {
    const { supabase, user } = await session()
    if (!user) return null
    const rate = await getCommissionRate()

    const [{ data: rawBookings }, { data: myReviews }, { data: favs }, { data: searches }] = await Promise.all([
        supabase.from('bookings').select(BOOKING_SELECT).eq('user_id', user.id).order('date', { ascending: false }).limit(100),
        supabase.from('reviews').select('booking_id').eq('user_id', user.id).not('booking_id', 'is', null),
        supabase.from('favorites').select('service_id, created_at, services(id, title, category, price, pricing_unit, location, image_url, gallery, images)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('saved_searches').select('id, query, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    ])

    const bookings = (rawBookings ?? []) as unknown as RawBooking[]
    const people = await peopleById(supabase, bookings.map((b) => b.services?.user_id ?? ''))
    const reviewed = new Set((myReviews ?? []).map((r) => r.booking_id))

    return {
        bookings: bookings.map((b) => toBooking(b, (b.services?.user_id && people.get(b.services.user_id)) || unknownPerson(b.services?.user_id ?? null), rate, reviewed.has(b.id))),
        // Hidden/removed services come back as null: skip them
        favorites: (favs ?? []).flatMap((f) => {
            const s = f.services as unknown as { id: string; title: string; category: string; price: number; pricing_unit: string | null; location: string | null; image_url: string | null; gallery: string[] | null; images: string[] | null } | null
            return s ? [{ serviceId: s.id, title: s.title, category: s.category, price: num(s.price), pricingUnit: s.pricing_unit, location: s.location, image: getServiceImageUrl(s) }] : []
        }),
        recentSearches: (searches ?? []).map((s) => ({ id: s.id, query: s.query, createdAt: s.created_at })),
    }
}

export type ActionResult = { ok: true } | { ok: false; error: string }

const uuid = z.string().uuid()

export async function cancelMyBooking(bookingId: string): Promise<ActionResult> {
    if (!uuid.safeParse(bookingId).success) return { ok: false, error: 'Invalid booking' }
    const { supabase, user } = await session()
    if (!user) return { ok: false, error: 'Please log in again' }
    const { data, error } = await supabase.from('bookings').update({ status: 'cancelled' })
        .eq('id', bookingId).eq('user_id', user.id).in('status', ['pending', 'confirmed']).select('id')
    if (error || !data?.length) return { ok: false, error: 'This booking can no longer be cancelled here' }
    revalidateWorkspaces()
    return { ok: true }
}

export async function reportDispute(bookingId: string, reason: string): Promise<ActionResult> {
    if (!uuid.safeParse(bookingId).success) return { ok: false, error: 'Invalid booking' }
    const text = sanitizeDescription(reason ?? '', 1000)
    if (text.length < 10) return { ok: false, error: 'Please describe what went wrong (at least 10 characters)' }
    const { supabase, user } = await session()
    if (!user) return { ok: false, error: 'Please log in again' }
    const { data, error } = await supabase.from('bookings').update({ status: 'disputed', dispute_reason: text })
        .eq('id', bookingId).eq('user_id', user.id).eq('status', 'paid').select('id')
    if (error || !data?.length) {
        console.error('[dashboard] dispute failed:', error)
        return { ok: false, error: 'Disputes can only be opened while the payment is held in escrow' }
    }
    revalidateWorkspaces()
    return { ok: true }
}

export async function reviewBooking(bookingId: string, rating: number, comment: string): Promise<ActionResult> {
    if (!uuid.safeParse(bookingId).success) return { ok: false, error: 'Invalid booking' }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: 'Choose 1–5 stars' }
    const text = sanitizeReviewComment(comment ?? '').slice(0, 1000)
    const { supabase, user } = await session()
    if (!user) return { ok: false, error: 'Please log in again' }
    const { data: booking } = await supabase.from('bookings').select('id, service_id, status').eq('id', bookingId).eq('user_id', user.id).maybeSingle()
    if (!booking || booking.status !== 'completed') return { ok: false, error: 'You can review a service after the job is completed' }
    const { error } = await supabase.from('reviews').insert({ service_id: booking.service_id, user_id: user.id, booking_id: booking.id, rating, comment: text || null })
    if (error) {
        if (error.code === '23505') return { ok: false, error: 'You already reviewed this booking' }
        console.error('[dashboard] review failed:', error)
        return { ok: false, error: 'Could not save your review. Please try again.' }
    }
    revalidateWorkspaces()
    revalidatePath(`/services/${booking.service_id}`)
    return { ok: true }
}

/** Completed bookings of this service by the current user that have no review yet. */
export async function getReviewableBookings(serviceId: string): Promise<{ id: string; date: string }[]> {
    if (!uuid.safeParse(serviceId).success) return []
    const { supabase, user } = await session()
    if (!user) return []
    const [{ data: done }, { data: reviews }] = await Promise.all([
        supabase.from('bookings').select('id, date').eq('user_id', user.id).eq('service_id', serviceId).eq('status', 'completed').order('date', { ascending: false }),
        supabase.from('reviews').select('booking_id').eq('user_id', user.id).eq('service_id', serviceId),
    ])
    const reviewed = new Set((reviews ?? []).map((r) => r.booking_id))
    return (done ?? []).filter((b) => !reviewed.has(b.id))
}

export async function recordSearch(query: string): Promise<void> {
    const q = (query ?? '').trim().replace(/\s+/g, ' ').slice(0, 200)
    if (q.length < 2) return
    const { supabase, user } = await session()
    if (!user) return
    await supabase.from('saved_searches').delete().eq('user_id', user.id).ilike('query', q)
    await supabase.from('saved_searches').insert({ user_id: user.id, query: q })
    // Keep only the latest 10
    const { data } = await supabase.from('saved_searches').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).range(10, 100)
    if (data?.length) await supabase.from('saved_searches').delete().in('id', data.map((d) => d.id))
}

export async function clearRecentSearches(): Promise<void> {
    const { supabase, user } = await session()
    if (!user) return
    await supabase.from('saved_searches').delete().eq('user_id', user.id)
    revalidateWorkspaces()
}

const accountSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(100),
    lastName: z.string().trim().max(100),
    phone: z.string(),
    bio: z.string().trim().max(500, 'Bio is too long (500 characters max)'),
})

export async function updateAccount(input: { firstName: string; lastName: string; phone: string; bio: string }): Promise<ActionResult> {
    const parsed = accountSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your details' }
    const phone = parsed.data.phone.trim() ? normalizeEthiopianPhone(parsed.data.phone) : null
    if (parsed.data.phone.trim() && !phone) return { ok: false, error: 'Enter a valid Ethiopian mobile number (+251…)' }
    const { supabase, user } = await session()
    if (!user) return { ok: false, error: 'Please log in again' }
    const { error } = await supabase.from('profiles').update({
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName || null,
        full_name: [parsed.data.firstName, parsed.data.lastName].filter(Boolean).join(' '),
        phone_number: phone,
        bio: sanitizeDescription(parsed.data.bio, 500) || null,
        updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    if (error) {
        console.error('[dashboard] updateAccount failed:', error)
        return { ok: false, error: 'Could not save your details' }
    }
    revalidateWorkspaces()
    return { ok: true }
}

// ─── Provider ───────────────────────────────────────────────────────────────
export async function getProviderDashboard(): Promise<ProviderDashboard | null> {
    const { supabase, user } = await session()
    if (!user) return null
    const rate = await getCommissionRate()

    const [{ data: profile }, { data: services }, { data: ratings }, { data: application }] = await Promise.all([
        supabase.from('profiles').select('verification_status, rejection_reason, is_verified, has_business_license, account_type, business_name, role').eq('id', user.id).maybeSingle(),
        supabase.from('services').select('id, title, category, price, pricing_unit, image_url, gallery, images, is_active, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('services_view').select('id, avg_rating, review_count').eq('user_id', user.id),
        supabase.from('provider_verifications').select('service_zones, service_modes, years_experience, bio, payout_telebirr_phone, payout_cbe_account, payout_account_name').eq('user_id', user.id).maybeSingle(),
    ])

    const serviceIds = (services ?? []).map((s) => s.id)
    const { data: rawBookings } = serviceIds.length
        ? await supabase.from('bookings').select(BOOKING_SELECT).in('service_id', serviceIds).order('date', { ascending: true }).limit(500)
        : { data: [] as unknown[] }
    const bookings = (rawBookings ?? []) as unknown as RawBooking[]
    const people = await peopleById(supabase, bookings.map((b) => b.user_id ?? ''))
    const all = bookings.map((b) => toBooking(b, (b.user_id && people.get(b.user_id)) || unknownPerson(b.user_id), rate, false))

    const sum = (list: DashboardBooking[]) => Math.round(list.reduce((n, b) => n + b.providerEarnings, 0) * 100) / 100
    const completed = all.filter((b) => b.status === 'completed')
    const ratingById = new Map((ratings ?? []).map((r) => [r.id, r]))

    return {
        income: {
            netEarned: sum(completed),
            inEscrow: sum(all.filter((b) => b.status === 'paid')),
            awaitingPayout: sum(completed.filter((b) => b.payoutStatus === 'unpaid')),
            paidOut: sum(completed.filter((b) => b.payoutStatus === 'paid_out')),
        },
        payouts: completed.filter((b) => b.payoutStatus === 'paid_out').sort((a, b) => (b.paidOutAt ?? '').localeCompare(a.paidOutAt ?? '')),
        jobs: {
            requests: all.filter((b) => b.status === 'pending'),
            upcoming: all.filter((b) => b.status === 'confirmed' || b.status === 'paid'),
            history: all.filter((b) => ['completed', 'cancelled', 'disputed', 'refunded'].includes(b.status)).reverse(),
        },
        services: (services ?? []).map((s) => {
            const r = ratingById.get(s.id)
            const forService = all.filter((b) => b.service.id === s.id)
            return {
                id: s.id, title: s.title, category: s.category, price: num(s.price), pricingUnit: s.pricing_unit,
                image: getServiceImageUrl(s), isActive: Boolean(s.is_active),
                avgRating: num(r?.avg_rating), reviewCount: num(r?.review_count),
                bookingCount: forService.filter((b) => b.status !== 'cancelled').length,
                openBookings: forService.filter((b) => ['pending', 'confirmed', 'paid'].includes(b.status)).length,
            }
        }),
        verification: {
            status: (profile?.verification_status ?? 'unsubmitted') as VerificationStatus,
            rejectionReason: profile?.rejection_reason ?? null,
            isVerified: Boolean(profile?.is_verified),
            hasLicense: Boolean(profile?.has_business_license),
            accountType: profile?.account_type ?? null,
            businessName: profile?.business_name ?? null,
        },
        serviceArea: application ? {
            zones: application.service_zones ?? [], modes: application.service_modes ?? [],
            yearsExperience: application.years_experience, bio: application.bio,
            payout: { telebirr: mask(application.payout_telebirr_phone), cbe: mask(application.payout_cbe_account), accountName: application.payout_account_name },
        } : null,
    }
}

const areaSchema = z.object({
    zones: z.array(z.enum(ADDIS_ZONES as unknown as [string, ...string[]])).min(1, 'Choose at least one zone'),
    modes: z.array(z.enum(SERVICE_MODES.map((m) => m.value) as [string, ...string[]])).min(1, 'Choose at least one service mode'),
    yearsExperience: z.coerce.number().int().min(0).max(60),
    bio: z.string().trim().min(20, 'Describe your experience (20+ characters)').max(1000),
})

export async function updateServiceArea(input: { zones: string[]; modes: string[]; yearsExperience: number; bio: string }): Promise<ActionResult> {
    const parsed = areaSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your details' }
    const { supabase, user } = await session()
    if (!user) return { ok: false, error: 'Please log in again' }
    const { data, error } = await supabase.from('provider_verifications').update({
        service_zones: parsed.data.zones, service_modes: parsed.data.modes,
        years_experience: parsed.data.yearsExperience, bio: sanitizeDescription(parsed.data.bio, 1000),
    }).eq('user_id', user.id).select('user_id')
    if (error || !data?.length) {
        console.error('[dashboard] updateServiceArea failed:', error)
        return { ok: false, error: 'Service area can be edited once your application is approved' }
    }
    revalidateWorkspaces()
    return { ok: true }
}
