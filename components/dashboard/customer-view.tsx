'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, CalendarCheck, Check, CreditCard, Heart, History, Loader2, MessageCircle, Receipt, RotateCcw, Search, Star, X } from 'lucide-react'
import { completeJob, toggleFavorite } from '@/lib/actions'
import { cancelMyBooking, clearRecentSearches, reportDispute, reviewBooking, type CustomerDashboard, type DashboardBooking } from '@/lib/actions/dashboard'
import { formatPrice } from '@/lib/provider-screening'
import { BookingFrame, Empty, Section, StatusTimeline, actionBtn } from './common'
import { cn } from '@/lib/utils'

const ACTIVE = ['pending', 'confirmed', 'paid', 'disputed']

function ReviewPanel({ booking, onDone }: { booking: DashboardBooking; onDone: () => void }) {
    const [rating, setRating] = useState(0)
    const [comment, setComment] = useState('')
    const [saving, setSaving] = useState(false)
    const submit = async () => {
        if (!rating) return toast.error('Choose a star rating')
        setSaving(true)
        const r = await reviewBooking(booking.id, rating, comment)
        setSaving(false)
        if (r.ok) { toast.success('Thanks for your review!'); onDone() } else toast.error(r.error)
    }
    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">How was {booking.counterpart.name.split(' ')[0]}?</p>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)} className="p-1">
                        <Star className={cn('h-7 w-7', n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />
                    </button>
                ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={3}
                placeholder="What went well? Anything others should know?" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <button type="button" onClick={submit} disabled={saving} className={cn(actionBtn, 'bg-primary text-primary-foreground')}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}Post review
            </button>
        </div>
    )
}

function DisputePanel({ booking, onDone }: { booking: DashboardBooking; onDone: () => void }) {
    const [reason, setReason] = useState('')
    const [saving, setSaving] = useState(false)
    const submit = async () => {
        setSaving(true)
        const r = await reportDispute(booking.id, reason)
        setSaving(false)
        if (r.ok) { toast.success('Dispute opened — your payment stays in escrow while we review'); onDone() } else toast.error(r.error)
    }
    return (
        <div className="space-y-2">
            <p className="text-sm">Your payment of <b>{booking.amount.toLocaleString()} ETB</b> stays in escrow while the Eth-Links team reviews the problem with both sides.</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={3} autoFocus
                placeholder="What went wrong? e.g. the provider did not show up, the work was not finished…" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <button type="button" onClick={submit} disabled={saving || reason.trim().length < 10} className={cn(actionBtn, 'bg-red-600 text-white')}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}Open dispute
            </button>
        </div>
    )
}

export function CustomerBookings({ bookings }: { bookings: DashboardBooking[] }) {
    const router = useRouter()
    const [tab, setTab] = useState<'active' | 'past'>('active')
    const [panel, setPanel] = useState<{ id: string; kind: 'review' | 'dispute' } | null>(null)
    const [busy, setBusy] = useState<string | null>(null)
    const [, startTransition] = useTransition()
    const refresh = () => { setPanel(null); startTransition(() => router.refresh()) }

    const active = bookings.filter((b) => ACTIVE.includes(b.status)).sort((a, b) => a.date.localeCompare(b.date))
    const past = bookings.filter((b) => !ACTIVE.includes(b.status))
    const list = tab === 'active' ? active : past

    const markDone = async (b: DashboardBooking) => {
        if (!confirm(`Confirm the job is done? ${b.providerEarnings.toLocaleString()} ETB will be released from escrow to the provider.`)) return
        setBusy(b.id)
        try { await completeJob(b.id); toast.success('Marked as completed — you can now leave a review'); refresh() }
        catch (e) { toast.error(e instanceof Error ? e.message : 'Could not complete the booking') }
        finally { setBusy(null) }
    }
    const cancel = async (b: DashboardBooking) => {
        if (!confirm('Cancel this booking?')) return
        setBusy(b.id)
        const r = await cancelMyBooking(b.id)
        setBusy(null)
        if (r.ok) { toast.success('Booking cancelled'); refresh() } else toast.error(r.error)
    }
    const msg = (b: DashboardBooking) => (
        <Link href={`/messages/${b.service.id}/${b.counterpart.id}`} className={cn(actionBtn, 'border border-border')}><MessageCircle className="h-4 w-4" />Message</Link>
    )
    const togglePanel = (id: string, kind: 'review' | 'dispute') => setPanel((p) => (p?.id === id && p.kind === kind ? null : { id, kind }))

    return (
        <Section title="My bookings" icon={CalendarCheck}>
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1" role="tablist">
                {([['active', `Active (${active.length})`], ['past', `Past (${past.length})`]] as const).map(([id, label]) => (
                    <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                        className={cn('min-h-[40px] rounded-lg text-sm font-medium', tab === id ? 'bg-background shadow-sm' : 'text-muted-foreground')}>{label}</button>
                ))}
            </div>
            {list.length === 0 ? (
                <Empty icon={tab === 'active' ? CalendarCheck : History} title={tab === 'active' ? 'No active bookings' : 'No past bookings'}
                    text={tab === 'active' ? 'Find a verified provider and book in a few taps.' : undefined}
                    cta={tab === 'active' ? { href: '/services', label: 'Explore services' } : undefined} />
            ) : (
                <div className="space-y-3">
                    {list.map((b) => {
                        const open = panel?.id === b.id ? panel.kind : null
                        return (
                            <BookingFrame key={b.id} booking={b} who="Provider"
                                footer={
                                    <>
                                        {(b.status === 'pending' || b.status === 'confirmed') && <Link href={`/payment/${b.id}`} className={cn(actionBtn, 'bg-primary text-primary-foreground')}><CreditCard className="h-4 w-4" />Pay now</Link>}
                                        {b.status === 'paid' && (
                                            <button className={cn(actionBtn, 'bg-green-600 text-white')} disabled={busy === b.id} onClick={() => markDone(b)}>
                                                {busy === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Mark completed
                                            </button>
                                        )}
                                        {b.status === 'completed' && !b.reviewed && (
                                            <button className={cn(actionBtn, 'bg-primary text-primary-foreground')} onClick={() => togglePanel(b.id, 'review')}><Star className="h-4 w-4" />Leave a review</button>
                                        )}
                                        {b.status === 'completed' && b.reviewed && <span className={cn(actionBtn, 'text-green-600 dark:text-green-400')}><Check className="h-4 w-4" />Reviewed</span>}
                                        {ACTIVE.includes(b.status) && msg(b)}
                                        {b.status === 'paid' && <button className={cn(actionBtn, 'border border-red-500/40 text-red-600')} onClick={() => togglePanel(b.id, 'dispute')}><AlertTriangle className="h-4 w-4" />Report a problem</button>}
                                        {['paid', 'completed', 'disputed', 'refunded'].includes(b.status) && <Link href={`/receipt/${b.id}`} className={cn(actionBtn, 'border border-border')}><Receipt className="h-4 w-4" />Receipt</Link>}
                                        {(b.status === 'pending' || b.status === 'confirmed') && <button className={cn(actionBtn, 'text-muted-foreground')} disabled={busy === b.id} onClick={() => cancel(b)}><X className="h-4 w-4" />Cancel</button>}
                                        {!ACTIVE.includes(b.status) && <Link href={`/book/${b.service.id}`} className={cn(actionBtn, 'border border-border')}><RotateCcw className="h-4 w-4" />Book again</Link>}
                                    </>
                                }>
                                <StatusTimeline status={b.status} />
                                {b.status === 'pending' && <p className="mt-2 text-xs text-muted-foreground">Not paid yet. Pay to secure your slot; your money stays in escrow until you confirm the job is done.</p>}
                                {b.status === 'confirmed' && <p className="mt-2 text-xs text-muted-foreground">The provider accepted. Pay to secure your slot; your money stays in escrow until the job is done.</p>}
                                {b.status === 'paid' && <p className="mt-2 text-xs text-muted-foreground">Your payment is held safely in escrow. Mark the job completed once you are satisfied.</p>}
                                {b.status === 'disputed' && <p className="text-sm text-red-600 dark:text-red-400">Dispute under review{b.disputeReason ? `: “${b.disputeReason}”` : '.'} Your payment stays in escrow.</p>}
                                {b.status === 'refunded' && <p className="text-sm text-muted-foreground">Refunded to you after review.</p>}
                                {open === 'review' && <div className="mt-3"><ReviewPanel booking={b} onDone={refresh} /></div>}
                                {open === 'dispute' && <div className="mt-3"><DisputePanel booking={b} onDone={refresh} /></div>}
                            </BookingFrame>
                        )
                    })}
                </div>
            )}
        </Section>
    )
}

export function SavedAndSearches({ favorites, recentSearches }: Pick<CustomerDashboard, 'favorites' | 'recentSearches'>) {
    const router = useRouter()
    const [items, setItems] = useState(favorites)
    const [searches, setSearches] = useState(recentSearches)

    const unsave = async (id: string) => {
        setItems((x) => x.filter((f) => f.serviceId !== id))
        try { await toggleFavorite(id); toast.success('Removed from saved') } catch { toast.error('Could not update'); router.refresh() }
    }

    return (
        <div className="space-y-4">
            <Section title="Saved services" icon={Heart}>
                {items.length === 0 ? (
                    <Empty icon={Heart} title="Nothing saved yet" text="Tap the heart on a service to keep it here." cta={{ href: '/services', label: 'Explore services' }} />
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {items.map((f) => (
                            <li key={f.serviceId} className="flex gap-3 rounded-xl border border-border bg-background p-2.5">
                                <Link href={`/services/${f.serviceId}`} className="flex min-w-0 flex-1 gap-3">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={f.image} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-muted object-cover" loading="lazy" />
                                    <div className="min-w-0">
                                        <p className="line-clamp-1 font-semibold">{f.title}</p>
                                        <p className="text-xs text-muted-foreground">{f.category}{f.location ? ` · ${f.location}` : ''}</p>
                                        <p className="mt-0.5 text-sm font-semibold">{formatPrice(f.price, f.pricingUnit)}</p>
                                    </div>
                                </Link>
                                <button type="button" onClick={() => unsave(f.serviceId)} aria-label={`Remove ${f.title} from saved`} className="self-start rounded-full p-2 text-red-500 hover:bg-red-500/10">
                                    <Heart className="h-5 w-5 fill-current" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            <Section title="Recent searches" icon={Search}
                action={searches.length > 0 ? <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={async () => { setSearches([]); await clearRecentSearches() }}>Clear</button> : undefined}>
                {searches.length === 0 ? (
                    <p className="py-2 text-sm text-muted-foreground">Your searches on Explore appear here.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {searches.map((s) => (
                            <Link key={s.id} href={`/services?search=${encodeURIComponent(s.query)}`} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border px-3 text-sm hover:border-primary hover:text-primary">
                                <Search className="h-3.5 w-3.5" />{s.query}
                            </Link>
                        ))}
                    </div>
                )}
            </Section>
        </div>
    )
}
