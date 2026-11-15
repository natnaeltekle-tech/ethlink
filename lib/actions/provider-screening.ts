'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { serviceSchema } from '@/lib/validations'
import { sanitizeDescription } from '@/lib/sanitize'
import {
    ADDIS_ZONES,
    ID_TYPES,
    PRICING_UNITS,
    SERVICE_MODES,
    WEEK_DAYS,
    isOwnKycPath,
    normalizeCbeAccount,
    normalizeEthiopianPhone,
    type VerificationStatus,
} from '@/lib/provider-screening'
import type { Profile, ProviderVerification } from '@/lib/types/database'

export type ScreeningState = {
    userId: string
    email: string | null
    profile: Pick<
        Profile,
        | 'full_name' | 'phone_number' | 'account_type' | 'business_name' | 'business_category'
        | 'verification_status' | 'rejection_reason' | 'has_business_license'
    > | null
    application: Pick<
        ProviderVerification,
        | 'id_type' | 'phone_whatsapp' | 'phone_telegram' | 'service_modes' | 'service_zones'
        | 'payout_telebirr_phone' | 'payout_cbe_account' | 'payout_account_name' | 'years_experience' | 'bio'
    > | null
}

/** The signed-in provider's own screening state (RLS: own rows only). */
export async function getMyScreeningState(): Promise<ScreeningState | null> {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* no session */ }
    if (!user) return null

    const [{ data: profile }, { data: application }] = await Promise.all([
        supabase
            .from('profiles')
            .select('full_name, phone_number, account_type, business_name, business_category, verification_status, rejection_reason, has_business_license')
            .eq('id', user.id)
            .maybeSingle(),
        supabase
            .from('provider_verifications')
            .select('id_type, phone_whatsapp, phone_telegram, service_modes, service_zones, payout_telebirr_phone, payout_cbe_account, payout_account_name, years_experience, bio')
            .eq('user_id', user.id)
            .maybeSingle(),
    ])

    return { userId: user.id, email: user.email ?? null, profile: profile ?? null, application: application ?? null }
}

const optionalText = (max: number) =>
    z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(max).optional())

const identitySchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(100),
    lastName: z.string().trim().min(1, 'Last name is required').max(100),
    accountType: z.enum(['individual', 'business']),
    businessName: optionalText(150),
    businessCategory: optionalText(100),
    idType: z.enum(ID_TYPES.map((t) => t.value) as [string, ...string[]]),
    idFrontPath: z.string(),
    idBackPath: optionalText(300),
    selfiePath: z.string(),
    licensePath: optionalText(300),
})

const contactSchema = z.object({
    phone: z.string(),
    phoneWhatsapp: z.boolean(),
    phoneTelegram: z.boolean(),
    serviceModes: z.array(z.enum(SERVICE_MODES.map((m) => m.value) as [string, ...string[]])).min(1, 'Choose at least one service mode'),
    serviceZones: z.array(z.enum(ADDIS_ZONES as unknown as [string, ...string[]])).min(1, 'Choose at least one service zone'),
    payoutTelebirr: optionalText(30),
    payoutCbe: optionalText(30),
    payoutAccountName: z.string().trim().min(3, 'Account holder name is required').max(150),
    yearsExperience: z.coerce.number().int().min(0).max(60),
    bio: z.string().trim().min(20, 'Tell customers a bit more about your experience (20+ characters)').max(1000),
})

const serviceExtrasSchema = z.object({
    pricingUnit: z.enum(PRICING_UNITS.map((p) => p.value) as [string, ...string[]]),
    workingDays: z.array(z.enum(WEEK_DAYS.map((d) => d.value) as [string, ...string[]])).min(1, 'Choose your working days'),
    opensAt: z.string().regex(/^\d{2}:\d{2}$/, 'Opening time is required'),
    closesAt: z.string().regex(/^\d{2}:\d{2}$/, 'Closing time is required'),
    whatsIncluded: optionalText(1000),
    amenities: z.array(z.string().trim().max(60)).max(20),
    gallery: z.array(z.string().url().max(2000)).max(10),
})

export type SubmitResult = { ok: true; serviceId: string; status: VerificationStatus } | { ok: false; error: string }

function firstIssue(e: unknown): string {
    if (e instanceof z.ZodError) return e.issues[0]?.message ?? 'Please check the form'
    return e instanceof Error ? e.message : 'Something went wrong'
}

/**
 * Submit identity + contact/payout (when not yet verified) and the listing.
 * The listing is saved immediately but stays hidden until an admin approves
 * the provider (enforced in the database by RLS + the booking guard).
 */
export async function submitProviderListing(formData: FormData): Promise<SubmitResult> {
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* no session */ }
    if (!user) return { ok: false, error: 'Please log in again' }

    const { data: current } = await supabase
        .from('profiles')
        .select('verification_status')
        .eq('id', user.id)
        .maybeSingle()
    const status = (current?.verification_status ?? 'unsubmitted') as VerificationStatus
    const needsScreening = status === 'unsubmitted' || status === 'rejected'

    const str = (k: string) => (formData.get(k) as string | null) ?? ''
    const all = (k: string) => (formData.getAll(k) as string[]).filter(Boolean)

    try {
        // ── Service fields (always) ─────────────────────────────────────────
        const rawCategory = str('category')
        const category = rawCategory === 'Other' && str('custom_category').trim() ? str('custom_category').trim() : rawCategory
        const gallery = all('gallery')
        const lat = str('latitude'), lng = str('longitude')
        const service = serviceSchema.parse({
            title: str('title'),
            category,
            location: str('location'),
            price: str('price'),
            description: sanitizeDescription(str('description')),
            image_url: gallery[0] ?? '',
            latitude: lat === '' ? undefined : lat,
            longitude: lng === '' ? undefined : lng,
        })
        const extras = serviceExtrasSchema.parse({
            pricingUnit: str('pricing_unit') || 'fixed',
            workingDays: all('working_days'),
            opensAt: str('opens_at'),
            closesAt: str('closes_at'),
            whatsIncluded: str('whats_included'),
            amenities: all('amenities'),
            gallery,
        })
        if (extras.closesAt <= extras.opensAt) return { ok: false, error: 'Closing time must be after opening time' }
        if (gallery.length === 0) return { ok: false, error: 'Add at least one photo of your work or place' }
        const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
        if (gallery.some((u) => !u.startsWith(`${supabaseUrl}/storage/v1/object/public/service-images/${user.id}/`))) {
            return { ok: false, error: 'Photos must be uploaded from this form' }
        }

        // ── Screening (only when not already pending/verified) ──────────────
        if (needsScreening) {
            const identity = identitySchema.parse({
                firstName: str('firstName'),
                lastName: str('lastName'),
                accountType: str('account_type'),
                businessName: str('business_name'),
                businessCategory: str('business_category'),
                idType: str('id_type'),
                idFrontPath: str('id_front_path'),
                idBackPath: str('id_back_path'),
                selfiePath: str('selfie_path'),
                licensePath: str('license_path'),
            })
            const contact = contactSchema.parse({
                phone: str('phone'),
                phoneWhatsapp: str('phone_whatsapp') === 'on',
                phoneTelegram: str('phone_telegram') === 'on',
                serviceModes: all('service_modes'),
                serviceZones: all('service_zones'),
                payoutTelebirr: str('payout_telebirr'),
                payoutCbe: str('payout_cbe'),
                payoutAccountName: str('payout_account_name'),
                yearsExperience: str('years_experience') || '0',
                bio: str('bio'),
            })

            const needsBack = ID_TYPES.find((t) => t.value === identity.idType)?.needsBack ?? true
            if (!isOwnKycPath(identity.idFrontPath, user.id)) return { ok: false, error: 'Upload the front of your ID' }
            if (needsBack && !isOwnKycPath(identity.idBackPath, user.id)) return { ok: false, error: 'Upload the back of your ID' }
            if (!isOwnKycPath(identity.selfiePath, user.id)) return { ok: false, error: 'Upload a selfie holding your ID' }
            if (identity.licensePath && !isOwnKycPath(identity.licensePath, user.id)) return { ok: false, error: 'Invalid license upload' }
            if (identity.accountType === 'business' && !identity.businessName) {
                return { ok: false, error: 'Business name is required for a registered business' }
            }

            const phone = normalizeEthiopianPhone(contact.phone)
            if (!phone) return { ok: false, error: 'Enter a valid Ethiopian mobile number (+251…)' }
            const telebirr = contact.payoutTelebirr ? normalizeEthiopianPhone(contact.payoutTelebirr) : null
            if (contact.payoutTelebirr && !telebirr) return { ok: false, error: 'Telebirr number must be an Ethiopian mobile number' }
            const cbe = contact.payoutCbe ? normalizeCbeAccount(contact.payoutCbe) : null
            if (contact.payoutCbe && !cbe) return { ok: false, error: 'CBE account number must be 13 digits' }
            if (!telebirr && !cbe) return { ok: false, error: 'Add a Telebirr number or CBE account for payouts' }

            const { error: profileError } = await supabase.from('profiles').upsert({
                id: user.id,
                first_name: identity.firstName,
                last_name: identity.lastName,
                full_name: `${identity.firstName} ${identity.lastName}`,
                phone_number: phone,
                role: 'provider',
                account_type: identity.accountType,
                business_name: identity.accountType === 'business' ? identity.businessName ?? null : null,
                business_category: identity.businessCategory ?? category,
            })
            if (profileError) {
                console.error('[screening] profile update failed:', profileError)
                return { ok: false, error: 'Could not save your details. Please try again.' }
            }

            const { error: appError } = await supabase.from('provider_verifications').upsert({
                user_id: user.id,
                id_type: identity.idType as ProviderVerification['id_type'],
                id_front_path: identity.idFrontPath,
                id_back_path: needsBack ? identity.idBackPath ?? null : null,
                selfie_path: identity.selfiePath,
                license_path: identity.licensePath ?? null,
                phone_whatsapp: contact.phoneWhatsapp,
                phone_telegram: contact.phoneTelegram,
                service_modes: contact.serviceModes,
                service_zones: contact.serviceZones,
                payout_telebirr_phone: telebirr,
                payout_cbe_account: cbe,
                payout_account_name: contact.payoutAccountName,
                years_experience: contact.yearsExperience,
                bio: sanitizeDescription(contact.bio),
            })
            if (appError) {
                console.error('[screening] application save failed:', appError)
                return { ok: false, error: 'Could not save your verification documents. Please try again.' }
            }
        }

        // ── Listing (hidden until the provider is verified) ─────────────────
        const { data: created, error: serviceError } = await supabase
            .from('services')
            .insert({
                ...service,
                user_id: user.id,
                image_url: gallery[0],
                gallery,
                amenities: extras.amenities.length ? extras.amenities : null,
                pricing_unit: extras.pricingUnit as 'fixed',
                working_days: extras.workingDays,
                opens_at: extras.opensAt,
                closes_at: extras.closesAt,
                whats_included: extras.whatsIncluded ?? null,
            })
            .select('id')
            .single()
        if (serviceError || !created) {
            console.error('[screening] service insert failed:', serviceError)
            return { ok: false, error: 'Could not save your listing. Please try again.' }
        }

        // ── Submit for review ───────────────────────────────────────────────
        let finalStatus: VerificationStatus = status
        if (needsScreening) {
            const { data: submitted } = await supabase
                .from('profiles')
                .update({ verification_status: 'pending' })
                .eq('id', user.id)
                .select('verification_status')
                .single()
            finalStatus = (submitted?.verification_status ?? status) as VerificationStatus
            if (finalStatus !== 'pending') {
                return { ok: false, error: 'Your listing was saved, but the application could not be submitted. Please try again.' }
            }
            await notifyAdmins(`New provider application to review (${service.category})`)
        }

        revalidatePath('/dashboard')
        revalidatePath('/admin')
        return { ok: true, serviceId: created.id, status: finalStatus }
    } catch (e) {
        return { ok: false, error: firstIssue(e) }
    }
}

async function notifyAdmins(content: string) {
    try {
        const admin = createAdminClient()
        const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin').limit(10)
        if (admins?.length) {
            await admin.from('notifications').insert(
                admins.map((a) => ({ user_id: a.id, content, type: 'info' as const, link: '/admin#provider-verification' }))
            )
        }
    } catch (e) {
        console.warn('[screening] admin notify skipped:', e)
    }
}
