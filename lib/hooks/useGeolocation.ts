'use client';

import { useState, useEffect, useCallback } from 'react';

export interface GeolocationState {
  location: { lat: number; lng: number } | null;
  status: 'prompt' | 'granted' | 'denied' | 'unsupported';
  error: GeolocationPositionError | null;
  loading: boolean;
  requestLocation: () => void;
}

export function useGeolocation(): GeolocationState {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Sync initial permission status if the Permissions API is supported
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!navigator.geolocation) {
      setStatus('unsupported');
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permissionStatus) => {
          const mapState = (state: PermissionState) => {
            if (state === 'granted') return 'granted';
            if (state === 'denied') return 'denied';
            return 'prompt';
          };

          setStatus(mapState(permissionStatus.state));

          permissionStatus.onchange = () => {
            setStatus(mapState(permissionStatus.state));
            if (permissionStatus.state !== 'granted') {
              setLocation(null);
            }
          };
        })
        .catch(() => {
          // Browser environment might not fully support querying geolocation permission
        });
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (!navigator.geolocation) {
      setStatus('unsupported');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(coords);
        setStatus('granted');
        setLoading(false);
      },
      (geoError: GeolocationPositionError) => {
        setError(geoError);
        setLoading(false);

        // Explicitly catch error.code === error.PERMISSION_DENIED
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setStatus('denied');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  return {
    location,
    status,
    error,
    loading,
    requestLocation,
  };
}
