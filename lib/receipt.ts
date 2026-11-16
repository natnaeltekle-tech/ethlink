import QRCode from 'qrcode'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin-auth'
import { getBaseUrl } from '@/lib/base-url'

export type ReceiptViewer = 'customer' | 'provider' | 'admin' | 'public'

export type EscrowReceiptData = {
    bookingId: string
    viewer: ReceiptViewer
    status: string
    receiptNumber: string | null
    amount: number
    paidAt: string | null
    method: string | null
    reference: string | null
    scheduledAt: string
    guests: number
    disputeReason: string | null
    disputeResolution: string | null
    service: { id: string; title: string; category: string; location: string | null }
    customerName: string
    provider: { name: string; businessName: string | null; isVerified: boolean; hasLicense: boolean }
    verifyUrl: string
    qrSvg: string
}

/** Statuses that have an escrow receipt (money was received). */
export const RECEIPT_STATUSES = ['paid', 'completed', 'disputed', 'refunded'] as const

export const METHOD_LABELS: Record<string, string> = {
    telebirr: 'Telebirr',
    cbe: 'CBE (Commercial Bank of Ethiopia)',
    chapa: 'Chapa',
    card: 'Card (via Chapa)',
    cash: 'Cash (confirmed by Eth-Links)',
    other: 'Bank transfer',
    test: 'Test payment (beta)',
}

const SELECT =
    'id, user_id, status, date, guests, quoted_price, amount_paid, paid_at, receipt_number, payment_method, payment_reference, verify_token, commission_amount, provider_earnings, dispute_reason, dispute_resolution, services(id, title, category, location, price, user_id)'

type Row = {
    id: string; user_id: string | null; status: string; date: string; guests: number | null
    quoted_price: number | null; amount_paid: number | null; paid_at: string | null; receipt_number: string | null
    payment_method: string | null; payment_reference: string | null; verify_token: string
    commission_amount: number | null; provider_earnings: number | null
    dispute_reason: string | null; dispute_resolution: string | null
    services: { id: string; title: string; category: string; location: string | null; price: number; user_id: string | null } | null
}

/** Public link encoded in the QR code and shared via WhatsApp/Telegram. */
export const verifyUrlFor = (token: string) => `${getBaseUrl()}/r/${token}`

function maskReference(ref: string | null): string | null {
    if (!ref) return null
    if (ref.length <= 6) return ref
    return `${ref.slice(0, 3)}•••${ref.slice(-4)}`
}

async function build(row: Row, viewer: ReceiptViewer): Promise<EscrowReceiptData> {
    const admin = createAdminClient()
    const providerId = row.services?.user_id
    const { data: people } = await admin
        .from('public_profiles')
        .select('id, first_name, last_name, full_name, business_name, is_verified, has_business_license')
        .in('id', [row.user_id, providerId].filter((x): x is string => !!x))
    const customer = people?.find((p) => p.id === row.user_id)
    const provider = people?.find((p) => p.id === providerId)

    const customerFull = !row.user_id ? 'Deleted account' : customer?.full_name?.trim() || customer?.first_name || 'Eth-Links customer'
    const customerName = viewer === 'public' && row.user_id
        ? [customer?.first_name || 'Customer', customer?.last_name ? `${customer.last_name[0]}.` : ''].filter(Boolean).join(' ')
        : customerFull

    // Locked amounts only: what was charged, else the price quoted at booking time.
    const charged = row.commission_amount != null && row.provider_earnings != null
        ? Number(row.commission_amount) + Number(row.provider_earnings) : null
    const amount = Number(row.amount_paid ?? charged ?? row.quoted_price ?? row.services?.price ?? 0)

    const verifyUrl = verifyUrlFor(row.verify_token)
    const qrSvg = await QRCode.toString(verifyUrl, {
        type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0B0C15', light: '#FFFFFF' },
    })

    return {
        bookingId: row.id,
        viewer,
        status: row.status,
        receiptNumber: row.receipt_number,
        amount: Math.round(amount * 100) / 100,
        paidAt: row.paid_at,
        method: row.payment_method,
        reference: viewer === 'public' ? maskReference(row.payment_reference) : row.payment_reference,
        scheduledAt: row.date,
        guests: row.guests ?? 1,
        disputeReason: viewer === 'public' ? null : row.dispute_reason,
        disputeResolution: row.dispute_resolution,
        service: {
            id: row.services?.id ?? '',
            title: row.services?.title ?? 'Service',
            category: row.services?.category ?? '',
            location: row.services?.location ?? null,
        },
        customerName,
        provider: {
            name: !providerId ? 'Deleted account' : provider?.full_name?.trim() || provider?.first_name || 'Provider',
            businessName: provider?.business_name ?? null,
            isVerified: Boolean(provider?.is_verified),
            hasLicense: Boolean(provider?.has_business_license),
        },
        verifyUrl,
        qrSvg,
    }
}

/**
 * Full receipt for the booking's customer, the service's provider, or an admin.
 * Returns 'login' when signed out and null when the viewer has no access.
 */
export async function getReceiptForViewer(bookingId: string): Promise<EscrowReceiptData | 'login' | null> {
    if (!z.string().uuid().safeParse(bookingId).success) return null
    const supabase = await createClient()
    let userId: string | null = null
    try { const { data } = await supabase.auth.getUser(); userId = data.user?.id ?? null } catch { /* signed out */ }
    if (!userId) return 'login'

    const { data } = await createAdminClient().from('bookings').select(SELECT).eq('id', bookingId).maybeSingle()
    const row = data as unknown as Row | null
    if (!row) return null

    let viewer: ReceiptViewer | null = null
    if (row.user_id && row.user_id === userId) viewer = 'customer'
    else if (row.services?.user_id && row.services.user_id === userId) viewer = 'provider'
    else if (await isAdmin()) viewer = 'admin'
    if (!viewer) return null
    return build(row, viewer)
}

/** Public verification view (QR / shared link): no contact details, masked reference. */
export async function getReceiptByToken(token: string): Promise<EscrowReceiptData | null> {
    if (!z.string().uuid().safeParse(token).success) return null
    const { data } = await createAdminClient()
        .from('bookings')
        .select(SELECT)
        .eq('verify_token', token)
        .in('status', [...RECEIPT_STATUSES])
        .maybeSingle()
    const row = data as unknown as Row | null
    return row ? build(row, 'public') : null
}
