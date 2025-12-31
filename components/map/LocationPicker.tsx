'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with Next.js
const iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png';
const iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png';
const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

export default function LocationPicker({
    onLocationSelect
}: {
    onLocationSelect: (lat: number, lng: number, address?: string) => void;
}) {
    // Default: Addis Ababa
    const [position, setPosition] = useState<L.LatLng | null>(null);
    const defaultCenter: [number, number] = [9.005401, 38.763611];

    useEffect(() => {
        (async function init() {
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl,
                iconUrl,
                shadowUrl,
            });
        })();
    }, []);

    // Reverse geocode coordinates to get address
    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            const data = await response.json();

            // Build a readable address from the response
            const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            return address;
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`; // Fallback to coordinates
        }
    };

    const LocationMarker = () => {
        const map = useMapEvents({
            async click(e) {
                setPosition(e.latlng);
                const address = await reverseGeocode(e.latlng.lat, e.latlng.lng);
                onLocationSelect(e.latlng.lat, e.latlng.lng, address);
                map.flyTo(e.latlng, map.getZoom());
            },
        });

        return position ? (
            <Marker
                position={position}
                draggable={true}
                eventHandlers={{
                    async dragend(e) {
                        const marker = e.target;
                        const newPos = marker.getLatLng();
                        setPosition(newPos);
                        const address = await reverseGeocode(newPos.lat, newPos.lng);
                        onLocationSelect(newPos.lat, newPos.lng, address);
                    }
                }}
            />
        ) : null;
    }

    return (
        <div className="h-[300px] w-full rounded-md border border-input bg-background overflow-hidden relative z-0">
            <MapContainer
                center={defaultCenter}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker />
            </MapContainer>
            {!position && (
                <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 text-xs rounded z-[1000] pointer-events-none">
                    Click map to place pin
                </div>
            )}
        </div>
    );
}
