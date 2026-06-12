'use client';


import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ServiceCard } from '@/components/service/service-card';
import { Button } from '@/components/ui/button';
import { Map, List, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { LocationAlertBanner } from '@/components/service/LocationAlertBanner';
import { LocationRecoveryModal } from '@/components/service/LocationRecoveryModal';

// Dynamic import for the Map component with SSR disabled
const ServiceMap = dynamic(() => import('@/components/map/service-map'), {
    ssr: false,
    loading: () => (
        <div className="h-[600px] w-full flex items-center justify-center bg-secondary/20 rounded-lg border border-border animate-pulse">
            <p className="text-muted-foreground">Loading Map...</p>
        </div>
    ),
});

export interface Service {
    id: string;
    title: string;
    category: string;
    price: number | null;
    location: string | null;
    image_url?: string | null;
    rating?: number;
    review_count?: number;
    images?: string[] | null;
    latitude?: number | null;
    longitude?: number | null;
    distance?: number;
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);  // deg2rad below
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}

export function ServiceListing({ services }: { services: Service[] }) {
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [sortedServices, setSortedServices] = useState<Service[]>(services);
    const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
    const [lastStatus, setLastStatus] = useState<string>('prompt');

    const { location: geoLoc, status: geoStatus, requestLocation } = useGeolocation();

    useEffect(() => {
        if (geoLoc) {
            setUserLocation(geoLoc);
            const servicesWithDistance = services.map(service => {
                if (service.latitude && service.longitude) {
                    return {
                        ...service,
                        distance: getDistanceFromLatLonInKm(geoLoc.lat, geoLoc.lng, service.latitude, service.longitude)
                    };
                }
                return service;
            });

            const sorted = [...servicesWithDistance].sort((a, b) => {
                if (a.distance !== undefined && b.distance !== undefined) {
                    return a.distance - b.distance;
                }
                if (a.distance !== undefined) return -1;
                if (b.distance !== undefined) return 1;
                return 0;
            });

            setSortedServices(sorted);
        } else {
            setUserLocation(null);
            setSortedServices(services);
        }
    }, [geoLoc, services]);

    useEffect(() => {
        if (geoStatus === 'granted' && lastStatus !== 'granted') {
            toast.success("Location applied! Services sorted by distance.");
        } else if (geoStatus === 'unsupported' && lastStatus !== 'unsupported') {
            toast.error("Geolocation is not supported by your browser.");
        }
        setLastStatus(geoStatus);
    }, [geoStatus, lastStatus]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center border-b pb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground w-full sm:w-auto min-w-0">
                    {geoStatus === 'granted' ? (
                        <>
                            <MapPin className="h-4 w-4 text-green-600" />
                            <span>📍 Sorted by nearest</span>
                        </>
                    ) : geoStatus === 'denied' ? (
                        <LocationAlertBanner onActionClick={() => setIsRecoveryOpen(true)} />
                    ) : (
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={requestLocation}
                        >
                            <MapPin className="h-4 w-4" />
                            Enable location to sort by distance
                        </Button>
                    )}
                </div>
                <div className="flex bg-secondary/50 p-1 rounded-lg border border-border/50">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "flex items-center gap-2 px-4 transition-all",
                            viewMode === 'list'
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <List className="h-4 w-4" />
                        List
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode('map')}
                        className={cn(
                            "flex items-center gap-2 px-4 transition-all",
                            viewMode === 'map'
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Map className="h-4 w-4" />
                        Map
                    </Button>
                </div>
            </div>

            {viewMode === 'map' ? (
                <div className="w-full animate-in fade-in duration-300">
                    <ServiceMap services={sortedServices} userLocation={userLocation} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                    {sortedServices.map((service) => (
                        <ServiceCard key={service.id} service={service} distance={service.distance} />
                    ))}
                    {sortedServices.length === 0 && (
                        <p className="col-span-full text-center py-10 text-muted-foreground">
                            No services found.
                        </p>
                    )}
                </div>
            )}
            <LocationRecoveryModal isOpen={isRecoveryOpen} onClose={() => setIsRecoveryOpen(false)} />
        </div>
    );
}
