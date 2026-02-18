'use client'

import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { PullToRefresh } from "@/components/pull-to-refresh"
import { useProfile } from "@/lib/hooks/use-profile"
import { useBookings } from "@/lib/hooks/use-bookings"
import { useProviderData } from "@/lib/hooks/use-provider-data"
import { User } from "@supabase/supabase-js"
import { Loader2 } from "lucide-react"

interface DashboardClientProps {
    user: User | null
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
    // Use SWR hooks with initial data from server.
    // Hooks must be called unconditionally (Rules of Hooks).
    const { profile, refresh: refreshProfile } = useProfile()
    const { bookings, refresh: refreshBookings } = useBookings()
    const { services, stats, refresh: refreshProvider } = useProviderData()

    // Defensive guard: if user is null (e.g. during logout transition),
    // show a "Logging out..." spinner instead of returning null (which causes WSoD).
    // The LogoutButton's window.location.href redirect will complete shortly.
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Logging out…</p>
            </div>
        )
    }

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
