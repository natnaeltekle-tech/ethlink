import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link as UserLink, Handshake } from "lucide-react";
import { getUserBookings, getProviderStats, getProviderServices } from "@/lib/actions";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";

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

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Simple Header */}
            <header className="bg-card border-b border-border sticky top-0 z-10">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
                        <Handshake className="h-6 w-6" />
                        EthLink
                    </Link>
                    <Link href="/">
                        <Button variant="ghost">Back to Home</Button>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-3xl">
                <h1 className="text-3xl font-bold mb-8">My Profile</h1>

                <DashboardTabs
                    user={user}
                    bookings={bookings}
                    providerStats={providerStats}
                    providerServices={providerServices}
                />

                {/* Log Out Button */}
                <div className="flex justify-end mt-8">
                    <form action="/auth/signout" method="post">
                        <Button variant="destructive" size="lg">
                            Log Out
                        </Button>
                    </form>
                </div>
            </main>
        </div >
    );
}
