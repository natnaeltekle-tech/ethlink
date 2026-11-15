'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin-auth'
import { ID_TYPES, KYC_BUCKET, SERVICE_MODES } from '@/lib/provider-screening'

const SIGNED_URL_SECONDS = 300 // documents viewable for 5 minutes per page load

export type ProviderApplication = {
    userId: string
    fullName: string | null
    phone: string | null
    accountType: 'individual' | 'business' | null
    businessName: string | null
    businessCategory: string | null
    submittedAt: string | null
    idTypeLabel: string
    phoneWhatsapp: boolean
    phoneTelegram: boolean
    serviceModes: string[]
    serviceZones: string[]
    payoutTelebirr: string | null
    payoutCbe: string | null
    payoutAccountName: string
    yearsExperience: number | null
    bio: string | null
    hasLicense: boolean
    docs: { label: string; url: string | null; isPdf: boolean }[]
    services: { id: string; title: string; category: string; price: number }[]
}

async function adminUserId(): Promise<string | null> {
    if (!(await isAdmin())) return null
    try {
        const { data } = await (await createClient()).auth.getUser()
        return data.user?.id ?? null
    } catch {
        return null
    }
}

/** Pending provider applications with short-lived signed document URLs. Admin only. */
export async function getPendingProviderApplications(): Promise<ProviderApplication[]> {
    if (!(await adminUserId())) return []
    const admin = createAdminClient()

    const { data: profiles, error } = await admin
        .from('profiles')
        .select('id, full_name, phone_number, account_type, business_name, business_category, verification_submitted_at')
        .eq('verification_status', 'pending')
        .order('verification_submitted_at', { ascending: true })
        .limit(50)
    if (error || !profiles?.length) {
        if (error) console.error('[review] pending profiles:', error)
        return []
    }

    const ids = profiles.map((p) => p.id)
    const [{ data: apps }, { data: services }] = await Promise.all([
        admin.from('provider_verifications').select('*').in('user_id', ids),
        admin.from('services').select('id, title, category, price, user_id').in('user_id', ids).order('created_at', { ascending: false }),
    ])

    // Sign every document path in one round trip
    const paths = (apps ?? []).flatMap((a) => [a.id_front_path, a.id_back_path, a.selfie_path, a.license_path].filter((p): p is string => Boolean(p)))
    const signed = new Map<string, string>()
    if (paths.length) {
        const { data: urls, error: signError } = await admin.storage.from(KYC_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS)
        if (signError) console.error('[review] sign urls:', signError)
        for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl)
    }
    const doc = (label: string, path: string | null) =>
        path ? [{ label, url: signed.get(path) ?? null, isPdf: path.toLowerCase().endsWith('.pdf') }] : []

    return profiles.flatMap((p) => {
        const a = apps?.find((x) => x.user_id === p.id)
        if (!a) return []
        return [{
            userId: p.id,
            fullName: p.full_name,
            phone: p.phone_number,
            accountType: p.account_type,
            businessName: p.business_name,
            businessCategory: p.business_category,
            submittedAt: p.verification_submitted_at,
            idTypeLabel: ID_TYPES.find((t) => t.value === a.id_type)?.label ?? a.id_type,
            phoneWhatsapp: a.phone_whatsapp,
            phoneTelegram: a.phone_telegram,
            serviceModes: a.service_modes.map((m) => SERVICE_MODES.find((s) => s.value === m)?.label ?? m),
            serviceZones: a.service_zones,
            payoutTelebirr: a.payout_telebirr_phone,
            payoutCbe: a.payout_cbe_account,
            payoutAccountName: a.payout_account_name,
            yearsExperience: a.years_experience,
            bio: a.bio,
            hasLicense: Boolean(a.license_path),
            docs: [
                ...doc('ID front', a.id_front_path),
                ...doc('ID back', a.id_back_path),
                ...doc('Selfie with ID', a.selfie_path),
                ...doc('Trade License / Certificate', a.license_path),
            ],
            services: (services ?? []).filter((s) => s.user_id === p.id).map(({ id, title, category, price }) => ({ id, title, category, price })),
        }]
    })
}

const uuid = z.string().uuid()

async function notify(userId: string, content: string, link: string) {
    try {
        await createAdminClient().from('notifications').insert({ user_id: userId, content, type: 'info', link })
    } catch (e) {
        console.warn('[review] notify skipped:', e)
    }
}

/** Approve: verified + is_verified (synced by trigger), optional license badge. */
export async function approveProvider(userId: string, opts: { licenseApproved: boolean }) {
    const reviewer = await adminUserId()
    if (!reviewer) throw new Error('Unauthorized')
    if (!uuid.safeParse(userId).success) throw new Error('Invalid provider')
    const admin = createAdminClient()

    const { data: app } = await admin.from('provider_verifications').select('license_path').eq('user_id', userId).maybeSingle()
    if (!app) throw new Error('No application on file')

    const { error } = await admin
        .from('profiles')
        .update({
            verification_status: 'verified',
            verified_at: new Date().toISOString(),
            rejection_reason: null,
            has_business_license: Boolean(opts.licenseApproved && app.license_path),
        })
        .eq('id', userId)
        .eq('verification_status', 'pending')
    if (error) {
        console.error('[review] approve failed:', error)
        throw new Error('Could not approve provider')
    }
    await admin.from('provider_verifications').update({ reviewed_at: new Date().toISOString(), reviewed_by: reviewer }).eq('user_id', userId)
    await notify(userId, '✔ You are verified! Your listings are now live and customers can book you.', '/dashboard')

    revalidatePath('/admin')
    revalidatePath('/services')
    return { success: true }
}

const reasonSchema = z.string().trim().min(5, 'Give the provider a clear reason (5+ characters)').max(500)

/** Reject with a reason the provider sees; they can fix and re-submit. */
export async function rejectProvider(userId: string, reason: string) {
    const reviewer = await adminUserId()
    if (!reviewer) throw new Error('Unauthorized')
    if (!uuid.safeParse(userId).success) throw new Error('Invalid provider')
    const parsed = reasonSchema.safeParse(reason)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid reason')
    const admin = createAdminClient()

    const { error } = await admin
        .from('profiles')
        .update({ verification_status: 'rejected', rejection_reason: parsed.data, has_business_license: false })
        .eq('id', userId)
        .eq('verification_status', 'pending')
    if (error) {
        console.error('[review] reject failed:', error)
        throw new Error('Could not reject provider')
    }
    await admin.from('provider_verifications').update({ reviewed_at: new Date().toISOString(), reviewed_by: reviewer }).eq('user_id', userId)
    await notify(userId, `Verification not approved: ${parsed.data} — tap to fix and re-submit.`, '/services/new')

    revalidatePath('/admin')
    return { success: true }
}
