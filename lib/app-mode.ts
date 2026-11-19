/**
 * Airbnb-style workspaces: one account, two isolated experiences.
 * Pure helpers — safe on the server and in the browser.
 */
export type AppMode = 'customer' | 'provider'

export const MODE_STORAGE_KEY = 'eth_links_mode'
export const MODE_HOME: Record<AppMode, string> = { customer: '/', provider: '/provider/overview' }
export const MODE_PROFILE: Record<AppMode, string> = { customer: '/profile', provider: '/provider/profile' }

const CUSTOMER_EXACT = ['/', '/services', '/explore', '/home']
const CUSTOMER_PREFIXES = ['/bookings', '/profile', '/saved']

/**
 * Which workspace a route belongs to. `null` = shared (messages, receipts,
 * service pages, checkout…): those keep whatever mode is active.
 */
export function modeForPath(pathname: string | null | undefined): AppMode | null {
    const p = (pathname || '/').split('?')[0].replace(/\/+$/, '') || '/'
    if (p === '/provider' || p.startsWith('/provider/')) return 'provider'
    if (CUSTOMER_EXACT.includes(p) || CUSTOMER_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`))) return 'customer'
    return null
}

/**
 * Which workspace a notification is for, from its link. Used to keep provider
 * job alerts out of customer mode (and vice versa) and as push `data.role`.
 */
export function modeForLink(link: string | null | undefined): AppMode | null {
    if (!link) return null
    if (link.startsWith('/dashboard?mode=provider') || link.startsWith('/requests')) return 'provider'
    if (link.startsWith('/dashboard')) return 'customer'
    if (link.startsWith('/receipt') || link.startsWith('/payment') || link.startsWith('/book')) return 'customer'
    return modeForPath(link)
}
