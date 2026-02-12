'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
            <div className="max-w-xl w-full bg-slate-800/60 border border-slate-700 rounded-lg p-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
                <p className="text-sm text-slate-300 mb-6">An unexpected error occurred. You can reload the page to try again.</p>
                <div className="flex items-center justify-center gap-3">
                    <Button
                        onClick={() => {
                            try { reset() } catch (e) { /* ignore */ }
                            window.location.reload()
                        }}
                        variant="default"
                    >
                        Reload
                    </Button>
                </div>
                <details className="mt-4 text-left text-xs text-slate-400 font-mono p-2 bg-slate-900/30 rounded">
                    <summary className="cursor-pointer">Error details</summary>
                    <div className="mt-2 break-words">{error?.message}</div>
                </details>
            </div>
        </div>
    )
}
