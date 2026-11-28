export class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

const ALLOWED_MOCK_HOSTNAMES = new Set(['', 'localhost', '127.0.0.1', '[::1]', '::1']);

function isLocalMockHost(win) {
  const hostname = String(win?.location?.hostname ?? '').trim().toLowerCase();
  return ALLOWED_MOCK_HOSTNAMES.has(hostname) || hostname.endsWith('.local');
}

/**
 * Read and validate the environment-supplied API base URL without embedding
 * any production URL in source. Expects either window.__ROSTER_CONFIG__.apiBaseUrl
 * or <meta name="roster-api-base-url" content="...">.
 *
 * Development mock mode is strictly opt-in (mockMode === true) and blocked on
 * non-local/production hostnames.
 */
export function loadConfig(doc = globalThis.document, win = globalThis.window) {
  const runtimeConfig = (win && win.__ROSTER_CONFIG__) || {};
  const metaEl = doc?.querySelector?.('meta[name="roster-api-base-url"]');
  const mockMetaEl = doc?.querySelector?.('meta[name="roster-mock-mode"]');
  const searchParams = win?.location?.search ? new URLSearchParams(win.location.search) : null;
  const queryMockParam = String(searchParams?.get('mockMode') ?? searchParams?.get('mock') ?? '').trim().toLowerCase();
  const mockMode =
    runtimeConfig.mockMode === true ||
    String(mockMetaEl?.getAttribute('content') ?? '').trim().toLowerCase() === 'true' ||
    queryMockParam === 'true' ||
    queryMockParam === '1';

  if (mockMode && !isLocalMockHost(win)) {
    throw new ConfigurationError(
      'Development mock mode is prohibited on non-local or production hostnames.'
    );
  }

  const rawBaseUrl = runtimeConfig.apiBaseUrl ?? metaEl?.getAttribute('content') ?? '';
  const trimmed = String(rawBaseUrl).trim();

  if (!trimmed && !mockMode) {
    throw new ConfigurationError(
      'Application configuration required: no API base URL was supplied by the runtime environment.'
    );
  }

  let normalizedBase;
  if (!trimmed || trimmed === '/') {
    normalizedBase = '';
  } else {
    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new ConfigurationError('Invalid API base URL configuration.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new ConfigurationError('API base URL must use http or https.');
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new ConfigurationError('API base URL must not contain credentials, query strings, or fragments.');
    }
    if (mockMode && !ALLOWED_MOCK_HOSTNAMES.has(parsed.hostname.toLowerCase()) && !parsed.hostname.toLowerCase().endsWith('.local')) {
      throw new ConfigurationError('Development mock mode cannot be combined with a non-local API base URL.');
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    normalizedBase = `${parsed.origin}${cleanPath}`;
  }

  const basePathMeta = doc?.querySelector?.('meta[name="roster-base-path"]')?.getAttribute('content') ?? '';
  const rawBasePath = String(runtimeConfig.basePath ?? basePathMeta).trim();
  const basePath = rawBasePath && rawBasePath !== '/' ? `/${rawBasePath.replace(/^\/+|\/+$/g, '')}` : '';

  return Object.freeze({
    apiBaseUrl: normalizedBase,
    apiV2Base: `${normalizedBase}/api/v2`,
    csrfHeaderName: 'X-CSRF-TOKEN',
    basePath,
    mockMode,
  });
}

let cachedConfig = null;

export function getConfig() {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

export function resetConfigCache() {
  cachedConfig = null;
}
