'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ServiceCard } from '@/components/service/service-card';
import { Button } from '@/components/ui/button';
import { Map, List, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LocationAlertBanner } from '@/components/service/LocationAlertBanner';
import { LocationRecoveryModal, type LocationProblem } from '@/components/service/LocationRecoveryModal';
import { getCurrentLocation, getLocationPermission, isNativeApp } from '@/lib/location';

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
    const [recoveryReason, setRecoveryReason] = useState<LocationProblem>('denied');
    const statusRef = useRef<LocationStatus>('idle');
    statusRef.current = locationStatus;
    const autoRequestedRef = useRef(false);
    const recoveryShownRef = useRef(false);
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
        async (opts?: { silent?: boolean; prompt?: boolean }) => {
            if (typeof window === 'undefined') return;
            const native = isNativeApp();
            setLocationStatus('loading');

            // Android app: native permission dialog via @capacitor/geolocation.
            // Browser: navigator.geolocation. Both with an indoor (low-accuracy) fallback.
            const r = await getCurrentLocation({ prompt: opts?.prompt ?? true });

            if (r.ok) {
                setUserLocation({ lat: r.lat, lng: r.lng });
                setLocationStatus('granted');
                setShowRecoveryModal(false);
                applyLocationSort(r.lat, r.lng);
                if (!opts?.silent) toast.success('Location on — services sorted by nearest.');
                return;
            }

            const showHelp = (problem: LocationProblem) => {
                setRecoveryReason(problem);
                // In the app only explain when the user asked; in browsers once per visit.
                if (!opts?.silent || (!native && !recoveryShownRef.current)) {
                    recoveryShownRef.current = true;
                    setShowRecoveryModal(true);
                }
            };

            switch (r.reason) {
                case 'denied':
                    setLocationStatus('denied');
                    showHelp('denied');
                    if (!opts?.silent && !native && !deniedToastShownRef.current) {
                        deniedToastShownRef.current = true;
                        toast.message('Location is off. Follow the steps to enable it.');
                    }
                    break;
                case 'services_off':
                    setLocationStatus('prompt');
                    showHelp('services_off');
                    break;
                case 'app_outdated':
                    setLocationStatus('prompt');
                    showHelp('app_outdated');
                    break;
                case 'unsupported':
                    setLocationStatus('unsupported');
                    if (!opts?.silent) toast.error('Location is not supported on this device.');
                    break;
                default:
                    setLocationStatus('prompt');
                    if (!opts?.silent) toast.error('Could not get your location. Move near a window or try again.');
            }
        },
        [applyLocationSort]
    );

    // On open: use an existing grant silently, or ask once if the user hasn't decided yet.
    useEffect(() => {
        let cancelled = false;
        getLocationPermission().then((perm) => {
            if (cancelled || autoRequestedRef.current) return;
            autoRequestedRef.current = true;
            if (perm === 'unsupported') return setLocationStatus('unsupported');
            if (perm === 'granted') return void requestLocation({ silent: true, prompt: false });
            if (perm === 'prompt') {
                // Let the page paint first, then the system / browser prompt appears
                setTimeout(() => { if (!cancelled) void requestLocation({ silent: true }); }, 500);
                return;
            }
            setLocationStatus('denied');
            setRecoveryReason('denied');
            if (!isNativeApp() && !recoveryShownRef.current) {
                recoveryShownRef.current = true;
                setShowRecoveryModal(true);
            }
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Coming back from Settings (app) or changing the site permission (browser): re-check silently.
    useEffect(() => {
        const recheck = () => {
            if (document.visibilityState !== 'visible') return;
            if (statusRef.current === 'granted' || statusRef.current === 'loading') return;
            getLocationPermission().then((perm) => {
                if (perm === 'granted') void requestLocation({ silent: true, prompt: false });
            });
        };
        document.addEventListener('visibilitychange', recheck);
        window.addEventListener('focus', recheck);
        return () => {
            document.removeEventListener('visibilitychange', recheck);
            window.removeEventListener('focus', recheck);
        };
    }, [requestLocation]);

    useEffect(() => {
        if (userLocation) {
            applyLocationSort(userLocation.lat, userLocation.lng);
        } else {
            setSortedServices(services);
        }
    }, [services, userLocation, applyLocationSort]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
                {locationStatus === 'denied' && (
                    <LocationAlertBanner onActionClick={() => setShowRecoveryModal(true)} />
                )}

                {/* Friendly enable card when we can still ask (or user hasn't decided) */}
                {(locationStatus === 'prompt' || locationStatus === 'idle') && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-[#f5c619]/30 bg-[#f5c619]/10">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="p-2 rounded-full bg-[#f5c619]/20 shrink-0">
                                <MapPin className="h-5 w-5 text-[#f5c619]" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-sm text-foreground">
                                    Find services near you
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Allow location so we can sort listings by distance.
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            className="shrink-0 bg-[#f5c619] text-black hover:bg-[#f5c619]/90 font-bold"
                            onClick={() => requestLocation()}
                        >
                            <MapPin className="h-4 w-4 mr-1.5" />
                            Enable location
                        </Button>
                    </div>
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
                        ) : null}
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
                    {sortedServices.map((service, index) => (
                        <ServiceCard
                            key={service.id}
                            service={service}
                            distance={service.distance}
                            priority={index === 0}
                        />
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
                reason={recoveryReason}
                onClose={() => setShowRecoveryModal(false)}
                onRetry={() => { setShowRecoveryModal(false); void requestLocation(); }}
            />
        </div>
    );
}
