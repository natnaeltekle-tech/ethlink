'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useHaptics } from './useHaptics'

interface SwipeBackOptions {
    threshold?: number
    enabled?: boolean
}

/**
 * Custom hook for swipe-to-go-back gesture
 * Enables native-feeling back navigation via swipe from left edge
 */
export function useSwipeBack({ threshold = 100, enabled = true }: SwipeBackOptions = {}) {
    const router = useRouter()
    const haptics = useHaptics()
    const [swipeDistance, setSwipeDistance] = useState(0)
    const startXRef = useRef(0)
    const startYRef = useRef(0)
    const isSwipingRef = useRef(false)

    useEffect(() => {
        if (!enabled) return

        const handleTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0]
            startXRef.current = touch.clientX
            startYRef.current = touch.clientY

            // Only trigger if starting from left edge (within 20px)
            if (touch.clientX < 20) {
                isSwipingRef.current = true
            }
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (!isSwipingRef.current) return

            const touch = e.touches[0]
            const deltaX = touch.clientX - startXRef.current
            const deltaY = touch.clientY - startYRef.current

            // Only allow horizontal swipe (more horizontal than vertical)
            if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
                setSwipeDistance(Math.min(deltaX, threshold * 1.5))

                // Haptic feedback when threshold is reached
                if (deltaX >= threshold && swipeDistance < threshold) {
                    haptics.medium()
                }

                // Prevent default scrolling
                e.preventDefault()
            } else {
                // Cancel swipe if moving vertically
                isSwipingRef.current = false
                setSwipeDistance(0)
            }
        }

        const handleTouchEnd = () => {
            if (!isSwipingRef.current) return

            if (swipeDistance >= threshold) {
                haptics.success()
                router.back()
            }

            isSwipingRef.current = false
            setSwipeDistance(0)
            startXRef.current = 0
            startYRef.current = 0
        }

        document.addEventListener('touchstart', handleTouchStart, { passive: true })
        document.addEventListener('touchmove', handleTouchMove, { passive: false })
        document.addEventListener('touchend', handleTouchEnd, { passive: true })

        return () => {
            document.removeEventListener('touchstart', handleTouchStart)
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleTouchEnd)
        }
    }, [enabled, threshold, swipeDistance, router, haptics])

    return {
        swipeDistance,
        isSwiping: isSwipingRef.current,
    }
}
