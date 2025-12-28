'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';

// Fix for default markers not showing in Leaflet with Next.js/Webpack
const iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png';
const iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png';
const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

interface Service {
    id: string;
    title: string;
    price: number | null;
    category: string;
    images: string[] | null;
    latitude?: number | null;
    longitude?: number | null;
    location?: string;
}

interface ServiceMapProps {
    services: Service[];
}

export default function ServiceMap({ services }: ServiceMapProps) {
    useEffect(() => {
        // This effect runs only once on client-side mount to fix the icons
        (async function init() {
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl,
                iconUrl,
                shadowUrl,
            });
        })();
    }, []);

    // Filter services that have valid location data
    // If you don't have lat/lng cols yet, this will result in an empty map.
    // For demo purposes, if no lat/lng, we could generate random offsets from Addis center,
    // but better to respect data.
    const validServices = services.filter(
        s => typeof s.latitude === 'number' && typeof s.longitude === 'number'
    );

    // Default center: Addis Ababa
    const center: [number, number] = [9.005401, 38.763611];

    if (typeof window === 'undefined') return null;

    return (
        <div className="h-[600px] w-full rounded-lg overflow-hidden border border-border shadow-sm z-0 relative">
            <MapContainer
                center={center}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {validServices.map((service) => (
                    <Marker
                        key={service.id}
                        position={[service.latitude!, service.longitude!]}
                    >
                        <Popup className="service-popup">
                            <div className="min-w-[200px]">
                                {service.images && service.images[0] && (
                                    <div className="w-full h-32 mb-2 relative rounded overflow-hidden">
                                        <img
                                            src={service.images[0]}
                                            alt={service.title}
                                            className="object-cover w-full h-full"
                                        />
                                    </div>
                                )}
                                <h3 className="font-bold text-base mb-1 truncate">{service.title}</h3>
                                <p className="text-green-600 font-bold mb-2">
                                    {service.price
                                        ? `ETB ${service.price.toLocaleString()}`
                                        : 'Negotiable'
                                    }
                                </p>
                                <Link
                                    href={`/services/${service.id}`}
                                    className="block w-full text-center bg-primary text-primary-foreground py-2 rounded text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    View Details
                                </Link>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
