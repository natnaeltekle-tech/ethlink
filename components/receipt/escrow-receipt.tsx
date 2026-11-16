import { BadgeCheck, Building2, Handshake, ShieldCheck } from 'lucide-react'
import { METHOD_LABELS, type EscrowReceiptData } from '@/lib/receipt'
import { BOOKING_TIME_ZONE, BOOKING_TIME_ZONE_LABEL, formatBookingDate, formatBookingTime } from '@/lib/booking-time'
import { cn } from '@/lib/utils'

const STATUS: Record<string, { label: string; tone: string; guarantee: string }> = {
    paid: {
        label: 'PAID — HELD IN ESCROW',
        tone: 'bg-violet-100 text-violet-800 ring-violet-300',
        guarantee: 'Your payment is held safely by Eth-Links. The provider is paid only after you confirm the job is completed. If something goes wrong, report a problem before confirming and the money stays in escrow while we review it.',
    },
    disputed: {
        label: 'DISPUTED — HELD IN ESCROW',
        tone: 'bg-red-100 text-red-800 ring-red-300',
        guarantee: 'A problem was reported. The payment stays in escrow and is not released to the provider until the Eth-Links team has reviewed the case with both sides.',
    },
    completed: {
        label: 'COMPLETED — RELEASED',
        tone: 'bg-green-100 text-green-800 ring-green-300',
        guarantee: 'The customer confirmed the job was completed, and the escrow payment was released to the provider.',
    },
    refunded: {
        label: 'REFUNDED',
        tone: 'bg-sky-100 text-sky-800 ring-sky-300',
        guarantee: 'After review, the escrow payment was returned to the customer. The provider did not receive these funds.',
    },
}

function formatPaidAt(iso: string | null) {
    if (!iso) return '—'
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: BOOKING_TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(new Date(iso))
}

function Row({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-4 py-1.5">
            <dt className="shrink-0 text-[13px] text-slate-500">{label}</dt>
            <dd className={cn('text-right text-[13px] font-medium text-slate-900 [overflow-wrap:anywhere]', mono && 'font-mono')}>{children}</dd>
        </div>
    )
}

/** Printable "paper" receipt. Always light, so it prints and screenshots the same everywhere. */
export function EscrowReceipt({ r }: { r: EscrowReceiptData }) {
    const s = STATUS[r.status] ?? STATUS.paid
    const providerTitle = r.provider.businessName || r.provider.name
    return (
        <article id="escrow-receipt" className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl ring-1 ring-black/5 print:max-w-none print:rounded-none print:shadow-none print:ring-0">
            {/* Header */}
            <header className="bg-[#0B0C15] px-5 py-4 text-white print:bg-[#0B0C15]">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[#f5c619]">
                        <Handshake className="h-6 w-6" />
                        <span className="text-lg font-bold tracking-tight">Eth-Links</span>
                    </div>
                    <ShieldCheck className="h-6 w-6 text-[#f5c619]" />
                </div>
                <h1 className="mt-2 text-base font-semibold">Official Escrow Receipt</h1>
                <p className="text-xs text-slate-300">Escrow Guarantee · Addis Ababa, Ethiopia</p>
            </header>

            <div className="space-y-4 px-5 py-5">
                {/* Status + amount */}
                <div className="flex flex-col items-center gap-2 text-center">
                    <span className={cn('rounded-full px-3 py-1 text-xs font-bold tracking-wide ring-1', s.tone)}>{s.label}</span>
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Amount paid</p>
                    <p className="text-4xl font-extrabold tabular-nums">
                        {r.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="ml-1 text-lg font-semibold text-slate-500">ETB</span>
                    </p>
                </div>

                {/* Receipt + QR */}
                <div className="flex gap-4 rounded-xl border border-slate-200 p-3">
                    <dl className="min-w-0 flex-1">
                        <Row label="Receipt no." mono>{r.receiptNumber ?? 'Issuing…'}</Row>
                        <Row label="Method">{r.method ? METHOD_LABELS[r.method] ?? r.method : 'Chapa'}</Row>
                        <Row label="Payment ref." mono>{r.reference ?? '—'}</Row>
                        <Row label="Confirmed">{formatPaidAt(r.paidAt)}</Row>
                    </dl>
                    <div className="flex w-[112px] shrink-0 flex-col items-center gap-1">
                        <div className="h-[104px] w-[104px] [&>svg]:h-full [&>svg]:w-full" role="img" aria-label="QR code to verify this booking"
                            dangerouslySetInnerHTML={{ __html: r.qrSvg }} />
                        <span className="text-center text-[10px] leading-tight text-slate-500">Scan to verify</span>
                    </div>
                </div>

                {/* Booking */}
                <section>
                    <h2 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Booking</h2>
                    <dl className="divide-y divide-slate-100">
                        <Row label="Service">{r.service.title}</Row>
                        {r.service.category && <Row label="Category">{r.service.category}</Row>}
                        <Row label="Scheduled">{formatBookingDate(r.scheduledAt)}, {formatBookingTime(r.scheduledAt)}</Row>
                        {r.service.location && <Row label="Location">{r.service.location}</Row>}
                        {r.guests > 1 && <Row label="Guests">{r.guests}</Row>}
                        <Row label="Customer">{r.customerName}</Row>
                        <div className="py-1.5">
                            <div className="flex items-start justify-between gap-4">
                                <dt className="shrink-0 text-[13px] text-slate-500">Provider</dt>
                                <dd className="text-right text-[13px] font-medium">
                                    {providerTitle}
                                    {r.provider.businessName && r.provider.businessName !== r.provider.name && (
                                        <span className="block text-xs font-normal text-slate-500">{r.provider.name}</span>
                                    )}
                                </dd>
                            </div>
                            {(r.provider.isVerified || r.provider.hasLicense) && (
                                <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">
                                    {r.provider.isVerified && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700 ring-1 ring-green-200">
                                            <BadgeCheck className="h-3.5 w-3.5" />✔ ID &amp; Phone Verified
                                        </span>
                                    )}
                                    {r.provider.hasLicense && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
                                            <Building2 className="h-3.5 w-3.5" />✔ Licensed Business
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </dl>
                    <p className="mt-1 text-right text-[10px] text-slate-400">Times in {BOOKING_TIME_ZONE_LABEL}</p>
                </section>

                {r.disputeReason && (
                    <p className="rounded-lg bg-red-50 p-3 text-[13px] text-red-800 ring-1 ring-red-200">
                        <b>Reported problem:</b> “{r.disputeReason}”
                    </p>
                )}

                {/* Guarantee */}
                <section className="rounded-xl border-2 border-[#f5c619] bg-[#fffbea] p-3.5">
                    <h2 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                        <ShieldCheck className="h-4 w-4 text-[#b8920c]" />Eth-Links Escrow Guarantee
                    </h2>
                    <p className="text-[13px] leading-relaxed text-slate-700">{s.guarantee}</p>
                </section>

                <footer className="border-t border-dashed border-slate-300 pt-3 text-center text-[10px] leading-relaxed text-slate-500">
                    Issued electronically by Eth-Links. Verify this receipt by scanning the QR code
                    <span className="block break-all font-mono">{r.verifyUrl}</span>
                    Booking ID {r.bookingId}
                </footer>
            </div>
        </article>
    )
}
