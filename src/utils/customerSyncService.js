/**
 * customerSyncService.js — thin wrapper kept for backward compatibility.
 * Delegates to the generic syncService.
 */
export { syncTableNow as syncCustomersNow } from './syncService.js';
