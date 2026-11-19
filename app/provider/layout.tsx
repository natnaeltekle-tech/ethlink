import { redirect } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { getViewer } from '@/lib/viewer'
import { ProviderTabs } from '@/components/provider/provider-tabs'

export const dynamic = 'force-dynamic'

/** Provider workspace: only for providers (applied, verified or with a listing). */
export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
    const viewer = await getViewer()
    if (!viewer) redirect('/auth/login?next=/provider/overview')
    if (!viewer.isProvider) redirect('/profile')

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar hideSearch />
            <ProviderTabs />
            <main className="mx-auto w-full max-w-4xl space-y-4 px-4 pb-32 pt-4 md:pb-12 md:pt-6">{children}</main>
        </div>
    )
}
