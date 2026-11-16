import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Clock } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { EscrowReceipt } from '@/components/receipt/escrow-receipt'
import { ReceiptActions } from '@/components/receipt/receipt-actions'
import { RECEIPT_STATUSES, getReceiptForViewer } from '@/lib/receipt'
import { formatBookingDateTime } from '@/lib/booking-time'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Escrow receipt | Eth-Links', robots: { index: false, follow: false } }

const STATUS_LABEL: Record<string, string> = {
    paid: 'Paid — held in escrow', disputed: 'Disputed — held in escrow', completed: 'Completed — released', refunded: 'Refunded',
}

export default async function ReceiptPage({ params, searchParams }: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ print?: string }>
}) {
    const { id } = await params
    const { print } = await searchParams
    const r = await getReceiptForViewer(id)
    if (r === 'login') redirect(`/auth/login?next=/receipt/${id}`)
    if (!r) notFound()

    const back = r.viewer === 'provider' ? { href: '/dashboard?mode=provider&tab=jobs', label: 'Back to jobs' }
        : r.viewer === 'admin' ? { href: '/admin', label: 'Back to admin' }
        : { href: '/dashboard?tab=bookings', label: 'Back to my bookings' }

    const paid = (RECEIPT_STATUSES as readonly string[]).includes(r.status)

    return (
        <div className="min-h-screen bg-[#0B0C15] text-foreground print:bg-white">
            <div className="print:hidden"><Navbar hideSearch /></div>
            <main className="mx-auto w-full max-w-lg space-y-4 px-4 pb-28 pt-4 md:pb-12 print:p-0">
                <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white print:hidden">
                    <ArrowLeft className="h-4 w-4" />{back.label}
                </Link>
                {r.viewer === 'provider' && paid && (
                    <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300 print:hidden">
                        ✔ Verified by Eth-Links: this customer&apos;s payment is {r.status === 'paid' ? 'held in escrow for this job' : STATUS_LABEL[r.status]?.toLowerCase()}.
                    </p>
                )}
                {paid ? (
                    <>
                        <EscrowReceipt r={r} />
                        <ReceiptActions
                            verifyUrl={r.verifyUrl}
                            receiptNumber={r.receiptNumber}
                            amountLabel={`${r.amount.toLocaleString('en-US')} ETB`}
                            serviceTitle={r.service.title}
                            statusLabel={STATUS_LABEL[r.status] ?? r.status}
                            scheduledLabel={formatBookingDateTime(r.scheduledAt)}
                            autoPrint={print === '1'}
                        />
                    </>
                ) : (
                    <section className="space-y-3 rounded-2xl border border-border bg-card p-6 text-center">
                        <Clock className="mx-auto h-8 w-8 text-amber-500" />
                        <h1 className="text-lg font-semibold">No receipt yet</h1>
                        <p className="text-sm text-muted-foreground">
                            {r.status === 'cancelled' ? 'This booking was cancelled before payment.' : 'An escrow receipt is issued as soon as the payment is confirmed.'}
                        </p>
                        {r.viewer === 'customer' && (r.status === 'pending' || r.status === 'confirmed') && (
                            <Link href={`/payment/${r.bookingId}`} className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">Pay now</Link>
                        )}
                    </section>
                )}
            </main>
        </div>
    )
}
