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
        // Log error details for debugging
        console.error('Global Error:', error)
        console.error('Error Digest:', error.digest)
        console.error('Error Stack:', error.stack)
    }, [error])

    return (
        <html>
            <head>
                <title>Error - Eth-Links</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground">
                <div className="max-w-lg w-full p-6 bg-card rounded-lg border border-border shadow-lg space-y-4">
                    <h2 className="text-2xl font-bold text-red-500">Application Error</h2>
                    
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            The application encountered an unexpected error. This might be due to:
                        </p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                            <li>Missing environment variables in Vercel dashboard</li>
                            <li>Database connection issues</li>
                            <li>API service unavailability</li>
                        </ul>
                    </div>

                    <div className="p-4 bg-red-500/10 rounded text-sm font-mono overflow-auto max-h-48 border border-red-500/20">
                        <p className="font-bold text-red-400">{error.message || 'Unknown error'}</p>
                        {error.digest && (
                            <p className="text-xs mt-1 text-red-300">Digest: {error.digest}</p>
                        )}
                        {error.stack && (
                            <pre className="mt-2 text-xs opacity-70 whitespace-pre-wrap">
                                {error.stack}
                            </pre>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => reset()}
                            className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                        >
                            Try again
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="flex-1 py-2 px-4 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors"
                        >
                            Go Home
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}
