import React from 'react';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

interface DesktopDashboardProps {
    user: any;
    profile: any;
    bookings: any[];
    providerServices: any[];
    providerStats: any;
}

export default function DesktopDashboard({
    user,
    profile,
    bookings,
    providerServices,
    providerStats
}: DesktopDashboardProps) {
    return (
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
    );
}
