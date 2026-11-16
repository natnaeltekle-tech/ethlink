'use client'

import { Capacitor } from '@capacitor/core'
import { removePushToken } from '@/lib/actions/push'

export const PUSH_CHANNEL_ID = 'bookings_messages'
const TOKEN_KEY = 'ethlinks.pushToken'

export function rememberPushToken(token: string) {
    try { localStorage.setItem(TOKEN_KEY, token) } catch { /* storage unavailable */ }
}

/**
 * Call BEFORE signing out (needs the session): this phone stops receiving the
 * signed-out user's notifications. Never throws, never blocks logout for long.
 */
export async function unregisterPushBeforeLogout(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    let token: string | null = null
    try { token = localStorage.getItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
    if (!token) return
    await Promise.race([
        removePushToken(token).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 2500)),
    ])
}

/** Only follow in-app links from a notification payload. */
export function safeNotificationLink(link: unknown): string | null {
    if (typeof link !== 'string') return null
    const l = link.trim()
    return l.startsWith('/') && !l.startsWith('//') ? l : null
}
