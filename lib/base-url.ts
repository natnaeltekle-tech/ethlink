import { headers } from 'next/headers'

/**
 * Absolute base URL of this deployment for links that leave the request
 * (emails, payment-provider return/callback URLs).
 *
 * Order: NEXT_PUBLIC_BASE_URL → Vercel production domain → this deployment's
 * Vercel URL → localhost (dev). Never hard-codes a domain, so the web app,
 * the Capacitor app and every *.vercel.app alias keep working.
 */
export function getBaseUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim()
    if (explicit) return explicit.replace(/\/+$/, '')

    const production = process.env.VERCEL_PROJECT_PRODUCTION_URL
    if (process.env.VERCEL_ENV === 'production' && production) return `https://${production}`

    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`

    return 'http://localhost:3000'
}

/**
 * Base URL of the host the current request came in on (server actions /
 * route handlers), so users are returned to the same domain they used.
 * Falls back to getBaseUrl() outside a request.
 */
export async function getRequestBaseUrl(): Promise<string> {
    const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim()
    if (explicit) return explicit.replace(/\/+$/, '')

    try {
        const h = await headers()
        const host = h.get('x-forwarded-host') || h.get('host')
        if (host) {
            const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
            return `${proto}://${host}`
        }
    } catch {
        /* not in a request scope */
    }
    return getBaseUrl()
}
