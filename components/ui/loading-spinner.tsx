'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg'
    variant?: 'primary' | 'secondary' | 'white'
}

const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
}

const variantClasses = {
    primary: 'text-primary',
    secondary: 'text-muted-foreground',
    white: 'text-white',
}

/**
 * Native-style loading spinner component
 * Replaces web CSS spinners with a more native-feeling indicator
 */
export function LoadingSpinner({
    size = 'md',
    variant = 'primary',
    className,
    ...props
}: LoadingSpinnerProps) {
    return (
        <div
            role="status"
            aria-label="Loading"
            className={cn('flex items-center justify-center', className)}
            {...props}
        >
            <Loader2
                className={cn(
                    'animate-spin',
                    sizeClasses[size],
                    variantClasses[variant]
                )}
            />
            <span className="sr-only">Loading...</span>
        </div>
    )
}

/**
 * Full-screen loading overlay
 * Used for page transitions or major loading states
 */
export function LoadingOverlay({ message }: { message?: string }) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <LoadingSpinner size="lg" />
            {message && (
                <p className="mt-4 text-sm text-muted-foreground">{message}</p>
            )}
        </div>
    )
}

/**
 * Inline loading state for buttons
 */
export function ButtonLoading() {
    return <Loader2 className="h-4 w-4 animate-spin" />
}
