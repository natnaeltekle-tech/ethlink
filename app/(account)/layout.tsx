import { redirect } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { getViewer } from '@/lib/viewer'

export const dynamic = 'force-dynamic'

/** Customer workspace pages that need an account: /profile, /bookings, /saved. */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
    const viewer = await getViewer()
    // Signed-out visitors are normally sent to login (with ?next=) by the request proxy.
    if (!viewer) redirect('/auth/login?next=/profile')
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar hideSearch />
            <main className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-32 pt-4 md:pb-12 md:pt-8">{children}</main>
        </div>
    )
}
