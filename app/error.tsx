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
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 space-y-4">
            <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">Something went wrong!</h2>
                <p className="text-sm text-muted-foreground bg-secondary/50 p-2 rounded font-mono max-w-lg mx-auto overflow-auto">
                    {error.message || 'An unexpected error occurred'}
                </p>
            </div>
            <div className="flex gap-3">
                <Button
                    onClick={() => reset()}
                    variant="default"
                >
                    Try again
                </Button>
                <Button
                    onClick={() => window.location.href = '/'}
                    variant="outline"
                >
                    Go Home
                </Button>
            </div>
        </div>
    )
}
