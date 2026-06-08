'use client';


import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ServiceCard } from '@/components/service/service-card';
import { Button } from '@/components/ui/button';
import { Map, List, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";

// Dynamic import for the Map component with SSR disabled
const ServiceMap = dynamic(() => import('@/components/map/service-map'), {
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

export function ServiceListing({ services }: { services: any[] }) {
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [sortedServices, setSortedServices] = useState<any[]>(services);
    const [locationStatus, setLocationStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const requestLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    setUserLocation({ lat: userLat, lng: userLng });
                    setLocationStatus('granted');

                    const servicesWithDistance = services.map(service => {
                        if (service.latitude && service.longitude) {
                            return {
                                ...service,
                                distance: getDistanceFromLatLonInKm(userLat, userLng, service.latitude, service.longitude)
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
                    toast.success("Location applied! Services sorted by distance.");
                },
                (error) => {
                    if (error.code === error.PERMISSION_DENIED) {
                        setLocationStatus('denied');
                        toast.error("Location access denied by your browser settings.");
                    } else {
                        toast.error(error.message || "Unable to retrieve location.");
                    }
                }
            );
        } else {
            setLocationStatus('unsupported');
            toast.error("Geolocation is not supported by your browser.");
        }
    };

    useEffect(() => {
        // If services change, just update the local state without forcing location prompt
        if (!userLocation) {
            setSortedServices(services);
        }
    }, [services]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground w-full sm:w-auto min-w-0">
                    {locationStatus === 'granted' ? (
                        <>
                            <MapPin className="h-4 w-4 text-green-600 shrink-0" />
                            <span className="truncate">📍 Sorted by nearest</span>
                        </>
                    ) : locationStatus === 'denied' ? (
                        <div 
                            role="alert" 
                            className="flex items-center justify-between w-full sm:w-80 gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm text-destructive font-medium min-w-0"
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <MapPin className="h-4 w-4 shrink-0 text-destructive" />
                                <span className="truncate min-w-0">Location Blocked</span>
                            </div>
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-7 px-2.5 text-xs shrink-0"
                                aria-label="How to re-enable location access"
                                onClick={() => setIsHelpOpen(true)}
                            >
                                Fix
                            </Button>
                        </div>
                    ) : (
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center gap-2 w-full sm:w-auto justify-center"
                            onClick={requestLocation}
                        >
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="truncate">Enable location to sort by distance</span>
                        </Button>
                    )}
                </div>
                <div className="flex bg-secondary/50 p-1 rounded-lg border border-border/50 shrink-0 self-end sm:self-auto">
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

            <AlertDialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
                <AlertDialogContent className="max-w-md w-[95%] rounded-xl border border-border bg-card shadow-2xl p-6">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                            <MapPin className="h-5 w-5 text-destructive animate-pulse shrink-0" />
                            <span>How to Enable Location</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground mt-2 text-sm text-left">
                            Your browser has blocked location access for Eth-Links. Follow these steps to manually enable it:
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 my-4 text-left max-h-[300px] overflow-y-auto pr-1">
                        <div className="border border-border/40 rounded-lg p-3 bg-secondary/20">
                            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary font-bold shrink-0">1</span>
                                Chrome / Edge / Brave
                            </h4>
                            <ol className="list-decimal pl-9 mt-1.5 space-y-1 text-xs text-muted-foreground">
                                <li>Tap the <span className="font-medium text-foreground">settings/lock icon</span> to the left of the URL bar.</li>
                                <li>Select <span className="font-medium text-foreground">Permissions</span> or <span className="font-medium text-foreground">Site Settings</span>.</li>
                                <li>Toggle <span className="font-medium text-foreground">Location</span> to <span className="font-medium text-foreground text-green-500">Allow</span>.</li>
                            </ol>
                        </div>

                        <div className="border border-border/40 rounded-lg p-3 bg-secondary/20">
                            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary font-bold shrink-0">2</span>
                                iOS Safari
                            </h4>
                            <ol className="list-decimal pl-9 mt-1.5 space-y-1 text-xs text-muted-foreground">
                                <li>Tap the <span className="font-medium text-foreground">"aA" icon</span> in the Safari address bar.</li>
                                <li>Tap <span className="font-medium text-foreground">Website Settings</span>.</li>
                                <li>Set <span className="font-medium text-foreground">Location</span> to <span className="font-medium text-foreground text-green-500">Allow</span>.</li>
                                <li className="text-[10px] italic mt-1 text-muted-foreground/85">If still blocked, open iOS Settings app &gt; Safari &gt; Location &gt; Allow.</li>
                            </ol>
                        </div>

                        <div className="border border-border/40 rounded-lg p-3 bg-secondary/20">
                            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary font-bold shrink-0">3</span>
                                After Enabling
                            </h4>
                            <p className="pl-7 mt-1.5 text-xs text-muted-foreground">
                                Refresh the page to apply the settings and enable distance sorting.
                            </p>
                        </div>
                    </div>

                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="mt-0">Close</AlertDialogCancel>
                        <Button 
                            onClick={() => window.location.reload()}
                        >
                            Refresh Page
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
