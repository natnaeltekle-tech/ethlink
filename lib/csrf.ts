import { NextRequest } from 'next/server'

/**
 * Verify request origin for mutating API routes.
 * Webhook endpoints that use HMAC signatures are exempt.
 */
export function verifyRequestOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    if (!baseUrl) {
        // In development without BASE_URL, allow same-host requests
        const host = request.headers.get('host')
        if (!host) return false
        if (origin) return origin.includes(host)
        if (referer) return referer.includes(host)
        return false
    }

    let allowedOrigin: string
    try {
        allowedOrigin = new URL(baseUrl).origin
    } catch {
        return false
    }

    if (origin) return origin === allowedOrigin
    if (referer) return referer.startsWith(allowedOrigin)

    // No origin/referer — reject (likely direct API call)
    return false
}

/**
 * Returns true if the route is a signed webhook (HMAC-verified, no CSRF needed).
 */
export function isSignedWebhookRoute(pathname: string): boolean {
    return pathname.startsWith('/api/payment/callback')
}
