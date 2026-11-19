'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowDownToLine, Building2, FlaskConical, History, Loader2, Plus, Receipt, Smartphone, Star, Trash2 } from 'lucide-react'
import { Section } from '@/components/dashboard/common'
import { WalletCards } from '@/components/earnings/wallet-cards'
import { addPayoutAccount, makeDefaultPayoutAccount, removePayoutAccount, withdrawEarnings, type EarningsDashboard } from '@/lib/actions/earnings'
import { formatBps, formatETB, parseAmountToCents } from '@/lib/money'
import { formatBookingDateTime } from '@/lib/booking-time'
import { cn } from '@/lib/utils'

const ESCROW_LABEL: Record<string, { label: string; tone: string }> = {
    held_in_escrow: { label: 'In escrow', tone: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
    disputed: { label: 'Disputed', tone: 'bg-red-500/15 text-red-600 dark:text-red-400' },
    released: { label: 'Released', tone: 'bg-green-500/15 text-green-600 dark:text-green-400' },
    refunded: { label: 'Refunded', tone: 'bg-muted text-muted-foreground' },
    unpaid: { label: 'Unpaid', tone: 'bg-muted text-muted-foreground' },
}
const PAYOUT_LABEL: Record<string, { label: string; tone: string }> = {
    pending: { label: 'Processing', tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    completed: { label: 'Sent', tone: 'bg-green-500/15 text-green-600 dark:text-green-400' },
    failed: { label: 'Failed · returned', tone: 'bg-red-500/15 text-red-600 dark:text-red-400' },
}

const Pill = ({ s }: { s: { label: string; tone: string } }) => (
    <span className={cn('inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', s.tone)}>{s.label}</span>
)

export function EarningsView({ data }: { data: EarningsDashboard }) {
    const router = useRouter()
    const pendingPayouts = data.payouts.some((p) => p.status === 'pending')

    // While a payout is processing, refresh so its result shows up without a reload.
    useEffect(() => {
        if (!pendingPayouts) return
        const t = setInterval(() => router.refresh(), 4000)
        return () => clearInterval(t)
    }, [pendingPayouts, router])

    return (
        <div className="space-y-4">
            {data.sandbox && (
                <div className="flex gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                    <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <p><b>Test mode.</b> Withdrawals go to a simulated bank — no real money moves. An account number ending in <b>0000</b> simulates a failed transfer.</p>
                </div>
            )}
            <WalletCards summary={data.summary} />
            <WithdrawCard data={data} />
            <AccountsCard data={data} />
            <BreakdownCard data={data} />
            <PayoutsCard data={data} />
        </div>
    )
}

function WithdrawCard({ data }: { data: EarningsDashboard }) {
    const router = useRouter()
    const ready = data.accounts.filter((a) => new Date(a.cooldownUntil).getTime() <= Date.now())
    const [accountId, setAccountId] = useState(() => (ready.find((a) => a.isDefault) ?? ready[0])?.id ?? '')
    const [amount, setAmount] = useState('')
    const [busy, start] = useTransition()
    const available = data.summary.available_cents
    const cents = parseAmountToCents(amount)

    useEffect(() => {
        if (!ready.some((a) => a.id === accountId)) setAccountId((ready.find((a) => a.isDefault) ?? ready[0])?.id ?? '')
    }, [ready, accountId])

    const error = amount && (cents === null ? 'Enter an amount like 250 or 250.50'
        : cents < data.minWithdrawalCents ? `Minimum is ${formatETB(data.minWithdrawalCents, { compact: true })}`
            : cents > available ? 'More than your available balance' : null)

    const submit = () => {
        if (!cents || error || !accountId) return
        start(async () => {
            const r = await withdrawEarnings({ amountCents: cents, accountId })
            if (!r.ok) { toast.error(r.error); router.refresh(); return }
            toast.success(r.sandbox ? 'Withdrawal sent to the test bank — result in a few seconds' : 'Withdrawal requested. You will get a notification when it arrives.')
            setAmount('')
            router.refresh()
        })
    }

    return (
        <Section title="Withdraw" icon={ArrowDownToLine}>
            {data.accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add a bank or Telebirr account below to withdraw your earnings.</p>
            ) : ready.length === 0 ? (
                <p className="text-sm text-muted-foreground">Your new payout account is in a 24-hour security hold. You can withdraw after {new Date(data.accounts[0].cooldownUntil).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.</p>
            ) : (
                <div className="space-y-3">
                    <div>
                        <label htmlFor="wd-amount" className="text-sm font-medium">Amount (ETB)</label>
                        <div className="mt-1 flex gap-2">
                            <input id="wd-amount" inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)}
                                placeholder={`Up to ${formatETB(available)}`}
                                className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none focus:border-primary" />
                            <button type="button" onClick={() => setAmount((available / 100).toFixed(2))} disabled={available <= 0}
                                className="h-12 shrink-0 rounded-xl border border-border px-4 text-sm font-semibold disabled:opacity-50">Max</button>
                        </div>
                        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                    </div>
                    <div>
                        <label htmlFor="wd-account" className="text-sm font-medium">Send to</label>
                        <select id="wd-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}
                            className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base">
                            {ready.map((a) => <option key={a.id} value={a.id}>{a.bankName} · {a.accountNumberMasked}{a.isDefault ? ' (default)' : ''}</option>)}
                        </select>
                    </div>
                    <button type="button" onClick={submit} disabled={busy || !cents || !!error || !accountId || available <= 0}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00A859] text-base font-semibold text-white disabled:opacity-50">
                        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowDownToLine className="h-5 w-5" />}
                        {cents && !error ? `Withdraw ${formatETB(cents)}` : 'Withdraw'}
                    </button>
                </div>
            )}
        </Section>
    )
}

function AccountsCard({ data }: { data: EarningsDashboard }) {
    const router = useRouter()
    const [open, setOpen] = useState(data.accounts.length === 0)
    const [bankCode, setBankCode] = useState(data.banks[0]?.code ?? '')
    const [accountName, setAccountName] = useState('')
    const [accountNumber, setAccountNumber] = useState('')
    const [busy, start] = useTransition()
    const bank = useMemo(() => data.banks.find((b) => b.code === bankCode), [data.banks, bankCode])

    const save = () => start(async () => {
        const r = await addPayoutAccount({ bankCode, accountName, accountNumber })
        if (!r.ok) { toast.error(r.error); return }
        toast.success('Account saved. It can receive withdrawals in 24 hours.')
        setAccountName(''); setAccountNumber(''); setOpen(false)
        router.refresh()
    })
    const act = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) => start(async () => {
        const r = await fn()
        if (!r.ok) toast.error(r.error ?? 'Failed'); else { toast.success(msg); router.refresh() }
    })

    return (
        <Section title="Payout accounts" icon={Building2}
            action={!open && data.accounts.length < 5 ? <button type="button" onClick={() => setOpen(true)} className="flex min-h-[40px] items-center gap-1 text-sm font-semibold text-primary"><Plus className="h-4 w-4" />Add</button> : undefined}>
            {data.accounts.length > 0 && (
                <ul className="divide-y divide-border">
                    {data.accounts.map((a) => {
                        const hold = new Date(a.cooldownUntil).getTime() > Date.now()
                        return (
                            <li key={a.id} className="flex items-center gap-3 py-2.5">
                                {a.method === 'telebirr' ? <Smartphone className="h-5 w-5 shrink-0 text-muted-foreground" /> : <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{a.bankName} · {a.accountNumberMasked}</p>
                                    <p className="truncate text-xs text-muted-foreground">{a.accountName}{a.isDefault ? ' · Default' : ''}{hold ? ' · Security hold (24h)' : ''}</p>
                                </div>
                                {!a.isDefault && (
                                    <button type="button" aria-label="Make default" disabled={busy} onClick={() => act(() => makeDefaultPayoutAccount(a.id), 'Default account updated')}
                                        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><Star className="h-4 w-4" /></button>
                                )}
                                <button type="button" aria-label="Remove account" disabled={busy} onClick={() => { if (confirm('Remove this payout account?')) act(() => removePayoutAccount(a.id), 'Account removed') }}
                                    className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                            </li>
                        )
                    })}
                </ul>
            )}
            {open && (
                <div className={cn('space-y-3', data.accounts.length > 0 && 'mt-3 border-t border-border pt-3')}>
                    <div>
                        <label htmlFor="pa-bank" className="text-sm font-medium">Bank or wallet</label>
                        <select id="pa-bank" value={bankCode} onChange={(e) => setBankCode(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base">
                            {data.banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="pa-name" className="text-sm font-medium">Account holder name</label>
                        <input id="pa-name" value={accountName} onChange={(e) => setAccountName(e.target.value)} autoComplete="name"
                            className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-primary" />
                    </div>
                    <div>
                        <label htmlFor="pa-number" className="text-sm font-medium">{bank?.type === 'wallet' ? 'Telebirr phone number' : 'Account number'}</label>
                        <input id="pa-number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} inputMode="numeric" autoComplete="off"
                            placeholder={bank?.type === 'wallet' ? '09XX XXX XXX' : '1000XXXXXXXX'}
                            className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none focus:border-primary" />
                    </div>
                    <div className="flex gap-2">
                        {data.accounts.length > 0 && <button type="button" onClick={() => setOpen(false)} className="h-12 flex-1 rounded-xl border border-border text-sm font-semibold">Cancel</button>}
                        <button type="button" onClick={save} disabled={busy || !accountName.trim() || !accountNumber.trim()}
                            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
                            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Save account
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground">For your security, new accounts can receive money after 24 hours.</p>
                </div>
            )}
        </Section>
    )
}

function BreakdownCard({ data }: { data: EarningsDashboard }) {
    return (
        <Section title="Earnings per booking" icon={Receipt}>
            {data.bookings.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No paid bookings yet. When a customer pays, the money is held in escrow and shows up here.</p>
            ) : (
                <ul className="divide-y divide-border">
                    {data.bookings.map((b) => (
                        <li key={b.id} className="py-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{b.title}</p>
                                    <p className="text-xs text-muted-foreground">{formatBookingDateTime(b.date)}</p>
                                </div>
                                <Pill s={ESCROW_LABEL[b.escrowStatus] ?? ESCROW_LABEL.unpaid} />
                            </div>
                            <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                <div className="min-w-0"><dt className="text-muted-foreground">Customer paid</dt><dd className="truncate font-medium tabular-nums">{formatETB(b.grossCents)}</dd></div>
                                <div className="min-w-0"><dt className="text-muted-foreground">Fee ({formatBps(b.commissionBps)})</dt><dd className="truncate font-medium tabular-nums text-red-500">−{formatETB(b.commissionCents)}</dd></div>
                                <div className="min-w-0"><dt className="text-muted-foreground">You get</dt><dd className="truncate font-semibold tabular-nums text-green-600 dark:text-green-400">{formatETB(b.netCents)}</dd></div>
                            </dl>
                        </li>
                    ))}
                </ul>
            )}
        </Section>
    )
}

function PayoutsCard({ data }: { data: EarningsDashboard }) {
    return (
        <Section title="Withdrawal history" icon={History}>
            {data.payouts.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No withdrawals yet.</p>
            ) : (
                <ul className="divide-y divide-border">
                    {data.payouts.map((p) => (
                        <li key={p.reference} className="flex items-start justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold tabular-nums">{formatETB(p.amountCents)}</p>
                                <p className="truncate text-xs text-muted-foreground">{p.destination} · {new Date(p.requestedAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</p>
                                {p.status === 'failed' && p.failureReason && <p className="text-xs text-red-500">{p.failureReason}</p>}
                                <p className="font-mono text-[10px] text-muted-foreground">{p.reference}</p>
                            </div>
                            <Pill s={PAYOUT_LABEL[p.status]} />
                        </li>
                    ))}
                </ul>
            )}
        </Section>
    )
}
