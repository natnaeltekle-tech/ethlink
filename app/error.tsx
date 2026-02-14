'use client'

import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('App Error:', error)
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Icon */}
                <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                </div>

                <div>
                    <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                    <p className="text-muted-foreground text-sm">
                        An unexpected error occurred. Reload the app to try again.
                    </p>
                </div>

                {/* Primary: Reload App */}
                <button
                    onClick={() => {
                        try { reset() } catch { /* ignore */ }
                        window.location.reload()
                    }}
                    className="w-full py-3 px-6 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors text-base"
                >
                    Reload App
                </button>

                {/* Secondary: Go Home */}
                <button
                    onClick={() => window.location.href = '/'}
                    className="w-full py-3 px-6 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors text-sm"
                >
                    Go to Home
                </button>

                {/* Collapsible error details */}
                <details className="text-left text-xs text-muted-foreground font-mono p-3 bg-secondary/30 rounded-lg">
                    <summary className="cursor-pointer select-none">Error details</summary>
                    <div className="mt-2 break-words">{error?.message || 'Unknown error'}</div>
                    {error?.digest && <div className="mt-1 opacity-60">Digest: {error.digest}</div>}
                </details>
            </div>
        </div>
    )
}
