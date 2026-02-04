import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserBookings, getProviderStats, getProviderServices, getProfile } from "@/lib/actions";
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { Navbar } from "@/components/navbar";


export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

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

            <main className="w-full max-w-lg mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">My Profile</h1>

                <DashboardClient
                    user={user}
                    initialProfile={profile}
                    initialBookings={bookings}
                    initialProviderServices={providerServices}
                    initialProviderStats={providerStats}
                />
            </main>
        </div >
    );
}
