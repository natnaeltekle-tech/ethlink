'use client'

import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import MobileBooking from '@/components/mobile/MobileBooking';

interface BookingSplitterProps {
    service: any;
    desktopBooking: React.ReactNode;
}

export default function BookingSplitter({ service, desktopBooking }: BookingSplitterProps) {
    const [isNative, setIsNative] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    if (isNative) {
        return <MobileBooking service={service} />;
    }

    return <>{desktopBooking}</>;
}
