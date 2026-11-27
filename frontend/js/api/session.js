import { setCsrfToken } from '../state/session-store.js';
import { apiRequest } from './client.js';

export async function getCsrfToken() {
  const result = await apiRequest('/session/csrf', { method: 'GET', skipUnauthorizedRedirect: true });
  setCsrfToken(result?.csrfToken);
  return result;
}

export async function login(credentials) {
  await getCsrfToken();
  const session = await apiRequest('/session/login', {
    method: 'POST',
    body: credentials,
    skipUnauthorizedRedirect: true,
  });
  const csrf = await getCsrfToken();
  return { ...session, csrfToken: csrf.csrfToken };
}

export async function logout() {
  const result = await apiRequest('/session/logout', {
    method: 'POST',
    skipUnauthorizedRedirect: true,
  });
  setCsrfToken(null);
  await getCsrfToken();
  return result;
}

export async function getCurrentSession({ signal, skipUnauthorizedRedirect = true } = {}) {
  const session = await apiRequest('/session/me', {
    method: 'GET',
    signal,
    skipUnauthorizedRedirect,
  });
  if (session?.csrfToken) setCsrfToken(session.csrfToken);
  else { const csrf = await getCsrfToken(); session.csrfToken = csrf.csrfToken; }
  return session;
}

export async function changePassword(input) {
  const result = await apiRequest('/session/password/change', {
    method: 'POST',
    body: input,
    skipUnauthorizedRedirect: true,
  });
  setCsrfToken(null);
  await getCsrfToken();
  return result;
}

export function requestPasswordReset(input) {
  return apiRequest('/password-reset-requests', {
    method: 'POST',
    body: input,
    skipUnauthorizedRedirect: true,
  });
}

export async function resetPassword(input) {
  const result = await apiRequest('/password-resets', {
    method: 'POST',
    body: input,
    skipUnauthorizedRedirect: true,
  });
  setCsrfToken(null);
  await getCsrfToken();
  return result;
}

export async function activateAccount(input) {
  const result = await apiRequest('/account-activations', {
    method: 'POST',
    body: input,
    skipUnauthorizedRedirect: true,
  });
  setCsrfToken(null);
  await getCsrfToken();
  return result;
}
