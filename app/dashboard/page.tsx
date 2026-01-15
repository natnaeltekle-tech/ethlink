import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link as UserLink, Handshake } from "lucide-react";
import { getUserBookings, getProviderStats, getProviderServices, getProfile, completeJob } from "@/lib/actions";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { Navbar } from "@/components/navbar";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/auth/login");
    }

    const bookings = await getUserBookings();
    const providerStats = await getProviderStats();
    const providerServices = await getProviderServices();
    const profile = await getProfile();

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Simple Header */}
            {/* Simple Header */}
            <Navbar hideSearch />

            <main className="container mx-auto px-4 py-8 max-w-3xl">
                <h1 className="text-3xl font-bold mb-8">My Profile</h1>

                <DashboardTabs
                    user={user}
                    bookings={bookings}
                    providerStats={providerStats}
                    providerServices={providerServices}
                    profile={profile}
                />
            </main>
        </div >
    );
}
