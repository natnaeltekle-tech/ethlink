import Link from 'next/link'
import { Check, MapPin, type LucideIcon } from 'lucide-react'
import type { DashboardBooking } from '@/lib/actions/dashboard'
import { formatBookingDateTime } from '@/lib/booking-time'
import { cn } from '@/lib/utils'

export const etb = (n: number) => `${Math.round(n).toLocaleString()} ETB`

export const STATUS: Record<string, { label: string; tone: string }> = {
    pending: { label: 'Requested · not paid', tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    confirmed: { label: 'Accepted · awaiting payment', tone: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
    paid: { label: 'Paid · held in escrow', tone: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
    completed: { label: 'Completed', tone: 'bg-green-500/15 text-green-600 dark:text-green-400' },
    cancelled: { label: 'Cancelled', tone: 'bg-muted text-muted-foreground' },
    disputed: { label: 'Disputed · under review', tone: 'bg-red-500/15 text-red-600 dark:text-red-400' },
    refunded: { label: 'Refunded', tone: 'bg-muted text-muted-foreground' },
}

export function StatusPill({ status }: { status: string }) {
    const s = STATUS[status] ?? { label: status, tone: 'bg-muted text-muted-foreground' }
    return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', s.tone)}>{s.label}</span>
}

const STEPS = [
    { key: 'pending', label: 'Requested' },
    { key: 'confirmed', label: 'Accepted' },
    { key: 'paid', label: 'Paid (escrow)' },
    { key: 'completed', label: 'Completed' },
]

/** Requested → Accepted → Paid (escrow) → Completed */
export function StatusTimeline({ status }: { status: string }) {
    if (['cancelled', 'disputed', 'refunded'].includes(status)) return null
    const current = STEPS.findIndex((s) => s.key === status)
    return (
        <ol className="flex items-center gap-1" aria-label="Booking progress">
            {STEPS.map((step, i) => {
                const done = i <= current
                return (
                    <li key={step.key} className="flex flex-1 flex-col items-center gap-1 text-center">
                        <div className="flex w-full items-center">
                            <div className={cn('h-0.5 flex-1', i === 0 ? 'opacity-0' : done ? 'bg-primary' : 'bg-border')} />
                            <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px]',
                                done ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground')}>
                                {done ? <Check className="h-3 w-3" /> : i + 1}
                            </span>
                            <div className={cn('h-0.5 flex-1', i === STEPS.length - 1 ? 'opacity-0' : i < current ? 'bg-primary' : 'bg-border')} />
                        </div>
                        <span className={cn('text-[10px] leading-tight', i === current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{step.label}</span>
                    </li>
                )
            })}
        </ol>
    )
}

export function Section({ title, icon: Icon, action, children, className, id }: {
    title?: string; icon?: LucideIcon; action?: React.ReactNode; children: React.ReactNode; className?: string; id?: string
}) {
    return (
        <section id={id} className={cn('rounded-2xl border border-border bg-card p-4 sm:p-5', className)}>
            {(title || action) && (
                <div className="mb-3 flex items-center justify-between gap-2">
                    {title && <h2 className="flex items-center gap-2 text-base font-semibold">{Icon && <Icon className="h-4 w-4 text-primary" />}{title}</h2>}
                    {action}
                </div>
            )}
            {children}
        </section>
    )
}

export function Empty({ icon: Icon, title, text, cta }: { icon: LucideIcon; title: string; text?: string; cta?: { href: string; label: string } }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
            <Icon className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">{title}</p>
            {text && <p className="max-w-xs text-sm text-muted-foreground">{text}</p>}
            {cta && <Link href={cta.href} className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{cta.label}</Link>}
        </div>
    )
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
    return (
        <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 font-bold text-primary" style={{ width: size, height: size, fontSize: size * 0.4 }}>
            {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="h-full w-full object-cover" />
            ) : (name?.[0]?.toUpperCase() || '?')}
        </span>
    )
}

/** Card frame shared by customer bookings and provider jobs. */
export function BookingFrame({ booking, who, children, footer }: {
    booking: DashboardBooking; who: string; children?: React.ReactNode; footer?: React.ReactNode
}) {
    return (
        <article className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="flex gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={booking.service.image} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-muted object-cover sm:h-16 sm:w-16" loading="lazy" />
                <div className="min-w-0 flex-1">
                    <Link href={`/services/${booking.service.id}`} className="line-clamp-2 font-semibold leading-snug [overflow-wrap:anywhere] hover:text-primary">{booking.service.title}</Link>
                    <p className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-2 text-xs text-muted-foreground">
                        <span>{formatBookingDateTime(booking.date)}{booking.guests > 1 ? ` · ${booking.guests} guests` : ''}</span>
                        <span className="text-sm font-bold text-foreground">{etb(booking.amount)}</span>
                    </p>
                    {booking.where && (
                        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{booking.where}</span>
                        </p>
                    )}
                    <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <Avatar name={booking.counterpart.name} url={booking.counterpart.avatarUrl} size={16} />
                        <span className="shrink-0">{who}:</span> <span className="truncate font-medium text-foreground">{booking.counterpart.name}</span>
                    </p>
                    <div className="mt-1.5"><StatusPill status={booking.status} /></div>
                </div>
            </div>
            {children && <div className="border-t border-border px-3 py-2.5">{children}</div>}
            {footer && <div className="flex flex-wrap gap-2 border-t border-border bg-secondary/30 px-3 py-2.5">{footer}</div>}
        </article>
    )
}

export const actionBtn = 'inline-flex min-h-[40px] flex-1 whitespace-nowrap items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold disabled:opacity-50 sm:flex-none'
