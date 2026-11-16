import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { EscrowReceipt } from '@/components/receipt/escrow-receipt'
import { ReceiptActions } from '@/components/receipt/receipt-actions'
import { getReceiptByToken } from '@/lib/receipt'
import { formatBookingDateTime } from '@/lib/booking-time'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Verify escrow receipt | Eth-Links', robots: { index: false, follow: false } }

const STATUS_LABEL: Record<string, string> = {
    paid: 'Paid — held in escrow', disputed: 'Disputed — held in escrow', completed: 'Completed — released', refunded: 'Refunded',
}

/** Public verification page behind the receipt QR code / shared link (unguessable token). */
export default async function VerifyReceiptPage({ params, searchParams }: {
    params: Promise<{ token: string }>
    searchParams: Promise<{ print?: string }>
}) {
    const { token } = await params
    const { print } = await searchParams
    const r = await getReceiptByToken(token)
    if (!r) notFound()

    return (
        <div className="min-h-screen bg-[#0B0C15] text-white print:bg-white">
            <main className="mx-auto w-full max-w-lg space-y-4 px-4 pb-28 pt-6 md:pb-12 print:p-0">
                <p className="flex items-start gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300 print:hidden">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Genuine Eth-Links receipt — checked just now against our records. Status: <b>{STATUS_LABEL[r.status] ?? r.status}</b>.</span>
                </p>
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
                <p className="text-center text-xs text-slate-500 print:hidden">
                    Contact details are hidden on shared receipts. <Link href="/" className="text-[#f5c619]">Eth-Links</Link>
                </p>
            </main>
        </div>
    )
}
