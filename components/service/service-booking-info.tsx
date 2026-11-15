import { CalendarDays, CheckCircle2, Clock } from 'lucide-react'
import { WEEK_DAYS, formatPrice } from '@/lib/provider-screening'
import { cn } from '@/lib/utils'

type Info = {
    price?: number | null
    pricing_unit?: string | null
    working_days?: string[] | null
    opens_at?: string | null
    closes_at?: string | null
    whats_included?: string | null
}

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : null)

/** Compact "Mon–Sat" style label from day codes. */
export function formatWorkingDays(days?: string[] | null): string | null {
    if (!days?.length) return null
    const order = WEEK_DAYS.map((d) => d.value as string)
    const idx = days.map((d) => order.indexOf(d)).filter((i) => i >= 0).sort((a, b) => a - b)
    if (idx.length === 7) return 'Every day'
    const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1)
    const label = (i: number) => WEEK_DAYS[i].label
    if (contiguous && idx.length > 2) return `${label(idx[0])}–${label(idx[idx.length - 1])}`
    return idx.map(label).join(', ')
}

/** Price + unit, availability and "What's included" for detail/booking pages. */
export function ServiceBookingInfo({ service, tone = 'default' }: { service: Info; tone?: 'default' | 'dark' }) {
    const days = formatWorkingDays(service.working_days)
    const open = hhmm(service.opens_at), close = hhmm(service.closes_at)
    const muted = tone === 'dark' ? 'text-slate-400' : 'text-muted-foreground'
    if (!days && !open && !service.whats_included) return null

    return (
        <div className={cn('space-y-3 rounded-2xl border p-4', tone === 'dark' ? 'border-white/10 bg-white/5' : 'border-border bg-card')}>
            <p className="text-lg font-bold">{formatPrice(service.price, service.pricing_unit)}</p>
            {(days || open) && (
                <div className={cn('flex flex-wrap gap-x-4 gap-y-1 text-sm', muted)}>
                    {days && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{days}</span>}
                    {open && close && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{open} – {close}</span>}
                </div>
            )}
            {service.whats_included && (
                <div>
                    <p className="mb-1 text-sm font-semibold">What&apos;s included</p>
                    <p className={cn('flex gap-2 whitespace-pre-line text-sm', muted)}>
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        {service.whats_included}
                    </p>
                </div>
            )}
        </div>
    )
}
