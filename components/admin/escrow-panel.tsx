'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, Banknote, Loader2 } from 'lucide-react'
import { markPayoutSent, resolveEscrowDispute, type EscrowQueueItem } from '@/lib/admin-actions'
import { formatBookingDateTime } from '@/lib/booking-time'

const etb = (n: number) => `${Math.round(n).toLocaleString()} ETB`
const input = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm'

function DisputeRow({ item }: { item: EscrowQueueItem }) {
    const router = useRouter()
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState<string | null>(null)
    const resolve = async (resolution: 'release_to_provider' | 'refund_customer') => {
        const label = resolution === 'release_to_provider' ? `release ${etb(item.providerEarnings)} to ${item.provider.name}` : `refund ${etb(item.amount)} to ${item.customer.name}`
        if (!confirm(`Resolve this dispute and ${label}?`)) return
        setBusy(resolution)
        try {
            await resolveEscrowDispute({ bookingId: item.id, resolution, reason: note })
            toast.success('Dispute resolved')
            router.refresh()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not resolve')
        } finally {
            setBusy(null)
        }
    }
    return (
        <li className="space-y-2 rounded-xl border border-red-500/30 bg-background p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">{item.serviceTitle}</p>
                <span className="text-sm font-bold">{etb(item.amount)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{formatBookingDateTime(item.date)} · Customer: {item.customer.name} · Provider: {item.provider.name} · <a href={`/receipt/${item.id}`} className="text-primary underline">Receipt</a></p>
            {item.disputeReason && <p className="rounded-lg bg-red-500/10 p-2 text-sm">&ldquo;{item.disputeReason}&rdquo;</p>}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000}
                placeholder="Decision note sent to both sides (10+ characters)" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!!busy || note.trim().length < 10} onClick={() => resolve('release_to_provider')}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-green-600 px-3 text-sm font-semibold text-white disabled:opacity-50">
                    {busy === 'release_to_provider' && <Loader2 className="h-4 w-4 animate-spin" />}Release to provider
                </button>
                <button type="button" disabled={!!busy || note.trim().length < 10} onClick={() => resolve('refund_customer')}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-red-500/50 px-3 text-sm font-semibold text-red-600 disabled:opacity-50">
                    {busy === 'refund_customer' && <Loader2 className="h-4 w-4 animate-spin" />}Refund customer
                </button>
            </div>
        </li>
    )
}

function PayoutRow({ item }: { item: EscrowQueueItem }) {
    const router = useRouter()
    const p = item.provider
    const [method, setMethod] = useState<'telebirr' | 'cbe' | 'cash' | 'other'>(p.telebirr ? 'telebirr' : p.cbe ? 'cbe' : 'other')
    const [reference, setReference] = useState('')
    const [busy, setBusy] = useState(false)
    const send = async () => {
        setBusy(true)
        try {
            await markPayoutSent({ bookingId: item.id, method, reference })
            toast.success(`Payout recorded for ${p.name}`)
            router.refresh()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not record payout')
        } finally {
            setBusy(false)
        }
    }
    return (
        <li className="space-y-2 rounded-xl border border-border bg-background p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">{p.name}</p>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">{etb(item.providerEarnings)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{item.serviceTitle} · completed job on {formatBookingDateTime(item.date)} · <a href={`/receipt/${item.id}`} className="text-primary underline">Receipt</a></p>
            <p className="text-xs">
                {p.telebirr && <>Telebirr <b>{p.telebirr}</b> </>}
                {p.cbe && <>· CBE <b>{p.cbe}</b> </>}
                {p.accountName && <>· {p.accountName}</>}
                {!p.telebirr && !p.cbe && <span className="text-amber-600">No payout details on file</span>}
            </p>
            <div className="grid grid-cols-[auto_1fr_auto] gap-2">
                <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className={input} aria-label="Payout method">
                    <option value="telebirr">Telebirr</option>
                    <option value="cbe">CBE</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                </select>
                <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} placeholder={method === 'cash' ? 'Reference (optional)' : 'Transfer reference'} className={input} aria-label="Transfer reference" />
                <button type="button" onClick={send} disabled={busy || (method !== 'cash' && reference.trim().length < 3)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}Mark paid out
                </button>
            </div>
        </li>
    )
}

export function EscrowPanel({ disputes, payouts }: { disputes: EscrowQueueItem[]; payouts: EscrowQueueItem[] }) {
    const owed = payouts.reduce((n, p) => n + p.providerEarnings, 0)
    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <section id="disputes" className="scroll-mt-20 rounded-2xl border border-border bg-card p-4">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <AlertTriangle className="h-5 w-5 text-red-500" />Disputes <span className="text-sm font-normal text-muted-foreground">({disputes.length})</span>
                </h2>
                {disputes.length === 0 ? <p className="text-sm text-muted-foreground">No open disputes.</p> : (
                    <ul className="space-y-3">{disputes.map((d) => <DisputeRow key={d.id} item={d} />)}</ul>
                )}
            </section>
            <section id="payouts" className="scroll-mt-20 rounded-2xl border border-border bg-card p-4">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Banknote className="h-5 w-5 text-green-600" />Provider payouts <span className="text-sm font-normal text-muted-foreground">({payouts.length} · {etb(owed)} owed)</span>
                </h2>
                {payouts.length === 0 ? <p className="text-sm text-muted-foreground">Nothing waiting to be paid out.</p> : (
                    <ul className="space-y-3">{payouts.map((p) => <PayoutRow key={p.id} item={p} />)}</ul>
                )}
            </section>
        </div>
    )
}
