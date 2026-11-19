import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/viewer'
import { getEarningsDashboard } from '@/lib/actions/earnings'
import { ProviderHeader } from '@/components/provider/provider-header'
import { EarningsView } from '@/components/earnings/earnings-view'

export const metadata: Metadata = { title: 'Earnings | Eth-Links Provider' }
export const dynamic = 'force-dynamic'

export default async function ProviderEarningsPage() {
    const [viewer, data] = await Promise.all([getViewer(), getEarningsDashboard()])
    if (!viewer || !data) redirect('/auth/login?next=/provider/earnings')
    return (
        <>
            <ProviderHeader viewer={viewer} subtitle="Earnings & withdrawals" />
            <EarningsView data={data} />
        </>
    )
}
