'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    BadgeCheck, Banknote, Briefcase, Building2, CalendarClock, Check, Clock, Eye, History, Inbox, Loader2,
    MessageCircle, Pencil, Plus, ShieldAlert, Star, Wallet, X, XCircle,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { updateBookingStatus, toggleServiceStatus } from '@/lib/actions'
import { updateServiceArea, type ProviderDashboard, type DashboardBooking } from '@/lib/actions/dashboard'
import { ADDIS_ZONES, SERVICE_MODES, formatPrice } from '@/lib/provider-screening'
import { BookingFrame, Empty, Section, actionBtn, etb } from './common'
import { cn } from '@/lib/utils'

// ─── Overview ───────────────────────────────────────────────────────────────
export function IncomeSummary({ income }: { income: ProviderDashboard['income'] }) {
    const cards = [
        { label: 'Net earned', value: income.netEarned, hint: 'Completed jobs, after 10% commission', icon: Wallet, tone: 'text-foreground' },
        { label: 'In escrow', value: income.inEscrow, hint: 'Paid by customers, released on completion', icon: Clock, tone: 'text-violet-500' },
        { label: 'Awaiting payout', value: income.awaitingPayout, hint: 'Completed, payout being processed', icon: Banknote, tone: 'text-amber-500' },
        { label: 'Paid out', value: income.paidOut, hint: 'Sent to your Telebirr / CBE', icon: Check, tone: 'text-green-500' },
    ]
    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((c) => (
                <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><c.icon className="h-3.5 w-3.5" />{c.label}</p>
                    <p className={cn('mt-1 text-xl font-bold tabular-nums', c.tone)}>{etb(c.value)}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{c.hint}</p>
                </div>
            ))}
        </div>
    )
}

export function VerificationCard({ v }: { v: ProviderDashboard['verification'] }) {
    if (v.status === 'verified') {
        return (
            <Section title="Verification" icon={BadgeCheck}>
                <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-600 dark:text-green-400"><BadgeCheck className="h-3.5 w-3.5" />ID &amp; Phone Verified</span>
                    {v.hasLicense && <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400"><Building2 className="h-3.5 w-3.5" />Licensed Business</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Your listings are live and customers see your badges.{!v.hasLicense && v.accountType === 'business' ? ' Add a Trade License via support to earn the Licensed Business badge.' : ''}</p>
            </Section>
        )
    }
    const view = v.status === 'pending'
        ? { icon: Clock, tone: 'border-amber-500/40 bg-amber-500/10', title: 'Application under review', text: 'We are checking your documents. Your listings go live once you are approved.', cta: null }
        : v.status === 'rejected'
            ? { icon: XCircle, tone: 'border-red-500/40 bg-red-500/10', title: 'Not approved yet', text: v.rejectionReason ? `Reason: ${v.rejectionReason}` : 'Please review your documents and submit again.', cta: 'Fix & re-submit' }
            : { icon: ShieldAlert, tone: 'border-primary/40 bg-primary/10', title: 'Verify your identity to go live', text: 'Customers can only find and book verified providers.', cta: 'Start verification' }
    return (
        <section className={cn('flex gap-3 rounded-2xl border p-4', view.tone)}>
            <view.icon className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
                <p className="font-semibold">{view.title}</p>
                <p className="text-sm text-muted-foreground">{view.text}</p>
                {view.cta && <Link href="/services/new" className="mt-3 inline-flex min-h-[40px] items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">{view.cta}</Link>}
            </div>
        </section>
    )
}

export function PayoutHistory({ payouts }: { payouts: DashboardBooking[] }) {
    return (
        <Section title="Payout history" icon={History}>
            {payouts.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No payouts yet. Completed jobs are paid out to your Telebirr / CBE account.</p>
            ) : (
                <ul className="divide-y divide-border">
                    {payouts.slice(0, 20).map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                            <div className="min-w-0">
                                <p className="truncate font-medium">{p.service.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {p.paidOutAt ? new Date(p.paidOutAt).toLocaleDateString() : ''} · {p.payoutMethod?.toUpperCase() ?? '—'}{p.payoutReference ? ` · Ref ${p.payoutReference}` : ''}
                                </p>
                            </div>
                            <span className="shrink-0 font-semibold text-green-600 dark:text-green-400">{etb(p.providerEarnings)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Section>
    )
}

// ─── Jobs ───────────────────────────────────────────────────────────────────
type JobTab = 'requests' | 'upcoming' | 'history'

export function ProviderJobs({ jobs, initialTab }: { jobs: ProviderDashboard['jobs']; initialTab?: JobTab }) {
    const router = useRouter()
    const [tab, setTab] = useState<JobTab>(initialTab ?? (jobs.requests.length ? 'requests' : 'upcoming'))
    const [busy, setBusy] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    const act = async (id: string, status: 'confirmed' | 'cancelled', confirmText?: string) => {
        if (confirmText && !confirm(confirmText)) return
        setBusy(id)
        try {
            await updateBookingStatus(id, status)
            toast.success(status === 'confirmed' ? 'Request accepted — the customer can now pay' : 'Booking declined')
            startTransition(() => router.refresh())
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not update the booking')
        } finally {
            setBusy(null)
        }
    }

    const tabs: { id: JobTab; label: string; count: number }[] = [
        { id: 'requests', label: 'Requests', count: jobs.requests.length },
        { id: 'upcoming', label: 'Upcoming', count: jobs.upcoming.length },
        { id: 'history', label: 'History', count: jobs.history.length },
    ]
    const list = jobs[tab]
    const msgHref = (b: DashboardBooking) => `/messages/${b.service.id}/${b.counterpart.id}`

    return (
        <Section title="Jobs" icon={Briefcase}>
            <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1" role="tablist">
                {tabs.map((t) => (
                    <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                        className={cn('flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-sm font-medium', tab === t.id ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
                        {t.label}
                        {t.count > 0 && <span className={cn('rounded-full px-1.5 text-[11px] font-bold', t.id === 'requests' ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20')}>{t.count}</span>}
                    </button>
                ))}
            </div>

            {list.length === 0 ? (
                <Empty icon={tab === 'requests' ? Inbox : tab === 'upcoming' ? CalendarClock : History}
                    title={tab === 'requests' ? 'No new requests' : tab === 'upcoming' ? 'No upcoming jobs' : 'No past jobs yet'}
                    text={tab === 'requests' ? 'New booking requests show up here for you to accept or decline.' : undefined} />
            ) : (
                <div className="space-y-3">
                    {list.map((b) => (
                        <BookingFrame key={b.id} booking={b} who="Customer"
                            footer={
                                tab === 'requests' ? (
                                    <>
                                        <button className={cn(actionBtn, 'border border-red-500/40 text-red-600')} disabled={busy === b.id}
                                            onClick={() => act(b.id, 'cancelled', 'Decline this booking request?')}><X className="h-4 w-4" />Decline</button>
                                        <button className={cn(actionBtn, 'bg-green-600 text-white')} disabled={busy === b.id}
                                            onClick={() => act(b.id, 'confirmed')}>{busy === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Accept</button>
                                        <Link href={msgHref(b)} className={cn(actionBtn, 'border border-border')}><MessageCircle className="h-4 w-4" />Message</Link>
                                    </>
                                ) : tab === 'upcoming' ? (
                                    <>
                                        <Link href={msgHref(b)} className={cn(actionBtn, 'bg-primary text-primary-foreground')}><MessageCircle className="h-4 w-4" />Message customer</Link>
                                        {b.status === 'confirmed' && (
                                            <button className={cn(actionBtn, 'border border-border text-muted-foreground')} disabled={busy === b.id}
                                                onClick={() => act(b.id, 'cancelled', 'Cancel this job? The customer has not paid yet.')}>Cancel</button>
                                        )}
                                    </>
                                ) : (
                                    <Link href={msgHref(b)} className={cn(actionBtn, 'border border-border')}><MessageCircle className="h-4 w-4" />Message</Link>
                                )
                            }>
                            <p className="text-sm">
                                <span className="text-muted-foreground">Your earnings: </span>
                                <span className="font-semibold">{etb(b.providerEarnings)}</span>
                                {b.status === 'paid' && <span className="text-muted-foreground"> · released when the customer confirms completion</span>}
                                {b.status === 'completed' && <span className="text-muted-foreground"> · {b.payoutStatus === 'paid_out' ? 'paid out' : 'awaiting payout'}</span>}
                            </p>
                            {b.status === 'disputed' && b.disputeReason && <p className="mt-1 text-sm text-red-600 dark:text-red-400">Customer reported: {b.disputeReason}</p>}
                        </BookingFrame>
                    ))}
                </div>
            )}
        </Section>
    )
}

// ─── Services ───────────────────────────────────────────────────────────────
export function ServicesManager({ services }: { services: ProviderDashboard['services'] }) {
    const router = useRouter()
    const [state, setState] = useState(() => Object.fromEntries(services.map((s) => [s.id, s.isActive])))
    const [busy, setBusy] = useState<string | null>(null)

    const toggle = async (id: string) => {
        const next = !state[id]
        setBusy(id)
        setState((s) => ({ ...s, [id]: next }))
        try {
            await toggleServiceStatus(id, next)
            toast.success(next ? 'Listing is active' : 'Listing paused — hidden from search')
            router.refresh()
        } catch {
            setState((s) => ({ ...s, [id]: !next }))
            toast.error('Could not update the listing')
        } finally {
            setBusy(null)
        }
    }

    return (
        <Section title="My services" icon={Briefcase}
            action={<Link href="/services/new" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><Plus className="h-4 w-4" />Add</Link>}>
            {services.length === 0 ? (
                <Empty icon={Briefcase} title="No services yet" text="List your first service to start receiving bookings." cta={{ href: '/services/new', label: 'List a service' }} />
            ) : (
                <ul className="space-y-3">
                    {services.map((s) => (
                        <li key={s.id} className="flex gap-3 rounded-xl border border-border bg-background p-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={s.image} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-muted object-cover" loading="lazy" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="line-clamp-1 font-semibold">{s.title}</p>
                                    <Switch checked={state[s.id]} disabled={busy === s.id} onCheckedChange={() => toggle(s.id)} aria-label={state[s.id] ? 'Pause listing' : 'Activate listing'} />
                                </div>
                                <p className="text-xs text-muted-foreground">{s.category} · {formatPrice(s.price, s.pricingUnit)}</p>
                                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{s.reviewCount ? `${s.avgRating.toFixed(1)} (${s.reviewCount})` : 'No reviews'}</span>
                                    <span>{s.bookingCount} booking{s.bookingCount === 1 ? '' : 's'}</span>
                                    {s.openBookings > 0 && <span className="font-medium text-primary">{s.openBookings} open</span>}
                                    <span className={state[s.id] ? 'text-green-600 dark:text-green-400' : ''}>{state[s.id] ? 'Active' : 'Paused'}</span>
                                </p>
                                <div className="mt-2 flex gap-2">
                                    <Link href={`/services/${s.id}/edit`} className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold"><Pencil className="h-3.5 w-3.5" />Edit</Link>
                                    <Link href={`/services/${s.id}`} className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold"><Eye className="h-3.5 w-3.5" />View</Link>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Section>
    )
}

// ─── Service area & payout ──────────────────────────────────────────────────
export function ServiceAreaPayout({ area, verified }: { area: ProviderDashboard['serviceArea']; verified: boolean }) {
    const router = useRouter()
    const [zones, setZones] = useState<string[]>(area?.zones ?? [])
    const [modes, setModes] = useState<string[]>(area?.modes ?? [])
    const [years, setYears] = useState(String(area?.yearsExperience ?? ''))
    const [bio, setBio] = useState(area?.bio ?? '')
    const [saving, setSaving] = useState(false)

    if (!area) {
        return (
            <Section title="Service area & payout" icon={Banknote}>
                <p className="text-sm text-muted-foreground">Complete verification to set your service zones and payout account.</p>
                <Link href="/services/new" className="mt-3 inline-flex min-h-[40px] items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Start verification</Link>
            </Section>
        )
    }

    const toggle = (list: string[], v: string, set: (x: string[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
    const save = async () => {
        setSaving(true)
        const r = await updateServiceArea({ zones, modes, yearsExperience: Number(years) || 0, bio })
        setSaving(false)
        if (r.ok) { toast.success('Service area saved'); router.refresh() } else toast.error(r.error)
    }
    const chip = (active: boolean) => cn('min-h-[36px] rounded-full border px-3 text-sm', active ? 'border-primary bg-primary/15 font-semibold text-primary' : 'border-border text-muted-foreground')

    return (
        <Section title="Service area & payout" icon={Banknote}>
            <div className="space-y-4">
                <fieldset disabled={!verified} className="space-y-4 disabled:opacity-60">
                    <div>
                        <p className="mb-1.5 text-sm font-medium">How you work</p>
                        <div className="flex flex-wrap gap-2">{SERVICE_MODES.map((m) => <button key={m.value} type="button" className={chip(modes.includes(m.value))} onClick={() => toggle(modes, m.value, setModes)}>{m.label}</button>)}</div>
                    </div>
                    <div>
                        <p className="mb-1.5 text-sm font-medium">Addis Ababa zones</p>
                        <div className="flex flex-wrap gap-2">{ADDIS_ZONES.map((z) => <button key={z} type="button" className={chip(zones.includes(z))} onClick={() => toggle(zones, z, setZones)}>{z}</button>)}</div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                        <label className="space-y-1 text-sm"><span className="font-medium">Years</span>
                            <input value={years} onChange={(e) => setYears(e.target.value)} type="number" min={0} max={60} inputMode="numeric" className="h-11 w-full rounded-md border border-input bg-background px-3" />
                        </label>
                        <label className="space-y-1 text-sm"><span className="font-medium">Qualifications & experience</span>
                            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2" />
                        </label>
                    </div>
                    {verified && <button type="button" onClick={save} disabled={saving} className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save service area</button>}
                </fieldset>
                {!verified && <p className="text-xs text-muted-foreground">You can edit these once your application is approved.</p>}

                {area.payout && (
                    <div className="rounded-xl bg-secondary/50 p-3 text-sm">
                        <p className="mb-1 font-medium">Payout account (verified)</p>
                        <p className="text-muted-foreground">Name: <span className="text-foreground">{area.payout.accountName}</span></p>
                        {area.payout.telebirr && <p className="text-muted-foreground">Telebirr: <span className="font-mono text-foreground">{area.payout.telebirr}</span></p>}
                        {area.payout.cbe && <p className="text-muted-foreground">CBE: <span className="font-mono text-foreground">{area.payout.cbe}</span></p>}
                        <p className="mt-1.5 text-xs text-muted-foreground">To change payout details, contact Eth-Links support — we re-verify the account name against your ID.</p>
                    </div>
                )}
            </div>
        </Section>
    )
}
