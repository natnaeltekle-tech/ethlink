'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { googleSignInAvailable, signInWithGoogle } from '@/lib/auth/google'

/** Official Google "G" mark (multicolour, unmodified). */
function GoogleG() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
    )
}

/** "Continue with Google" + an "or" divider. Hidden in old app builds that can't return from Google. */
export function GoogleButton({ next = '/', label = 'Continue with Google' }: { next?: string; label?: string }) {
    const [available, setAvailable] = useState(true)
    const [busy, setBusy] = useState(false)

    useEffect(() => { setAvailable(googleSignInAvailable()) }, [])
    if (!available) return null

    const go = async () => {
        if (busy) return
        setBusy(true)
        const { error } = await signInWithGoogle(next)
        if (error) toast.error(error)
        // Web navigates away; in the app the Chrome tab opens — re-enable for a retry either way.
        setTimeout(() => setBusy(false), error ? 0 : 4000)
    }

    return (
        <div className="flex flex-col gap-4">
            <button type="button" onClick={go} disabled={busy}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-white/15 bg-[#121214] px-4 text-sm font-medium text-white transition-colors hover:border-[#FACC15]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] disabled:opacity-70">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleG />}
                {label}
            </button>
            <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
            </div>
        </div>
    )
}
