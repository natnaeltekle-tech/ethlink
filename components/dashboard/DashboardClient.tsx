'use client'

import { DashboardTabs } from "@/components/dashboard/DashboardTabs"
import { PullToRefresh } from "@/components/pull-to-refresh"
import { useProfile } from "@/lib/hooks/use-profile"
import { useBookings } from "@/lib/hooks/use-bookings"
import { useProviderData } from "@/lib/hooks/use-provider-data"
import { User } from "@supabase/supabase-js"

interface DashboardClientProps {
    user: User
    initialProfile: any
    initialBookings: any[]
    initialProviderServices: any[]
    initialProviderStats: any
}

export function DashboardClient({
    user,
    initialProfile,
    initialBookings,
    initialProviderServices,
    initialProviderStats,
}: DashboardClientProps) {
    // Use SWR hooks with initial data from server
    const { profile, refresh: refreshProfile } = useProfile()
    const { bookings, refresh: refreshBookings } = useBookings()
    const { services, stats, refresh: refreshProvider } = useProviderData()

    const handleRefresh = async () => {
        await Promise.all([
            refreshProfile(),
            refreshBookings(),
            refreshProvider(),
        ])
    }

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <DashboardTabs
                user={user}
                bookings={bookings.length > 0 ? bookings : initialBookings}
                providerStats={stats || initialProviderStats}
                providerServices={services.length > 0 ? services : initialProviderServices}
                profile={profile || initialProfile}
            />
        </PullToRefresh>
    )
}
