/**
 * Haptic Feedback Utilities
 * Provides haptic feedback for mobile interactions
 */

export const Haptics = {
  /**
   * Light impact feedback (for taps, selections)
   */
  light: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium impact feedback (for button presses)
   */
  medium: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  /**
   * Heavy impact feedback (for important actions)
   */
  heavy: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },

  /**
   * Success pattern (short-short)
   */
  success: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  /**
   * Error pattern (long)
   */
  error: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }
  },
};
