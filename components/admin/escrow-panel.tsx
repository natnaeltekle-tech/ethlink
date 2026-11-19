'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { resolveEscrowDispute, type EscrowQueueItem } from '@/lib/admin-actions'
import { formatBookingDateTime } from '@/lib/booking-time'

const etb = (n: number) => `${Math.round(n).toLocaleString()} ETB`

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

/** Open disputes. Provider payouts now go through the ledger (see RevenuePanel). */
export function EscrowPanel({ disputes }: { disputes: EscrowQueueItem[] }) {
    return (
        <div>
            <section id="disputes" className="scroll-mt-20 rounded-2xl border border-border bg-card p-4">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <AlertTriangle className="h-5 w-5 text-red-500" />Disputes <span className="text-sm font-normal text-muted-foreground">({disputes.length})</span>
                </h2>
                {disputes.length === 0 ? <p className="text-sm text-muted-foreground">No open disputes.</p> : (
                    <ul className="space-y-3">{disputes.map((d) => <DisputeRow key={d.id} item={d} />)}</ul>
                )}
            </section>
        </div>
    )
}
