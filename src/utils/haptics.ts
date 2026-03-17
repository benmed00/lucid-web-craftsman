/**
 * Haptic feedback utility
 * Uses the Vibration API where supported (Android Chrome, etc.)
 * Gracefully no-ops on unsupported platforms (iOS Safari, desktop)
 */

type HapticPattern =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'error'
  | 'selection';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 20],
  error: [50, 30, 50, 30, 50],
  selection: 5,
};

export function hapticFeedback(pattern: HapticPattern = 'light'): void {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(PATTERNS[pattern]);
    }
  } catch {
    // Silently ignore — vibration not supported
  }
}
