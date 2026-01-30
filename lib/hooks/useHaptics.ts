'use client'

/**
 * Custom hook for haptic feedback using the Web Vibration API
 * Provides native-feeling tactile responses for user interactions
 * 
 * Note: Vibration API support:
 * - Android Chrome/Edge: Full support
 * - iOS Safari: Not supported (silently fails)
 * - Desktop browsers: Limited support
 */
export function useHaptics() {
    const vibrate = (pattern: number | number[]) => {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            try {
                navigator.vibrate(pattern)
            } catch (error) {
                // Silently fail if vibration is not supported
                console.debug('Vibration not supported:', error)
            }
        }
    }

    return {
        /** Light tap feedback (10ms) - for subtle interactions like taps */
        light: () => vibrate(10),

        /** Medium tap feedback (20ms) - for button presses */
        medium: () => vibrate(20),

        /** Heavy tap feedback (30ms) - for important actions */
        heavy: () => vibrate(30),

        /** Success pattern (10ms, pause 50ms, 10ms) - for successful operations */
        success: () => vibrate([10, 50, 10]),

        /** Error pattern (50ms, pause 100ms, 50ms) - for errors or warnings */
        error: () => vibrate([50, 100, 50]),

        /** Cancel any ongoing vibration */
        cancel: () => vibrate(0),
    }
}
