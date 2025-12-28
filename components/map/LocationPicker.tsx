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
    onLocationSelect: (lat: number, lng: number) => void
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

    const LocationMarker = () => {
        const map = useMapEvents({
            click(e) {
                setPosition(e.latlng);
                onLocationSelect(e.latlng.lat, e.latlng.lng);
                map.flyTo(e.latlng, map.getZoom());
            },
        });

        return position ? (
            <Marker
                position={position}
                draggable={true}
                eventHandlers={{
                    dragend: (e) => {
                        const marker = e.target;
                        const newPos = marker.getLatLng();
                        setPosition(newPos);
                        onLocationSelect(newPos.lat, newPos.lng);
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
