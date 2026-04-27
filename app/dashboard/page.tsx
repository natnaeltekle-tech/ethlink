import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserBookings, getProviderStats, getProviderServices, getProfile } from "@/lib/actions";
import { Navbar } from "@/components/navbar";
import DesktopDashboard from "@/components/desktop/DesktopDashboard";
import DashboardSplitter from "@/components/DashboardSplitter";

export default async function DashboardPage() {
    const supabase = await createClient();

    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data.user;
    } catch {
        // Expired/corrupt session — treat as logged out
    }

    if (!user) {
        return redirect("/auth/login");
    }

    // Fetch initial data for SSR
    const bookings = await getUserBookings();
    const providerStats = await getProviderStats();
    const providerServices = await getProviderServices();
    const profile = await getProfile();

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Simple Header */}
            <Navbar hideSearch />

            <DashboardSplitter 
                user={user}
                profile={profile}
                bookings={bookings}
                providerServices={providerServices}
                providerStats={providerStats}
                desktopDashboard={
                    <DesktopDashboard 
                        user={user}
                        profile={profile}
                        bookings={bookings}
                        providerServices={providerServices}
                        providerStats={providerStats}
                    />
                }
            />
        </div >
    );
}
