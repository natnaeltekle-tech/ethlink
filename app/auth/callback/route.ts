import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath, syncProfileFromOAuth } from '@/lib/auth/profile-sync'

/**
 * OAuth return URL for the web (Continue with Google): Supabase sends the user
 * here with ?code=…; exchange it for a session cookie, sync the profile, go on.
 * (The Android app returns via the com.ethlink.app://login-callback deep link instead.)
 */
export async function GET(request: NextRequest) {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const next = safeNextPath(url.searchParams.get('next'))
    const oauthError = url.searchParams.get('error_description') ?? url.searchParams.get('error')

    if (oauthError) {
        return NextResponse.redirect(new URL(`/auth/error?error=${encodeURIComponent(oauthError)}`, url.origin))
    }
    if (!code) {
        return NextResponse.redirect(new URL('/auth/error?error=Missing%20sign-in%20code', url.origin))
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.user) {
        return NextResponse.redirect(new URL(`/auth/error?error=${encodeURIComponent(error?.message ?? 'Sign-in failed')}`, url.origin))
    }
    await syncProfileFromOAuth(data.user)
    return NextResponse.redirect(new URL(next, url.origin))
}
