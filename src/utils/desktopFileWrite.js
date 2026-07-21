import { isApiModeEnabled } from '@/api/client';

/**
 * Legacy desktop JSON file writes — no-op in web API mode.
 */
export async function writeDesktopJson(filePath, data) {
  if (isApiModeEnabled()) return { skipped: true };
  if (typeof window === 'undefined' || !window.electron?.fs?.writeFile) {
    return { skipped: true };
  }
  const payload = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return window.electron.fs.writeFile(filePath, payload);
}
