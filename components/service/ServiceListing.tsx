'use client';


import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ServiceCard } from '@/components/service/ServiceCard';
import { Button } from '@/components/ui/button';
import { Map, List, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Dynamic import for the Map component with SSR disabled
const ServiceMap = dynamic(() => import('@/components/map/ServiceMap'), {
    ssr: false,
    loading: () => (
        <div className="h-[600px] w-full flex items-center justify-center bg-secondary/20 rounded-lg border border-border animate-pulse">
            <p className="text-muted-foreground">Loading Map...</p>
        </div>
    ),
});

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}

export default function ServiceListing({ services }: { services: any[] }) {
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [sortedServices, setSortedServices] = useState<any[]>(services);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    setUserLocation({ lat: userLat, lng: userLng });

                    // Check if we are in/near Addis Ababa to apply logic (optional based on prompt, but keeping simple for now)
                    // Logic: Calculate distance for each service
                    const servicesWithDistance = services.map(service => {
                        if (service.latitude && service.longitude) {
                            return {
                                ...service,
                                distance: getDistanceFromLatLonInKm(userLat, userLng, service.latitude, service.longitude)
                            };
                        }
                        return service;
                    });

                    // Sort by distance (nearest first)
                    // Push those without distance to the end
                    const sorted = [...servicesWithDistance].sort((a, b) => {
                        if (a.distance !== undefined && b.distance !== undefined) {
                            return a.distance - b.distance;
                        }
                        if (a.distance !== undefined) return -1;
                        if (b.distance !== undefined) return 1;
                        return 0;
                    });

                    setSortedServices(sorted);
                },
                (error) => {
                    // Silently handle geolocation errors (user denied permission or unavailable)
                    // Services will display in default order without distance sorting
                }
            );
        }
    }, [services]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-end border-b pb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {userLocation ? (
                        <>
                            <MapPin className="h-4 w-4 text-green-600" />
                            <span>Sorted by distance from your location</span>
                        </>
                    ) : (
                        <span>Enable location to sort by distance</span>
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
        </div>
    );
}
