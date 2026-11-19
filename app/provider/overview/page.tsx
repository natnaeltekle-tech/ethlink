import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Briefcase } from 'lucide-react'
import { getProviderDashboard } from '@/lib/actions/dashboard'
import { getEarningsDashboard } from '@/lib/actions/earnings'
import { WalletCards } from '@/components/earnings/wallet-cards'
import { getViewer } from '@/lib/viewer'
import { ProviderHeader } from '@/components/provider/provider-header'
import { VerificationCard } from '@/components/dashboard/provider-view'

export const metadata: Metadata = { title: 'Overview | Eth-Links Provider' }

export default async function ProviderOverviewPage() {
    const [viewer, data, earnings] = await Promise.all([getViewer(), getProviderDashboard(), getEarningsDashboard()])
    if (!viewer || !data) redirect('/auth/login?next=/provider/overview')
    const requests = data.jobs.requests.length

    return (
        <>
            <ProviderHeader viewer={viewer} subtitle="Provider overview" />
            {!data.verification.isVerified && <VerificationCard v={data.verification} />}
            {earnings && <WalletCards summary={earnings.summary} />}
            <Link href="/provider/earnings" className="flex min-h-[48px] w-full items-center justify-between rounded-2xl border border-border bg-card px-4 text-sm font-semibold">
                Earnings, fees &amp; withdrawals <ArrowRight className="h-4 w-4 text-primary" />
            </Link>
            {requests > 0 && (
                <Link href="/provider/jobs?tab=new" className="flex w-full items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                    <Briefcase className="h-5 w-5 shrink-0 text-amber-500" />
                    <span className="flex-1 text-sm"><b>{requests} new booking request{requests > 1 ? 's' : ''}</b> waiting for your answer</span>
                    <span className="text-sm font-semibold text-primary">Review</span>
                </Link>
            )}
        </>
    )
}
