'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ServiceCard } from '@/components/service/service-card';
import { Button } from '@/components/ui/button';
import { Map, List, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LocationAlertBanner } from '@/components/service/LocationAlertBanner';
import { LocationRecoveryModal } from '@/components/service/LocationRecoveryModal';

const ServiceMap = dynamic(() => import('@/components/map/service-map'), {
    ssr: false,
    loading: () => (
        <div className="h-[600px] w-full flex items-center justify-center bg-secondary/20 rounded-lg border border-border animate-pulse">
            <p className="text-muted-foreground">Loading Map...</p>
        </div>
    ),
});

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

type LocationStatus = 'idle' | 'prompt' | 'loading' | 'granted' | 'denied' | 'unsupported';

export function ServiceListing({ services }: { services: any[] }) {
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [sortedServices, setSortedServices] = useState<any[]>(services);
    const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);
    const autoRequestedRef = useRef(false);
    const deniedToastShownRef = useRef(false);

    const applyLocationSort = useCallback(
        (userLat: number, userLng: number) => {
            const servicesWithDistance = services.map((service) => {
                if (service.latitude && service.longitude) {
                    return {
                        ...service,
                        distance: getDistanceFromLatLonInKm(
                            userLat,
                            userLng,
                            service.latitude,
                            service.longitude
                        ),
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
        },
        [services]
    );

    const requestLocation = useCallback(
        (opts?: { silent?: boolean }) => {
            if (typeof window === 'undefined') return;

            if (!navigator.geolocation) {
                setLocationStatus('unsupported');
                if (!opts?.silent) {
                    toast.error('Geolocation is not supported by your browser.');
                }
                return;
            }

            setLocationStatus('loading');

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    setUserLocation({ lat: userLat, lng: userLng });
                    setLocationStatus('granted');
                    applyLocationSort(userLat, userLng);
                    if (!opts?.silent) {
                        toast.success('Location applied! Services sorted by distance.');
                    }
                },
                (error) => {
                    // PERMISSION_DENIED = 1 — browser will not show prompt again until user changes site settings
                    if (error.code === error.PERMISSION_DENIED) {
                        setLocationStatus('denied');
                        if (!opts?.silent && !deniedToastShownRef.current) {
                            deniedToastShownRef.current = true;
                            toast.error('Location access denied. Tap the banner to fix settings.');
                        }
                    } else {
                        // timeout / unavailable — treat as still prompt so user can retry
                        setLocationStatus('prompt');
                        if (!opts?.silent) {
                            toast.error('Could not get your location. Tap Enable location to try again.');
                        }
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 12000,
                    maximumAge: 60000,
                }
            );
        },
        [applyLocationSort]
    );

    // Detect permission state + auto-ask once when still "prompt"
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (!navigator.geolocation) {
            setLocationStatus('unsupported');
            return;
        }

        let cancelled = false;

        const maybeAutoRequest = (state: LocationStatus) => {
            if (cancelled) return;
            setLocationStatus(state);
            if (state === 'prompt' && !autoRequestedRef.current) {
                autoRequestedRef.current = true;
                // Slight delay so the page paints first, then native prompt appears
                setTimeout(() => {
                    if (!cancelled) requestLocation({ silent: true });
                }, 400);
            }
            if (state === 'granted' && !autoRequestedRef.current) {
                autoRequestedRef.current = true;
                requestLocation({ silent: true });
            }
        };

        if (navigator.permissions?.query) {
            navigator.permissions
                .query({ name: 'geolocation' as PermissionName })
                .then((permissionStatus) => {
                    const mapState = (s: PermissionState): LocationStatus => {
                        if (s === 'granted') return 'granted';
                        if (s === 'denied') return 'denied';
                        return 'prompt';
                    };

                    maybeAutoRequest(mapState(permissionStatus.state));

                    permissionStatus.onchange = () => {
                        const next = mapState(permissionStatus.state);
                        setLocationStatus(next);
                        if (next === 'granted') {
                            requestLocation({ silent: true });
                        }
                        if (next !== 'granted') {
                            setUserLocation(null);
                            setSortedServices(services);
                        }
                    };
                })
                .catch(() => {
                    // Permissions API unavailable — still try once
                    maybeAutoRequest('prompt');
                });
        } else {
            maybeAutoRequest('prompt');
        }

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep list in sync when services change
    useEffect(() => {
        if (userLocation) {
            applyLocationSort(userLocation.lat, userLocation.lng);
        } else {
            setSortedServices(services);
        }
    }, [services, userLocation, applyLocationSort]);

    return (
        <div className="flex flex-col gap-6">
            {/* Location status row */}
            <div className="flex flex-col gap-3">
                {locationStatus === 'denied' && (
                    <LocationAlertBanner onActionClick={() => setShowRecoveryModal(true)} />
                )}

                <div className="flex justify-between items-end border-b pb-4 gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {locationStatus === 'granted' ? (
                            <>
                                <MapPin className="h-4 w-4 text-green-600" />
                                <span>Sorted by nearest</span>
                            </>
                        ) : locationStatus === 'loading' ? (
                            <span className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Getting your location…
                            </span>
                        ) : locationStatus === 'denied' ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                                onClick={() => {
                                    // Try again in case user already fixed site settings
                                    deniedToastShownRef.current = false;
                                    requestLocation();
                                }}
                            >
                                <MapPin className="h-4 w-4" />
                                Try location again
                            </Button>
                        ) : locationStatus === 'unsupported' ? (
                            <span className="text-muted-foreground text-sm">
                                Location not supported on this device
                            </span>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                                onClick={() => requestLocation()}
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
                                'flex items-center gap-2 px-4 transition-all',
                                viewMode === 'list'
                                    ? 'bg-background shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
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
                                'flex items-center gap-2 px-4 transition-all',
                                viewMode === 'map'
                                    ? 'bg-background shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Map className="h-4 w-4" />
                            Map
                        </Button>
                    </div>
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

            <LocationRecoveryModal
                isOpen={showRecoveryModal}
                onClose={() => setShowRecoveryModal(false)}
            />
        </div>
    );
}
