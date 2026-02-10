/**
 * Wraps a callback in a View Transition if the browser supports it.
 * Falls back to calling the callback directly otherwise.
 */
export function withViewTransition(callback: () => void): void {
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    (document as any).startViewTransition(callback);
  } else {
    callback();
  }
}
