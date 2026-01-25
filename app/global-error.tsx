'use client'

import { useEffect } from 'react'

export default function GlobalError({
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
        <html>
            <body className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground">
                <div className="max-w-md w-full p-6 bg-card rounded-lg border border-border shadow-lg space-y-4">
                    <h2 className="text-2xl font-bold text-red-500">Something went wrong!</h2>
                    <div className="p-4 bg-red-500/10 rounded text-sm font-mono overflow-auto max-h-48">
                        <p className="font-bold">{error.message}</p>
                        {error.stack && (
                            <pre className="mt-2 text-xs opacity-70 whitespace-pre-wrap">
                                {error.stack}
                            </pre>
                        )}
                    </div>
                    <button
                        onClick={() => reset()}
                        className="w-full py-2 px-4 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}
