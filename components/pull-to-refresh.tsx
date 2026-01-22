'use client'

import { ReactNode, useRef, useState, TouchEvent } from 'react'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
    onRefresh: () => Promise<void>
    children: ReactNode
    threshold?: number
}

export function PullToRefresh({
    onRefresh,
    children,
    threshold = 80
}: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = useState(0)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const startY = useRef(0)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleTouchStart = (e: TouchEvent) => {
        // Only trigger if scrolled to top
        if (containerRef.current && containerRef.current.scrollTop === 0) {
            startY.current = e.touches[0].clientY
        }
    }

    const handleTouchMove = (e: TouchEvent) => {
        if (startY.current === 0 || isRefreshing) return

        const currentY = e.touches[0].clientY
        const distance = currentY - startY.current

        // Only pull down, not up
        if (distance > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
            setPullDistance(Math.min(distance, threshold * 1.5))
        }
    }

    const handleTouchEnd = async () => {
        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true)
            try {
                await onRefresh()
            } finally {
                setIsRefreshing(false)
            }
        }
        setPullDistance(0)
        startY.current = 0
    }

    const rotation = Math.min((pullDistance / threshold) * 360, 360)
    const opacity = Math.min(pullDistance / threshold, 1)

    return (
        <div className="relative h-full overflow-hidden">
            {/* Pull indicator */}
            <div
                className="absolute top-0 left-0 right-0 flex items-center justify-center transition-transform"
                style={{
                    transform: `translateY(${Math.min(pullDistance - 40, 40)}px)`,
                    opacity,
                }}
            >
                <div className="bg-primary/10 p-3 rounded-full">
                    <RefreshCw
                        className={`h-5 w-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
                        style={{ transform: `rotate(${rotation}deg)` }}
                    />
                </div>
            </div>

            {/* Content */}
            <div
                ref={containerRef}
                className="h-full overflow-y-auto"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    transform: `translateY(${pullDistance > 0 ? pullDistance * 0.5 : 0}px)`,
                    transition: pullDistance === 0 ? 'transform 0.3s ease' : 'none',
                }}
            >
                {children}
            </div>
        </div>
    )
}
