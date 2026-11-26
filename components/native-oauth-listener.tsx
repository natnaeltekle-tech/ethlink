'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { NATIVE_OAUTH_REDIRECT, NEXT_KEY } from '@/lib/auth/google'
import { syncMyOAuthProfile } from '@/lib/actions/auth'
import { safeNextPath } from '@/lib/auth/profile-sync-path'

/**
 * Android app only: Google sign-in finishes in a Chrome Custom Tab, then Android
 * opens com.ethlink.app://login-callback?code=… which arrives here as
 * `appUrlOpen` (or as the launch URL on a cold start). We exchange the code in
 * this WebView — where the PKCE verifier lives — close the tab and continue.
 */
export function NativeOAuthListener() {
    const router = useRouter()

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return
        let remove: (() => void) | undefined
        let handled = ''

        const finish = async (url: string) => {
            if (!url.startsWith(NATIVE_OAUTH_REDIRECT) || url === handled) return
            handled = url
            const { Browser } = await import('@capacitor/browser')
            void Browser.close().catch(() => { /* already closed */ })

            const parsed = new URL(url.replace(NATIVE_OAUTH_REDIRECT, 'https://callback.local/'))
            const params = new URLSearchParams(parsed.search || parsed.hash.replace(/^#/, ''))
            const failure = params.get('error_description') ?? params.get('error')
            const code = params.get('code')
            if (failure || !code) {
                toast.error(failure ?? 'Google sign-in was cancelled')
                return
            }
            const { error } = await createClient().auth.exchangeCodeForSession(code)
            if (error) {
                toast.error(error.message)
                return
            }
            await syncMyOAuthProfile()
            let next = '/'
            try { next = safeNextPath(localStorage.getItem(NEXT_KEY)); localStorage.removeItem(NEXT_KEY) } catch { /* ignore */ }
            toast.success('Signed in with Google')
            router.replace(next)
            router.refresh()
        }

        import('@capacitor/app').then(async ({ App }) => {
            const handle = await App.addListener('appUrlOpen', ({ url }) => void finish(url))
            remove = () => void handle.remove()
            const launch = await App.getLaunchUrl().catch(() => undefined)
            if (launch?.url) void finish(launch.url)
        }).catch(() => { /* App plugin missing in a very old build */ })

        return () => remove?.()
    }, [router])

    return null
}
