import { apiRequest } from './client';

export function listCustomers(params = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.status) qs.set('status', params.status);
  if (params.skip != null) qs.set('skip', String(params.skip));
  if (params.limit != null) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return apiRequest(`/customers${q ? `?${q}` : ''}`);
}

export function getCustomer(id) {
  return apiRequest(`/customers/${id}`);
}

export function createCustomer(payload) {
  return apiRequest('/customers', { method: 'POST', body: payload });
}

export function updateCustomer(id, payload) {
  return apiRequest(`/customers/${id}`, { method: 'PUT', body: payload });
}

export function deleteCustomer(id) {
  return apiRequest(`/customers/${id}`, { method: 'DELETE' });
}
