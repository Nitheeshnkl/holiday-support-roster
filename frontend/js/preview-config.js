export function createPreviewRuntimeConfig({ nodeEnv, sandboxUrl, requestHost }) {
  if (nodeEnv === 'production' || typeof sandboxUrl !== 'string' || !sandboxUrl.trim()) {
    return null;
  }

  try {
    const parsedSandboxUrl = new URL(sandboxUrl);
    if (parsedSandboxUrl.protocol !== 'https:' || parsedSandboxUrl.username || parsedSandboxUrl.password || parsedSandboxUrl.pathname !== '/' || parsedSandboxUrl.search || parsedSandboxUrl.hash) {
      return null;
    }

    const parsedRequestHost = new URL(`http://${String(requestHost || '')}`);
    if (parsedRequestHost.host.toLowerCase() !== parsedSandboxUrl.host.toLowerCase()) {
      return null;
    }

    return Object.freeze({ enabled: true, hostname: parsedSandboxUrl.hostname.toLowerCase() });
  } catch {
    return null;
  }
}
