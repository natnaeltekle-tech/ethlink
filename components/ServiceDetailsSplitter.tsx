'use client'

import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import MobileServiceDetails from '@/components/mobile/MobileServiceDetails';

interface ServiceDetailsSplitterProps {
    service: any;
    reviews: any[];
    provider: any;
    averageRating: number;
    reviewCount: number;
    isFavorite: boolean;
    user: any;
    desktopDetails: React.ReactNode;
}

export default function ServiceDetailsSplitter({
    service,
    reviews,
    provider,
    averageRating,
    reviewCount,
    isFavorite,
    user,
    desktopDetails
}: ServiceDetailsSplitterProps) {
    const [isNative, setIsNative] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    if (isNative) {
        return (
            <MobileServiceDetails 
                service={service}
                reviews={reviews}
                provider={provider}
                averageRating={averageRating}
                reviewCount={reviewCount}
                isFavorite={isFavorite}
                currentUser={user}
            />
        );
    }

    return <>{desktopDetails}</>;
}
