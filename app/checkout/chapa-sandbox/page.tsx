import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, FlaskConical, Lock, ShieldCheck, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin-auth'
import { isMockMode, REFERENCE_PATTERN } from '@/lib/chapa'
import { sandboxSelfServe } from '@/lib/escrow/service'
import { formatBps, formatETB } from '@/lib/money'
import { formatBookingDateTime } from '@/lib/booking-time'
import { SandboxActions, SandboxAutoRefresh } from '@/components/payment/sandbox-actions'

export const metadata: Metadata = { title: 'Chapa Sandbox Checkout | Eth-Links', robots: { index: false } }
export const dynamic = 'force-dynamic'

/**
 * Stand-in for Chapa's hosted checkout while no CHAPA_SECRET_KEY is set.
 * The buttons post a signed webhook to the real /api/webhooks/chapa endpoint.
 */
export default async function ChapaSandboxPage({ searchParams }: { searchParams: Promise<{ tx_ref?: string }> }) {
    const { tx_ref: txRef = '' } = await searchParams
    const supabase = await createClient()
    let userId: string | null = null
    try { userId = (await supabase.auth.getUser()).data.user?.id ?? null } catch { /* no session */ }
    if (!userId) redirect(`/auth/login?next=${encodeURIComponent(`/checkout/chapa-sandbox?tx_ref=${txRef}`)}`)

    if (!isMockMode()) {
        return <Shell><p className="text-center text-sm text-muted-foreground">Live payments are on — this test checkout is disabled.</p></Shell>
    }
    if (!REFERENCE_PATTERN.test(txRef)) return <Shell><p className="text-center text-sm">Checkout not found.</p></Shell>

    const admin = createAdminClient()
    const { data: attempt } = await admin.from('payment_attempts')
        .select('tx_ref, status, amount_cents, commission_rate_bps, commission_amount_cents, seller_net_amount_cents, customer_id, booking_id, failure_reason, created_at, bookings(date, services(title))')
        .eq('tx_ref', txRef).maybeSingle()
    const viewerIsAdmin = await isAdmin()
    if (!attempt || (attempt.customer_id !== userId && !viewerIsAdmin)) return <Shell><p className="text-center text-sm">Checkout not found.</p></Shell>

    type Rel = { date: string; services: { title: string } | { title: string }[] | null } | null
    const b = (Array.isArray(attempt.bookings) ? attempt.bookings[0] : attempt.bookings) as Rel
    const title = (Array.isArray(b?.services) ? b?.services[0]?.title : b?.services?.title) ?? 'Service'
    const canSimulate = viewerIsAdmin || (attempt.customer_id === userId && sandboxSelfServe())

    return (
        <Shell>
            <div className="space-y-1 text-center">
                <p className="text-sm text-muted-foreground">Pay Eth-Links</p>
                <p className="text-4xl font-bold tabular-nums">{formatETB(attempt.amount_cents)}</p>
                <p className="truncate text-sm font-medium">{title}</p>
                {b?.date && <p className="text-xs text-muted-foreground">{formatBookingDateTime(b.date)}</p>}
            </div>

            <dl className="space-y-1.5 rounded-xl border border-border bg-muted/30 p-3 text-xs">
                <Row k="Held in escrow until the job is done" v={formatETB(attempt.amount_cents)} />
                <Row k={`Eth-Links fee (${formatBps(attempt.commission_rate_bps)}, paid by provider)`} v={formatETB(attempt.commission_amount_cents)} />
                <Row k="Provider receives on release" v={formatETB(attempt.seller_net_amount_cents)} />
                <Row k="Reference" v={<span className="font-mono">{attempt.tx_ref}</span>} />
            </dl>

            {attempt.status === 'initialized' ? (
                canSimulate ? (
                    <SandboxActions txRef={attempt.tx_ref} />
                ) : (
                    <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                        <p className="font-semibold">Waiting for confirmation</p>
                        <p className="text-muted-foreground">Eth-Links is in test mode. An Eth-Links admin confirms your payment; this page updates by itself.</p>
                        <SandboxAutoRefresh />
                    </div>
                )
            ) : attempt.status === 'succeeded' ? (
                <Result ok text="Payment successful — the money is held in escrow." href={`/receipt/${attempt.booking_id}`} cta="View receipt" />
            ) : (
                <Result ok={false} text={attempt.failure_reason ?? `This checkout is ${attempt.status}.`} href={`/payment/${attempt.booking_id}`} cta="Try again" />
            )}
        </Shell>
    )
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen items-start justify-center bg-background px-4 pb-24 pt-8 sm:items-center">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                <div className="flex items-center justify-between gap-2 bg-[#7DC400] px-5 py-3 text-white">
                    <span className="flex items-center gap-2 text-lg font-bold"><Lock className="h-4 w-4" />Chapa</span>
                    <span className="flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-semibold"><FlaskConical className="h-3.5 w-3.5" />SANDBOX</span>
                </div>
                <div className="space-y-5 p-5">
                    <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <p>Test checkout: no real money moves. The result is sent to Eth-Links as a signed Chapa webhook, so escrow, the ledger and notifications all run for real.</p>
                    </div>
                    {children}
                    <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-green-500" />Eth-Links Escrow Guarantee</p>
                </div>
            </div>
        </div>
    )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
    return <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="shrink-0 font-medium tabular-nums">{v}</dd></div>
}

function Result({ ok, text, href, cta }: { ok: boolean; text: string; href: string; cta: string }) {
    const Icon = ok ? CheckCircle2 : XCircle
    return (
        <div className="space-y-3 text-center">
            <Icon className={ok ? 'mx-auto h-12 w-12 text-green-500' : 'mx-auto h-12 w-12 text-red-500'} />
            <p className="text-sm">{text}</p>
            <Link href={href} className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">{cta}</Link>
        </div>
    )
}
