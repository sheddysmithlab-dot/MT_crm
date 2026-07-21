/**
 * HTTP client for Malwa CRM Python API (Option B).
 * Set VITE_API_URL (e.g. http://127.0.0.1:8000/api) and VITE_USE_API=true
 */
const TOKEN_KEY = 'malwa_crm_api_token';

export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
  return raw.replace(/\/$/, '');
}

export function isApiModeEnabled() {
  // Explicit flag, or when not running inside Electron
  if (import.meta.env.VITE_USE_API === 'true') return true;
  if (import.meta.env.VITE_USE_API === 'false') return false;
  return typeof window !== 'undefined' && !window.electron?.isElectron;
}

export function getAccessToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, { status, detail } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, auth = true, headers: extraHeaders = {} } = options;
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = {
    Accept: 'application/json',
    ...extraHeaders,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(err.message || 'Network error', { status: 0, detail: 'offline' });
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!response.ok) {
    const detail = data?.detail || data?.error || response.statusText;
    const message = typeof detail === 'string' ? detail : JSON.stringify(detail);
    throw new ApiError(message, { status: response.status, detail });
  }

  return data;
}
