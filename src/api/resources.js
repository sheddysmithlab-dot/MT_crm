import { apiRequest } from './client';

export function listResources() {
  return apiRequest('/resources');
}

export function listEntities(resource, params = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.status) qs.set('status', params.status);
  if (params.skip != null) qs.set('skip', String(params.skip));
  if (params.limit != null) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return apiRequest(`/resources/${resource}${q ? `?${q}` : ''}`);
}

export function getEntity(resource, id) {
  return apiRequest(`/resources/${resource}/${id}`);
}

export function createEntity(resource, payload) {
  return apiRequest(`/resources/${resource}`, { method: 'POST', body: payload });
}

export function updateEntity(resource, id, payload) {
  return apiRequest(`/resources/${resource}/${id}`, { method: 'PUT', body: payload });
}

export function deleteEntity(resource, id) {
  return apiRequest(`/resources/${resource}/${id}`, { method: 'DELETE' });
}
