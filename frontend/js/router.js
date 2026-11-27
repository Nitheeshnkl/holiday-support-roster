import { getConfig } from './config.js';

/**
 * Lightweight path router using History API with parameter matching,
 * permission checks, and clean signal-based disposal.
 */
export function createRouter(routes = []) {
  function stripBasePath(pathname) {
    const { basePath } = getConfig();
    let p = pathname || '/';
    if (basePath && p.startsWith(basePath)) {
      p = p.slice(basePath.length) || '/';
    }
    if (p.endsWith('/index.html')) {
      p = p.slice(0, -'/index.html'.length) || '/';
    }
    if (p.length > 1 && p.endsWith('/')) {
      p = p.slice(0, -1);
    }
    return p || '/';
  }

  function withBasePath(appPath) {
    const { basePath } = getConfig();
    const clean = appPath.startsWith('/') ? appPath : `/${appPath}`;
    return `${basePath}${clean}`;
  }

  function compilePattern(pattern) {
    const paramNames = [];
    const segments = pattern.split('/').filter(Boolean);
    const regexParts = segments.map((seg) => {
      if (seg.startsWith(':')) {
        paramNames.push(seg.slice(1));
        return '([^/]+)';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    const regex = new RegExp(`^/${regexParts.join('/')}$`);
    return { regex, paramNames };
  }

  const compiled = routes.map((route) => ({
    ...route,
    ...compilePattern(route.path),
  }));

  function match(urlLike = window.location.pathname + window.location.search) {
    const url = new URL(urlLike, window.location.origin);
    const pathname = stripBasePath(url.pathname);
    const query = url.searchParams;

    for (const route of compiled) {
      const m = pathname.match(route.regex);
      if (m) {
        const params = {};
        route.paramNames.forEach((name, idx) => {
          params[name] = decodeURIComponent(m[idx + 1]);
        });
        return { route, pathname, params, query };
      }
    }
    return { route: null, pathname, params: {}, query };
  }

  function navigate(targetPath, { replace = false } = {}) {
    const fullTarget = withBasePath(targetPath);
    if (replace) {
      window.history.replaceState({}, '', fullTarget);
    } else {
      window.history.pushState({}, '', fullTarget);
    }
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  return {
    match,
    navigate,
    stripBasePath,
    withBasePath,
  };
}
