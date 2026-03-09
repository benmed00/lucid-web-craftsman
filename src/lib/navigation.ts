/**
 * Global navigation utility for use outside React components (e.g., toast callbacks).
 * Avoids full page reloads from window.location.href.
 */

let navigateFn: ((path: string) => void) | null = null;

export function setNavigate(fn: (path: string) => void) {
  navigateFn = fn;
}

export function appNavigate(path: string) {
  if (navigateFn) {
    navigateFn(path);
  } else {
    // Fallback if navigate hasn't been set yet
    window.location.href = path;
  }
}
