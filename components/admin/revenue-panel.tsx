'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowDownToLine, Clock, Landmark, Loader2, Lock, TrendingUp, Wallet } from 'lucide-react'
import { adminReleaseEscrow, adminSettlePayout, type RevenueDashboard } from '@/lib/actions/earnings'
import { formatETB } from '@/lib/money'
import { formatBookingDateTime } from '@/lib/booking-time'

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Wallet; label: string; value: string; hint: string }) {
    return (
        <div className="min-w-0 rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</p>
            <p className="mt-1 break-words text-xl font-bold tabular-nums">{value}</p>
            <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
    )
}

/** Platform money from the ledger: commission, escrow, provider balances, payouts. */
export function RevenuePanel({ data }: { data: RevenueDashboard }) {
    const router = useRouter()
    const [busy, setBusy] = useState<string | null>(null)

    const settle = async (reference: string, success: boolean) => {
        const note = success ? prompt('Bank / Chapa transfer reference (optional)') ?? '' : prompt('Why did it fail? The money goes back to the provider balance.') ?? ''
        if (!success && !note.trim()) return
        setBusy(reference)
        const r = await adminSettlePayout(reference, success, note)
        setBusy(null)
        if (!r.ok) toast.error(r.error); else { toast.success(`Payout ${r.result}`); router.refresh() }
    }
    const release = async (id: string) => {
        if (!confirm('Release this escrow to the provider now?')) return
        setBusy(id)
        const r = await adminReleaseEscrow(id)
        setBusy(null)
        if (!r.ok) toast.error(r.error); else { toast.success(r.result === 'released' ? 'Released to provider balance' : r.result); router.refresh() }
    }

    return (
        <section id="revenue" className="scroll-mt-20 space-y-4 rounded-2xl border border-border bg-card/50 p-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><TrendingUp className="h-5 w-5 text-green-600" />Revenue &amp; escrow
                {data.sandbox && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600">Sandbox</span>}
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat icon={TrendingUp} label="Commission earned" value={formatETB(data.commissionEarnedCents)} hint="Released jobs, net of refunds" />
                <Stat icon={Lock} label="Held in escrow" value={formatETB(data.escrowHeldCents)} hint={`${data.escrowHeldCount} booking(s)`} />
                <Stat icon={Wallet} label="Owed to providers" value={formatETB(data.sellersAvailableCents)} hint="Available balances" />
                <Stat icon={ArrowDownToLine} label="Payouts" value={formatETB(data.completedPayoutCents)} hint={`${data.pendingPayoutCount} pending · ${formatETB(data.pendingPayoutCents)}`} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-background p-3">
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Landmark className="h-4 w-4" />Pending withdrawals ({data.pendingPayouts.length})</h3>
                    {data.pendingPayouts.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
                        <ul className="divide-y divide-border">
                            {data.pendingPayouts.map((p) => (
                                <li key={p.reference} className="space-y-1.5 py-2 text-sm">
                                    <div className="flex justify-between gap-2"><span className="truncate font-medium">{p.provider}</span><b className="tabular-nums">{formatETB(p.amountCents)}</b></div>
                                    <p className="text-xs text-muted-foreground">{p.destination} · {new Date(p.requestedAt).toLocaleString('en-GB')} · {p.approved ? 'approved' : 'awaiting approval'} · <span className="font-mono">{p.reference}</span></p>
                                    <div className="flex gap-2">
                                        <button type="button" disabled={!!busy} onClick={() => settle(p.reference, true)} className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-green-600 px-3 text-xs font-semibold text-white disabled:opacity-50">{busy === p.reference && <Loader2 className="h-3 w-3 animate-spin" />}Mark sent</button>
                                        <button type="button" disabled={!!busy} onClick={() => settle(p.reference, false)} className="min-h-[36px] rounded-lg border border-red-500/50 px-3 text-xs font-semibold text-red-600 disabled:opacity-50">Mark failed</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Clock className="h-4 w-4" />In escrow ({data.held.length})</h3>
                    {data.held.length === 0 ? <p className="text-sm text-muted-foreground">Nothing held.</p> : (
                        <ul className="divide-y divide-border">
                            {data.held.map((h) => (
                                <li key={h.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">{h.title}</p>
                                        <p className="text-xs text-muted-foreground">{formatBookingDateTime(h.date)} · {formatETB(h.grossCents)} → provider {formatETB(h.netCents)}{h.escrowStatus === 'disputed' ? ' · disputed' : ''}</p>
                                    </div>
                                    {h.escrowStatus === 'held_in_escrow' && (
                                        <button type="button" disabled={!!busy} onClick={() => release(h.id)} className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{busy === h.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Release'}</button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            {data.recentCommissions.length > 0 && (
                <details className="rounded-xl border border-border bg-background p-3 text-sm">
                    <summary className="cursor-pointer font-semibold">Recent commission entries</summary>
                    <ul className="mt-2 divide-y divide-border">
                        {data.recentCommissions.map((c, i) => (
                            <li key={i} className="flex justify-between gap-2 py-1.5 text-xs">
                                <span className="truncate text-muted-foreground">{new Date(c.createdAt).toLocaleString('en-GB')} · {c.description}</span>
                                <span className={c.amountCents < 0 ? 'tabular-nums text-red-500' : 'tabular-nums'}>{formatETB(c.amountCents)}</span>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </section>
    )
}
