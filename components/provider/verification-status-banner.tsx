import Link from 'next/link'
import { Clock, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react'
import type { VerificationStatus } from '@/lib/provider-screening'

interface Props {
    status: VerificationStatus | null | undefined
    rejectionReason?: string | null
    /** Show the "get verified" prompt (providers / anyone with listings) */
    isProvider: boolean
}

/** Provider verification state at the top of the dashboard (web + app). */
export function VerificationStatusBanner({ status, rejectionReason, isProvider }: Props) {
    const s = status ?? 'unsubmitted'
    if (s === 'verified') return null
    if (s === 'unsubmitted' && !isProvider) return null

    const content = {
        pending: {
            icon: <Clock className="h-5 w-5 shrink-0 text-amber-500" />,
            tone: 'border-amber-500/40 bg-amber-500/10',
            title: 'Application under review',
            body: 'Our team is checking your ID, selfie and payout details. Your listings go live as soon as you are approved — we will notify you here. You can’t receive new bookings yet.',
            cta: null,
        },
        rejected: {
            icon: <XCircle className="h-5 w-5 shrink-0 text-red-500" />,
            tone: 'border-red-500/40 bg-red-500/10',
            title: 'Verification not approved',
            body: rejectionReason ? `Reason: ${rejectionReason}` : 'Please review your documents and submit again.',
            cta: { href: '/services/new', label: 'Fix & re-submit' },
        },
        unsubmitted: {
            icon: <ShieldAlert className="h-5 w-5 shrink-0 text-primary" />,
            tone: 'border-primary/40 bg-primary/10',
            title: 'Verify your identity to go live',
            body: 'Customers can only find and book verified providers. It takes about 5 minutes: ID, a selfie and your payout details.',
            cta: { href: '/services/new', label: 'Start verification' },
        },
    }[s]

    return (
        <div className="container mx-auto max-w-5xl px-4 pt-4">
            <div role="status" className={`flex gap-3 rounded-2xl border p-4 ${content.tone}`}>
                {content.icon}
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{content.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{content.body}</p>
                    {content.cta && (
                        <Link href={content.cta.href}
                            className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
                            <ShieldCheck className="h-4 w-4" /> {content.cta.label}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}
