import { apiRequest, setAccessToken, clearAccessToken } from './client';

export async function apiLogin(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });
  if (data?.access_token) {
    setAccessToken(data.access_token);
  }
  return data;
}

export async function apiMe() {
  return apiRequest('/auth/me');
}

export async function apiLogout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } finally {
    clearAccessToken();
  }
}
