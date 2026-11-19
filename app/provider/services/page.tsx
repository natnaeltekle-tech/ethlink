import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getProviderDashboard } from '@/lib/actions/dashboard'
import { ServicesManager } from '@/components/dashboard/provider-view'

export const metadata: Metadata = { title: 'Services | Eth-Links Provider' }

export default async function ProviderServicesPage() {
    const data = await getProviderDashboard()
    if (!data) redirect('/auth/login?next=/provider/services')
    return (
        <>
            <h1 className="text-xl font-bold">Services</h1>
            <ServicesManager services={data.services} />
        </>
    )
}
