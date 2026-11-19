import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getProviderDashboard } from '@/lib/actions/dashboard'
import { getViewer } from '@/lib/viewer'
import { ProviderHeader } from '@/components/provider/provider-header'
import { ServiceAreaPayout, VerificationCard } from '@/components/dashboard/provider-view'
import { ProfileMenu } from '@/components/profile/profile-menu'
import { ModeSwitchPill } from '@/components/ModeSwitchPill'

export const metadata: Metadata = { title: 'Business profile | Eth-Links Provider' }

export default async function ProviderProfilePage() {
    const [viewer, data] = await Promise.all([getViewer(), getProviderDashboard()])
    if (!viewer || !data) redirect('/auth/login?next=/provider/profile')
    return (
        <>
            <ProviderHeader viewer={viewer} subtitle="Business profile" badges={false} />
            <VerificationCard v={data.verification} />
            <ServiceAreaPayout area={data.serviceArea} verified={data.verification.isVerified} />
            <ProfileMenu rows={['settings', 'support']} />
            <ModeSwitchPill to="customer" />
        </>
    )
}
