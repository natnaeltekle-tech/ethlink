'use client'

import { useEffect, useRef, RefObject } from 'react'

/**
 * Custom hook for keyboard avoidance
 * Ensures input fields are not covered by the virtual keyboard on mobile
 */
export function useKeyboardAvoidance(inputRef: RefObject<HTMLElement>) {
    useEffect(() => {
        const element = inputRef.current
        if (!element) return

        const handleFocus = () => {
            // Small delay to let keyboard animation start
            setTimeout(() => {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest',
                })
            }, 300)
        }

        const handleBlur = () => {
            // Scroll back to top when keyboard closes
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }

        element.addEventListener('focus', handleFocus)
        element.addEventListener('blur', handleBlur)

        return () => {
            element.removeEventListener('focus', handleFocus)
            element.removeEventListener('blur', handleBlur)
        }
    }, [inputRef])
}

/**
 * Hook to detect if virtual keyboard is open
 * Useful for adjusting UI when keyboard appears
 */
export function useKeyboardOpen() {
    const isKeyboardOpen = useRef(false)

    useEffect(() => {
        const handleResize = () => {
            // On mobile, viewport height changes when keyboard opens
            const viewportHeight = window.visualViewport?.height || window.innerHeight
            const windowHeight = window.innerHeight

            // If viewport is significantly smaller, keyboard is likely open
            isKeyboardOpen.current = viewportHeight < windowHeight * 0.75
        }

        window.visualViewport?.addEventListener('resize', handleResize)
        window.addEventListener('resize', handleResize)

        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize)
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    return isKeyboardOpen.current
}
