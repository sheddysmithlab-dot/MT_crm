import { apiRequest } from './client';

export function syncPush(items) {
  return apiRequest('/sync/push', {
    method: 'POST',
    body: { items },
  });
}

export function syncPull(table, since = null, limit = 500) {
  const qs = new URLSearchParams({ table, limit: String(limit) });
  if (since) qs.set('since', since);
  return apiRequest(`/sync/pull?${qs.toString()}`);
}
