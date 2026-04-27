'use client'

import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import MobileProfile from '@/components/mobile/MobileProfile';

interface DashboardSplitterProps {
    user: any;
    profile: any;
    bookings: any[];
    providerServices: any[];
    providerStats: any;
    desktopDashboard: React.ReactNode;
}

export default function DashboardSplitter({ 
    user, 
    profile, 
    bookings, 
    providerServices, 
    providerStats, 
    desktopDashboard 
}: DashboardSplitterProps) {
    const [isNative, setIsNative] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    if (isNative) {
        return (
            <MobileProfile 
                user={user}
                profile={profile}
                services={providerServices}
                stats={providerStats}
                customerBookings={bookings}
            />
        );
    }

    return <>{desktopDashboard}</>;
}
