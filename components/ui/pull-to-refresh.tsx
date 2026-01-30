'use client'

import * as React from 'react'
import { useHaptics } from '@/lib/hooks/useHaptics'
import { cn } from '@/lib/utils'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
    onRefresh: () => Promise<void>
    children: React.ReactNode
    className?: string
    threshold?: number
    disabled?: boolean
}

/**
 * Pull-to-refresh component for mobile web
 * Provides native-feeling refresh interaction for lists and content
 */
export function PullToRefresh({
    onRefresh,
    children,
    className,
    threshold = 80,
    disabled = false,
}: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = React.useState(0)
    const [isRefreshing, setIsRefreshing] = React.useState(false)
    const [startY, setStartY] = React.useState(0)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const haptics = useHaptics()

    const handleTouchStart = (e: React.TouchEvent) => {
        if (disabled || isRefreshing) return

        // Only trigger if scrolled to top
        const scrollTop = containerRef.current?.scrollTop || 0
        if (scrollTop === 0) {
            setStartY(e.touches[0].clientY)
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (disabled || isRefreshing || startY === 0) return

        const currentY = e.touches[0].clientY
        const distance = currentY - startY

        // Only allow pull down
        if (distance > 0) {
            setPullDistance(Math.min(distance, threshold * 1.5))

            // Haptic feedback when threshold is reached
            if (distance >= threshold && pullDistance < threshold) {
                haptics.medium()
            }
        }
    }

    const handleTouchEnd = async () => {
        if (disabled || isRefreshing) return

        if (pullDistance >= threshold) {
            setIsRefreshing(true)
            haptics.success()

            try {
                await onRefresh()
            } catch (error) {
                console.error('Refresh failed:', error)
                haptics.error()
            } finally {
                setIsRefreshing(false)
            }
        }

        setPullDistance(0)
        setStartY(0)
    }

    const progress = Math.min(pullDistance / threshold, 1)
    const rotation = progress * 360

    return (
        <div
            ref={containerRef}
            className={cn('relative overflow-y-auto', className)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <div
                className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 ease-out"
                style={{
                    height: pullDistance,
                    opacity: progress,
                }}
            >
                <div className="flex flex-col items-center gap-2">
                    <RefreshCw
                        className={cn(
                            'h-6 w-6 text-primary transition-transform',
                            isRefreshing && 'animate-spin'
                        )}
                        style={{
                            transform: `rotate(${rotation}deg)`,
                        }}
                    />
                    {pullDistance >= threshold && !isRefreshing && (
                        <span className="text-xs text-muted-foreground">
                            Release to refresh
                        </span>
                    )}
                    {isRefreshing && (
                        <span className="text-xs text-muted-foreground">
                            Refreshing...
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div
                className="transition-transform duration-200 ease-out"
                style={{
                    transform: `translateY(${pullDistance}px)`,
                }}
            >
                {children}
            </div>
        </div>
    )
}
