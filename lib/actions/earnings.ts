'use server'

import { after } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRequestBaseUrl } from '@/lib/base-url'
import { isAdmin } from '@/lib/admin-auth'
import { getBanks, isMockMode, type Bank } from '@/lib/chapa'
import { EscrowError, MIN_WITHDRAWAL_CENTS, releaseBooking, requestWithdrawal, settlePayout, simulateTransfer } from '@/lib/escrow/service'
import { revalidateWorkspaces } from '@/lib/revalidate'
import { revalidatePath } from 'next/cache'
import type { EscrowStatus, Json } from '@/lib/types/database'

async function sessionUser() {
    const supabase = await createClient()
    try {
        const { data } = await supabase.auth.getUser()
        return data.user
    } catch {
        return null
    }
}

export type WalletSummary = {
    available_cents: number
    total_earned_cents: number
    paid_out_cents: number
    pending_payout_cents: number
    held_in_escrow_cents: number
}

export type EarningBooking = {
    id: string
    title: string
    date: string
    escrowStatus: EscrowStatus
    grossCents: number
    commissionBps: number
    commissionCents: number
    netCents: number
    paidAt: string | null
    releasedAt: string | null
}

export type PayoutAccount = {
    id: string
    method: 'bank' | 'telebirr'
    bankCode: string
    bankName: string
    accountName: string
    accountNumberMasked: string
    isDefault: boolean
    cooldownUntil: string
}

export type PayoutRow = {
    reference: string
    amountCents: number
    status: 'pending' | 'completed' | 'failed'
    destination: string
    failureReason: string | null
    requestedAt: string
    completedAt: string | null
}

export type EarningsDashboard = {
    summary: WalletSummary
    bookings: EarningBooking[]
    accounts: PayoutAccount[]
    payouts: PayoutRow[]
    banks: Bank[]
    minWithdrawalCents: number
    sandbox: boolean
}

const mask = (n: string) => `${'•'.repeat(Math.max(n.length - 4, 0))}${n.slice(-4)}`
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0)) || 0

function toSummary(j: Json | null): WalletSummary {
    const o = (j && typeof j === 'object' && !Array.isArray(j) ? j : {}) as Record<string, unknown>
    return {
        available_cents: num(o.available_cents),
        total_earned_cents: num(o.total_earned_cents),
        paid_out_cents: num(o.paid_out_cents),
        pending_payout_cents: num(o.pending_payout_cents),
        held_in_escrow_cents: num(o.held_in_escrow_cents),
    }
}

function destinationOf(snapshot: Json): string {
    const s = (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot : {}) as Record<string, string | undefined>
    return [s.bank_name, s.account_number_masked].filter(Boolean).join(' · ') || 'Manual payout'
}

/** Everything the provider earnings screen needs, computed from the ledger. */
export async function getEarningsDashboard(): Promise<EarningsDashboard | null> {
    const user = await sessionUser()
    if (!user) return null
    const admin = createAdminClient()
    const [summary, bookings, accounts, payouts, banks] = await Promise.all([
        admin.rpc('wallet_summary_for', { p_user: user.id }),
        admin.from('bookings')
            .select('id, date, escrow_status, gross_amount_cents, commission_rate_bps, commission_amount_cents, seller_net_amount_cents, paid_at, released_at, services!inner(title, user_id)')
            .eq('services.user_id', user.id)
            .not('gross_amount_cents', 'is', null)
            .order('paid_at', { ascending: false, nullsFirst: false })
            .limit(40),
        admin.from('payout_accounts').select('*').eq('user_id', user.id).order('created_at'),
        admin.from('payout_requests').select('reference, amount_cents, status, account_snapshot, failure_reason, requested_at, completed_at, failed_at')
            .eq('user_id', user.id).order('requested_at', { ascending: false }).limit(30),
        getBanks(),
    ])

    type B = { id: string; date: string; escrow_status: EscrowStatus; gross_amount_cents: number; commission_rate_bps: number; commission_amount_cents: number; seller_net_amount_cents: number; paid_at: string | null; released_at: string | null; services: { title: string } | { title: string }[] }
    return {
        summary: toSummary(summary.data ?? null),
        bookings: ((bookings.data ?? []) as unknown as B[]).map((b) => ({
            id: b.id,
            title: (Array.isArray(b.services) ? b.services[0]?.title : b.services?.title) || 'Service',
            date: b.date,
            escrowStatus: b.escrow_status,
            grossCents: b.gross_amount_cents,
            commissionBps: b.commission_rate_bps,
            commissionCents: b.commission_amount_cents,
            netCents: b.seller_net_amount_cents,
            paidAt: b.paid_at,
            releasedAt: b.released_at,
        })),
        accounts: (accounts.data ?? []).map((a) => ({
            id: a.id, method: a.method, bankCode: a.bank_code, bankName: a.bank_name, accountName: a.account_name,
            accountNumberMasked: mask(a.account_number), isDefault: a.is_default, cooldownUntil: a.cooldown_until,
        })),
        payouts: (payouts.data ?? []).map((p) => ({
            reference: p.reference, amountCents: p.amount_cents, status: p.status, destination: destinationOf(p.account_snapshot),
            failureReason: p.failure_reason, requestedAt: p.requested_at, completedAt: p.completed_at ?? p.failed_at,
        })),
        banks,
        minWithdrawalCents: MIN_WITHDRAWAL_CENTS,
        sandbox: isMockMode(),
    }
}

type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string }

const accountSchema = z.object({
    bankCode: z.string().trim().min(1).max(40),
    accountName: z.string().trim().min(2, 'Enter the account holder name').max(100),
    accountNumber: z.string().trim().max(30),
})

function normalizeNumber(method: 'bank' | 'telebirr', raw: string): string | null {
    const d = raw.replace(/[\s-]/g, '')
    if (method === 'telebirr') {
        const digits = d.replace(/^\+/, '')
        if (/^2519\d{8}$|^2517\d{8}$/.test(digits)) return `0${digits.slice(3)}`
        if (/^0[79]\d{8}$/.test(digits)) return digits
        if (/^[79]\d{8}$/.test(digits)) return `0${digits}`
        return null
    }
    return /^\d{6,20}$/.test(d) ? d : null
}

/** Add a bank or Telebirr payout account. New accounts can receive money after a 24h security hold. */
export async function addPayoutAccount(input: { bankCode: string; accountName: string; accountNumber: string }): Promise<ActionResult> {
    const user = await sessionUser()
    if (!user) return { ok: false, error: 'Please sign in' }
    const parsed = accountSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form' }
    const bank = (await getBanks()).find((b) => b.code === parsed.data.bankCode)
    if (!bank) return { ok: false, error: 'Choose a bank or wallet' }
    const method = bank.type === 'wallet' ? 'telebirr' : 'bank'
    const number = normalizeNumber(method, parsed.data.accountNumber)
    if (!number) return { ok: false, error: method === 'telebirr' ? 'Enter a valid Ethiopian phone number (09… or 07…)' : 'Enter a valid account number (6–20 digits)' }

    const admin = createAdminClient()
    const { data: existing } = await admin.from('payout_accounts').select('id').eq('user_id', user.id)
    if ((existing ?? []).length >= 5) return { ok: false, error: 'You can save up to 5 payout accounts' }
    const { error } = await admin.from('payout_accounts').insert({
        user_id: user.id, method, bank_code: bank.code, bank_name: bank.name,
        account_name: parsed.data.accountName, account_number: number, is_default: !(existing ?? []).length,
    })
    if (error) return { ok: false, error: error.code === '23505' ? 'This account is already saved' : 'Could not save the account' }
    await notifySelf(user.id, `A new payout account (${bank.name} ${mask(number)}) was added. It can receive withdrawals in 24 hours. If this wasn't you, contact Eth-Links support.`)
    revalidatePath('/provider/earnings')
    return { ok: true }
}

async function notifySelf(userId: string, content: string) {
    await createAdminClient().from('notifications').insert({ user_id: userId, type: 'payment', content, link: '/provider/earnings' })
}

export async function removePayoutAccount(id: string): Promise<ActionResult> {
    const user = await sessionUser()
    if (!user || !z.string().uuid().safeParse(id).success) return { ok: false, error: 'Not allowed' }
    const admin = createAdminClient()
    const { data: pending } = await admin.from('payout_requests').select('id').eq('payout_account_id', id).eq('status', 'pending').limit(1)
    if (pending?.length) return { ok: false, error: 'A withdrawal to this account is still processing' }
    const { data: removed } = await admin.from('payout_accounts').delete().eq('id', id).eq('user_id', user.id).select('is_default')
    if (!removed?.length) return { ok: false, error: 'Account not found' }
    if (removed[0].is_default) {
        const { data: next } = await admin.from('payout_accounts').select('id').eq('user_id', user.id).order('created_at').limit(1)
        if (next?.[0]) await admin.from('payout_accounts').update({ is_default: true }).eq('id', next[0].id)
    }
    revalidatePath('/provider/earnings')
    return { ok: true }
}

export async function makeDefaultPayoutAccount(id: string): Promise<ActionResult> {
    const user = await sessionUser()
    if (!user || !z.string().uuid().safeParse(id).success) return { ok: false, error: 'Not allowed' }
    const admin = createAdminClient()
    const { data: acc } = await admin.from('payout_accounts').select('id').eq('id', id).eq('user_id', user.id).maybeSingle()
    if (!acc) return { ok: false, error: 'Account not found' }
    await admin.from('payout_accounts').update({ is_default: false }).eq('user_id', user.id).eq('is_default', true)
    await admin.from('payout_accounts').update({ is_default: true }).eq('id', id)
    revalidatePath('/provider/earnings')
    return { ok: true }
}

/** Withdraw part or all of the available balance. Overdraft-safe: the database locks per provider. */
export async function withdrawEarnings(input: { amountCents: number; accountId: string }): Promise<ActionResult<{ reference: string; status: 'pending' | 'failed'; sandbox: boolean }>> {
    const user = await sessionUser()
    if (!user) return { ok: false, error: 'Please sign in' }
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0 || !z.string().uuid().safeParse(input.accountId).success) {
        return { ok: false, error: 'Enter a valid amount' }
    }
    try {
        const baseUrl = await getRequestBaseUrl()
        const r = await requestWithdrawal({ userId: user.id, amountCents: input.amountCents, accountId: input.accountId, baseUrl })
        if (r.status === 'failed') return { ok: false, error: `Transfer was rejected: ${r.message ?? 'unknown reason'}. Your balance was restored.` }
        if (isMockMode() && r.accountNumber) {
            const acct = r.accountNumber
            after(() => simulateTransfer(r.reference, acct, baseUrl))
        }
        revalidatePath('/provider/earnings')
        return { ok: true, reference: r.reference, status: r.status, sandbox: isMockMode() }
    } catch (e) {
        if (e instanceof EscrowError) return { ok: false, error: e.message }
        console.error('[withdrawEarnings]', e)
        return { ok: false, error: 'Could not start the withdrawal. Please try again.' }
    }
}

// ── Admin: revenue + payouts ────────────────────────────────────────────────
export type RevenueDashboard = {
    commissionEarnedCents: number
    escrowHeldCents: number
    escrowHeldCount: number
    pendingPayoutCents: number
    pendingPayoutCount: number
    completedPayoutCents: number
    sellersAvailableCents: number
    sandbox: boolean
    recentCommissions: { bookingId: string | null; amountCents: number; createdAt: string; description: string | null }[]
    pendingPayouts: { reference: string; amountCents: number; provider: string; destination: string; requestedAt: string; approved: boolean }[]
    held: { id: string; title: string; grossCents: number; netCents: number; date: string; escrowStatus: EscrowStatus }[]
}

export async function getRevenueDashboard(): Promise<RevenueDashboard | null> {
    if (!(await isAdmin())) return null
    const admin = createAdminClient()
    const [summary, commissions, pending, held] = await Promise.all([
        admin.rpc('platform_revenue_summary'),
        admin.from('wallet_transactions').select('booking_id, amount_cents, created_at, description').eq('event_type', 'commission_earned').order('created_at', { ascending: false }).limit(15),
        admin.from('payout_requests').select('reference, amount_cents, user_id, account_snapshot, requested_at, approved_at').eq('status', 'pending').order('requested_at').limit(50),
        admin.from('bookings').select('id, date, escrow_status, gross_amount_cents, seller_net_amount_cents, services(title)').in('escrow_status', ['held_in_escrow', 'disputed']).order('date').limit(50),
    ])
    const o = (summary.data && typeof summary.data === 'object' ? summary.data : {}) as Record<string, unknown>
    const ids = [...new Set((pending.data ?? []).map((p) => p.user_id).filter((x): x is string => !!x))]
    const { data: people } = ids.length ? await admin.from('profiles').select('id, full_name, business_name, first_name, last_name').in('id', ids) : { data: [] }
    const nameOf = (id: string | null) => {
        const p = (people ?? []).find((x) => x.id === id)
        return p?.business_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || p?.full_name || 'Provider'
    }
    type H = { id: string; date: string; escrow_status: EscrowStatus; gross_amount_cents: number; seller_net_amount_cents: number; services: { title: string } | { title: string }[] | null }
    return {
        commissionEarnedCents: num(o.commission_earned_cents),
        escrowHeldCents: num(o.escrow_held_cents),
        escrowHeldCount: num(o.escrow_held_count),
        pendingPayoutCents: num(o.pending_payout_cents),
        pendingPayoutCount: num(o.pending_payout_count),
        completedPayoutCents: num(o.completed_payout_cents),
        sellersAvailableCents: num(o.sellers_available_cents),
        sandbox: isMockMode(),
        recentCommissions: (commissions.data ?? []).map((c) => ({ bookingId: c.booking_id, amountCents: c.amount_cents, createdAt: c.created_at, description: c.description })),
        pendingPayouts: (pending.data ?? []).map((p) => ({
            reference: p.reference, amountCents: p.amount_cents, provider: nameOf(p.user_id), destination: destinationOf(p.account_snapshot),
            requestedAt: p.requested_at, approved: !!p.approved_at,
        })),
        held: ((held.data ?? []) as unknown as H[]).map((b) => ({
            id: b.id, title: (Array.isArray(b.services) ? b.services[0]?.title : b.services?.title) || 'Service',
            grossCents: b.gross_amount_cents, netCents: b.seller_net_amount_cents, date: b.date, escrowStatus: b.escrow_status,
        })),
    }
}

/** Admin: mark a stuck payout as sent (bank confirmed) or failed (money returns to the provider). */
export async function adminSettlePayout(reference: string, success: boolean, note?: string): Promise<ActionResult<{ result: string }>> {
    if (!(await isAdmin())) return { ok: false, error: 'Unauthorized' }
    if (!/^PO[0-9a-z]{16}$/.test(reference)) return { ok: false, error: 'Invalid reference' }
    try {
        const result = await settlePayout(reference, success, note?.trim().slice(0, 100) || null, success ? null : (note?.trim() || 'Cancelled by Eth-Links'))
        revalidatePath('/admin')
        return { ok: true, result }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Failed' }
    }
}

/** Admin: release a held (undisputed) escrow now. */
export async function adminReleaseEscrow(bookingId: string): Promise<ActionResult<{ result: string }>> {
    if (!(await isAdmin())) return { ok: false, error: 'Unauthorized' }
    if (!z.string().uuid().safeParse(bookingId).success) return { ok: false, error: 'Invalid booking' }
    try {
        const result = await releaseBooking(bookingId, 'admin')
        revalidatePath('/admin')
        revalidateWorkspaces()
        return { ok: true, result }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Failed' }
    }
}
