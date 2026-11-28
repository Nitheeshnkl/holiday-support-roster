import { getConfig } from '../config.js';
import { getCsrfToken, setCsrfToken } from '../state/session-store.js';
import { ApiError, normalizeApiError } from './errors.js';
import { mockTransport } from './mock-adapter.js';

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
}

function buildUrl(path, query) {
  const { apiV2Base } = getConfig();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = `${apiV2Base}${cleanPath}`;
  if (!query || typeof query !== 'object') return base;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Format an If-Match header value from an authoritative response ETag or DTO rowVersion.
 */
export function resolveIfMatch(resource) {
  if (resource && typeof resource === 'object') {
    if (typeof resource._etag === 'string' && resource._etag.trim()) {
      return resource._etag.trim();
    }
    if (typeof resource.etag === 'string' && resource.etag.trim()) {
      return resource.etag.trim();
    }
    if (resource.rowVersion !== undefined && resource.rowVersion !== null) {
      return `"${resource.rowVersion}"`;
    }
  }
  return null;
}

export function requireIfMatch(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('A current ETag or rowVersion is required before this change. Reload the latest resource.');
  return value.trim();
}

function attachEtag(data, etag) {
  if (etag && data && typeof data === 'object' && !Array.isArray(data)) {
    Object.defineProperty(data, '_etag', {
      value: etag,
      enumerable: false,
      configurable: true,
    });
  }
  return data;
}

export async function apiRequest(
  path,
  {
    method = 'GET',
    query = null,
    body = undefined,
    ifMatch = null,
    idempotencyKey = null,
    signal = undefined,
    skipUnauthorizedRedirect = false,
  } = {}
) {
  const { csrfHeaderName, mockMode } = getConfig();
  const upperMethod = method.toUpperCase();
  const headers = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod);
  if (isMutation) {
    let csrfToken = getCsrfToken();
    if (!csrfToken && path !== '/session/csrf') {
      const bootstrap = await apiRequest('/session/csrf', { method: 'GET', skipUnauthorizedRedirect: true });
      csrfToken = bootstrap?.csrfToken || null;
      setCsrfToken(csrfToken);
    }
    if (csrfToken) headers[csrfHeaderName] = csrfToken;
  }

  if (ifMatch) {
    headers['If-Match'] = ifMatch;
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  let response;
  try {
    if (mockMode) {
      response = await mockTransport({
        path: path.startsWith('/') ? path : `/${path}`,
        method: upperMethod,
        query,
        headers,
        body,
        signal,
      });
    } else {
      response = await fetch(buildUrl(path, query), {
        method: upperMethod,
        credentials: 'same-origin',
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the server. Check your connection and try again.',
    });
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('Content-Type') || '';
  let parsed = null;
  if (contentType.includes('application/json')) {
    const text = await response.text();
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }
  }

  if (!response.ok) {
    const apiError = normalizeApiError(response.status, parsed);
    if (response.status === 401 && !skipUnauthorizedRedirect && unauthorizedHandler) {
      unauthorizedHandler(apiError);
    }
    throw apiError;
  }

  const etag = response.headers.get('ETag');
  return attachEtag(parsed, etag);
}
