export class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Read and validate the environment-supplied API base URL without embedding
 * any production URL in source. Expects either window.__ROSTER_CONFIG__.apiBaseUrl
 * or <meta name="roster-api-base-url" content="...">.
 */
export function loadConfig(doc = globalThis.document, win = globalThis.window) {
  const runtimeConfig = (win && win.__ROSTER_CONFIG__) || {};
  const metaEl = doc?.querySelector?.('meta[name="roster-api-base-url"]');
  const rawBaseUrl = runtimeConfig.apiBaseUrl ?? metaEl?.getAttribute('content') ?? '';
  const trimmed = String(rawBaseUrl).trim();

  if (!trimmed) {
    throw new ConfigurationError(
      'Application configuration required: no API base URL was supplied by the runtime environment.'
    );
  }

  let normalizedBase;
  if (trimmed === '/') {
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
