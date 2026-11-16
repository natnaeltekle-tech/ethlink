'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { createClient } from '@/lib/supabase/client'
import { savePushToken } from '@/lib/actions/push'
import { PUSH_CHANNEL_ID, rememberPushToken, safeNotificationLink } from '@/lib/native/push'

/**
 * Android push notifications (FCM via @capacitor/push-notifications).
 * - Signed in → ask permission (Android 13+), register, save the token.
 * - Tap on a notification → open its `link` inside the app.
 * Requires android/app/google-services.json in the APK build.
 */
export function PushNotificationsManager() {
    const router = useRouter()
    const routerRef = useRef(router)
    routerRef.current = router

    useEffect(() => {
        if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('PushNotifications')) return
        let alive = true
        const removers: (() => void)[] = []
        let signedIn = false
        let registering = false

        const setup = async () => {
            const { PushNotifications } = await import('@capacitor/push-notifications')

            await PushNotifications.createChannel({
                id: PUSH_CHANNEL_ID,
                name: 'Bookings & messages',
                description: 'Booking requests, payments, receipts and new messages',
                importance: 4, // high: sound + heads-up
                visibility: 1, // public on the lock screen
                vibration: true,
                lights: true,
                lightColor: '#F5C619',
            }).catch(() => { /* channel exists / older Android */ })

            const add = async (p: Promise<{ remove: () => Promise<void> }>) => {
                const h = await p
                if (alive) removers.push(() => void h.remove()); else void h.remove()
            }
            await add(PushNotifications.addListener('registration', async ({ value }) => {
                rememberPushToken(value)
                if (signedIn) await savePushToken(value, 'android')
            }))
            await add(PushNotifications.addListener('registrationError', (e) => console.warn('[push] registration error', e?.error)))
            // Fired for taps, including the tap that launched the app.
            await add(PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
                const link = safeNotificationLink(notification?.data?.link)
                routerRef.current.push(link ?? '/dashboard')
            }))
            // While the app is open: refresh so badges/bookings update right away.
            await add(PushNotifications.addListener('pushNotificationReceived', () => routerRef.current.refresh()))

            const register = async () => {
                if (registering) return
                registering = true
                try {
                    let perm = await PushNotifications.checkPermissions()
                    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
                        perm = await PushNotifications.requestPermissions()
                    }
                    if (perm.receive === 'granted') await PushNotifications.register() // → 'registration'
                } finally {
                    registering = false
                }
            }

            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            signedIn = Boolean(session)
            if (signedIn) await register()
            const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
                signedIn = Boolean(s)
                if (event === 'SIGNED_IN' && s) void register()
            })
            removers.push(() => sub.subscription.unsubscribe())
        }

        setup().catch((e) => console.warn('[push] setup skipped:', e))
        return () => { alive = false; removers.forEach((r) => r()) }
    }, [])

    return null
}
