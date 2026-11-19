import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getProviderDashboard } from '@/lib/actions/dashboard'
import { ProviderJobs, type JobTab } from '@/components/dashboard/provider-view'

export const metadata: Metadata = { title: 'Jobs | Eth-Links Provider' }

const TAB_PARAM: Record<string, JobTab> = { new: 'requests', requests: 'requests', active: 'upcoming', upcoming: 'upcoming', history: 'history' }

export default async function ProviderJobsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const [{ tab }, data] = await Promise.all([searchParams, getProviderDashboard()])
    if (!data) redirect('/auth/login?next=/provider/jobs')
    return (
        <>
            <h1 className="text-xl font-bold">Jobs</h1>
            <ProviderJobs key={tab ?? 'default'} jobs={data.jobs} initialTab={tab ? TAB_PARAM[tab] : undefined} />
        </>
    )
}
