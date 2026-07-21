/**
 * Network helpers for Option B offline queue.
 */

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function subscribeNetworkStatus(onChange) {
  if (typeof window === 'undefined') return () => {};

  const handler = () => onChange(navigator.onLine);
  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);
  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
  };
}
