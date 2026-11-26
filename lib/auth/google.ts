'use client'

import { Capacitor } from '@capacitor/core'
import { createClient } from '@/lib/supabase/client'

/**
 * Continue with Google (Supabase OAuth, PKCE).
 *
 * Web: full-page redirect → Google → /auth/callback (server exchanges the code).
 * Android app: Google refuses sign-in inside embedded WebViews, so the flow opens
 *   in a Chrome Custom Tab (@capacitor/browser). Supabase then redirects to
 *   NATIVE_OAUTH_REDIRECT, Android hands that deep link back to the app, and
 *   NativeOAuthListener exchanges the code inside the WebView (where the PKCE
 *   verifier was stored) — the user lands back in Eth-Links, signed in.
 */
export const NATIVE_OAUTH_REDIRECT = 'com.ethlink.app://login-callback'
export const NEXT_KEY = 'eth_links_oauth_next'

type NativeBridge = { oauthReady?: () => boolean }

/** False in APKs built before the deep link existed: Google sign-in can't return there. */
export function googleSignInAvailable(): boolean {
    if (typeof window === 'undefined') return true
    if (!Capacitor.isNativePlatform()) return true
    try {
        const bridge = (window as unknown as { EthLinksNative?: NativeBridge }).EthLinksNative
        return Capacitor.isPluginAvailable('Browser') && bridge?.oauthReady?.() === true
    } catch {
        return false
    }
}

export async function signInWithGoogle(next = '/'): Promise<{ error: string | null }> {
    const supabase = createClient()
    const native = Capacitor.isNativePlatform()

    if (!native) {
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo, queryParams: { prompt: 'select_account' } },
        })
        return { error: error?.message ?? null }
    }

    if (!googleSignInAvailable()) return { error: 'Update the Eth-Links app to sign in with Google.' }
    try { localStorage.setItem(NEXT_KEY, next) } catch { /* private mode */ }
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: NATIVE_OAUTH_REDIRECT, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
    })
    if (error || !data?.url) return { error: error?.message ?? 'Could not start Google sign-in' }
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url: data.url, windowName: '_self' })
    return { error: null }
}
