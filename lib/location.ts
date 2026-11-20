'use client'

import { Capacitor } from '@capacitor/core'

/**
 * One way to get the user's location, in the Android app and on the web.
 *
 *  Android app (Capacitor): @capacitor/geolocation → Android's own
 *    "Allow Eth-Links to access this device's location?" dialog.
 *  Browser: navigator.geolocation (the browser's site permission prompt).
 *
 * Never throws: always resolves to a LocationResult the UI can explain.
 */

export type LatLng = { lat: number; lng: number; accuracy: number | null }
export type LocationFailure = 'denied' | 'services_off' | 'timeout' | 'unavailable' | 'unsupported' | 'app_outdated'
export type LocationResult = ({ ok: true } & LatLng) | { ok: false; reason: LocationFailure }
export type LocationPermission = 'granted' | 'prompt' | 'denied' | 'unsupported'

const HIGH_ACCURACY = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
// Indoors GPS often never locks: fall back to Wi-Fi/cell positioning.
const LOW_ACCURACY = { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 }

type NativeBridge = { openAppSettings?: () => boolean; openLocationSettings?: () => boolean }
const bridge = (): NativeBridge | undefined =>
    typeof window === 'undefined' ? undefined : (window as unknown as { EthLinksNative?: NativeBridge }).EthLinksNative

export function isNativeApp(): boolean {
    try { return Capacitor.isNativePlatform() } catch { return false }
}

/** False in APKs built before the location fix: they need an app update. */
export function nativeLocationAvailable(): boolean {
    return isNativeApp() && Capacitor.isPluginAvailable('Geolocation')
}

/** Settings → Apps → Eth-Links (Android app only). Returns false if this app build can't. */
export function openAppSettings(): boolean {
    try { return bridge()?.openAppSettings?.() ?? false } catch { return false }
}

/** The device-wide Location (GPS) switch (Android app only). */
export function openLocationSettings(): boolean {
    try { return bridge()?.openLocationSettings?.() ?? false } catch { return false }
}

export function canOpenAppSettings(): boolean {
    return typeof bridge()?.openAppSettings === 'function'
}

function classify(error: unknown): LocationFailure {
    const e = error as { code?: unknown; message?: unknown } | null
    const code = String(e?.code ?? '')
    const msg = String(e?.message ?? error ?? '').toLowerCase()
    // Browser GeolocationPositionError codes
    if (code === '1') return 'denied'
    if (code === '3') return 'timeout'
    if (code === '2') return 'unavailable'
    if (/not enabled|disabled|turned off|location services|gps is off|location is off/.test(msg)) return 'services_off'
    if (/denied|permission|not authorized|unauthori[sz]ed/.test(msg)) return 'denied'
    if (/time ?out|timed out/.test(msg)) return 'timeout'
    if (/not implemented|not available|unimplemented/.test(msg)) return 'unsupported'
    return 'unavailable'
}

// ── Native (Capacitor) ──────────────────────────────────────────────────────
// Returned wrapped: a Capacitor plugin proxy must never be the resolved value of a
// promise, or JS probes it for `.then`, which the proxy treats as a native method call.
async function nativePlugin() {
    const mod = await import('@capacitor/geolocation')
    return { Geolocation: mod.Geolocation }
}

type NativePerm = { location?: string; coarseLocation?: string }
function mapNative(p: NativePerm): LocationPermission {
    const states = [p.location, p.coarseLocation]
    if (states.includes('granted')) return 'granted' // "Approximate" is enough to sort by distance
    if (states.some((s) => s === 'prompt' || s === 'prompt-with-rationale')) return 'prompt'
    return 'denied'
}

async function nativeLocation(prompt: boolean): Promise<LocationResult> {
    const { Geolocation } = await nativePlugin()
    let perm: LocationPermission
    try {
        perm = mapNative(await Geolocation.checkPermissions())
    } catch (e) {
        // Android reports "location services are not enabled" here when the device switch is off
        return { ok: false, reason: classify(e) }
    }
    if (perm === 'prompt') {
        if (!prompt) return { ok: false, reason: 'denied' }
        try {
            // Shows Android's system dialog: "Allow Eth-Links to access this device's location?"
            perm = mapNative(await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] }))
        } catch (e) {
            return { ok: false, reason: classify(e) }
        }
    }
    if (perm !== 'granted') return { ok: false, reason: 'denied' }

    for (const opts of [HIGH_ACCURACY, LOW_ACCURACY]) {
        try {
            const pos = await Geolocation.getCurrentPosition(opts)
            return { ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? null }
        } catch (e) {
            const reason = classify(e)
            if (reason !== 'timeout' && reason !== 'unavailable') return { ok: false, reason }
            if (opts === LOW_ACCURACY) return { ok: false, reason }
        }
    }
    return { ok: false, reason: 'unavailable' }
}

// ── Browser ─────────────────────────────────────────────────────────────────
function browserPosition(opts: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, opts))
}

async function browserLocation(): Promise<LocationResult> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return { ok: false, reason: 'unsupported' }
    for (const opts of [HIGH_ACCURACY, LOW_ACCURACY]) {
        try {
            const pos = await browserPosition(opts)
            return { ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? null }
        } catch (e) {
            const reason = classify(e)
            if (reason === 'denied' || opts === LOW_ACCURACY) return { ok: false, reason }
        }
    }
    return { ok: false, reason: 'unavailable' }
}

// ── Public API ──────────────────────────────────────────────────────────────
/** Current permission without prompting. */
export async function getLocationPermission(): Promise<LocationPermission> {
    if (typeof window === 'undefined') return 'unsupported'
    if (isNativeApp()) {
        if (!nativeLocationAvailable()) return 'prompt' // old APK: let the request explain it needs an update
        try { return mapNative(await (await nativePlugin()).Geolocation.checkPermissions()) } catch { return 'prompt' }
    }
    if (!navigator.geolocation) return 'unsupported'
    try {
        const s = await navigator.permissions?.query({ name: 'geolocation' as PermissionName })
        return s?.state === 'granted' ? 'granted' : s?.state === 'denied' ? 'denied' : 'prompt'
    } catch {
        return 'prompt'
    }
}

/**
 * Get the location. With `prompt` (default) the system permission dialog is shown
 * if the user hasn't decided yet; without it, only an existing grant is used.
 */
export async function getCurrentLocation(options: { prompt?: boolean } = {}): Promise<LocationResult> {
    if (typeof window === 'undefined') return { ok: false, reason: 'unsupported' }
    const prompt = options.prompt ?? true
    if (isNativeApp()) {
        if (!nativeLocationAvailable()) {
            // APK built before the location fix: the WebView has no location permission at all.
            const r = await browserLocation()
            return r.ok ? r : { ok: false, reason: 'app_outdated' }
        }
        try {
            return await nativeLocation(prompt)
        } catch (e) {
            return { ok: false, reason: classify(e) }
        }
    }
    if (!prompt && (await getLocationPermission()) !== 'granted') return { ok: false, reason: 'denied' }
    return browserLocation()
}
