import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FRONTEND_DIR = path.resolve(__dirname, '..', '..', '..');
export const REPO_ROOT = path.resolve(FRONTEND_DIR, '..');
export const DEV_PREVIEW_PATH = path.join(FRONTEND_DIR, 'dev-preview.mjs');

const PLAYWRIGHT_PATH =
  process.env.PLAYWRIGHT_PATH ||
  '/Users/nitheeshvellaiyan/.nvm/versions/node/v24.5.0/lib/node_modules/playwright/index.mjs';

export async function loadPlaywright() {
  return import(PLAYWRIGHT_PATH);
}

export const DEMO_ACCOUNTS = Object.freeze({
  ADMIN: {
    id: 1,
    employeeId: 101,
    username: 'admin@company.local',
    password: 'AdminRoster#2026',
    displayName: 'Asha Rao',
    roles: ['ADMIN'],
  },
  TEAM_LEAD: {
    id: 2,
    employeeId: 102,
    username: 'lead@company.local',
    password: 'TeamLead#2026',
    displayName: 'Liam Chen',
    roles: ['TEAM_LEAD'],
  },
  MEMBER: {
    id: 3,
    employeeId: 103,
    username: 'member@company.local',
    password: 'MemberRoster#2026',
    displayName: 'Maya Patel',
    roles: ['MEMBER'],
  },
  APPROVER: {
    id: 4,
    employeeId: 104,
    username: 'approver@company.local',
    password: 'Approver#2026',
    displayName: 'Noah Brooks',
    roles: ['MEMBER'],
  },
  AUDITOR: {
    id: 5,
    employeeId: 105,
    username: 'auditor@company.local',
    password: 'Auditor#2026',
    displayName: 'Elena Vance',
    roles: ['MEMBER'],
  },
});

export function httpGetText(url, timeoutMs = 1500) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode ?? 0, body });
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error(`Request timeout: ${url}`));
    });
    req.on('error', reject);
  });
}

export async function isPreviewServerReady(baseUrl) {
  try {
    const res = await httpGetText(`${baseUrl.replace(/\/+$/, '')}/index.html`, 1200);
    return res.status === 200 && res.body.includes('id="app"');
  } catch {
    return false;
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 4173;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

export async function ensureDevServer({ baseUrl = 'http://127.0.0.1:4173', noServer = false } = {}) {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  if (await isPreviewServerReady(cleanUrl)) {
    return { baseUrl: cleanUrl, owned: false, stop: async () => {} };
  }
  if (noServer) {
    throw new Error(`--no-server specified, but preview server is not reachable at ${cleanUrl}`);
  }

  const parsed = new URL(cleanUrl);
  let targetPort = Number(parsed.port || 4173);
  let effectiveBaseUrl = cleanUrl;

  // Check if requested port is occupied by another unrelated process
  const portBusy = await new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(true));
    tester.once('listening', () => tester.close(() => resolve(false)));
    tester.listen(targetPort, '127.0.0.1');
  });

  if (portBusy) {
    targetPort = await getFreePort();
    effectiveBaseUrl = `${parsed.protocol}//${parsed.hostname}:${targetPort}`;
  }

  let logs = '';
  const child = spawn(process.execPath, [DEV_PREVIEW_PATH], {
    cwd: REPO_ROOT,
    env: { ...process.env, PORT: String(targetPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (chunk) => {
    logs += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    logs += chunk.toString();
  });

  const stop = async () => {
    if (child.exitCode !== null || child.killed) return;
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (child.exitCode === null) {
          child.kill('SIGKILL');
        }
        resolve();
      }, 2500);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  };

  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`dev-preview.mjs exited early (${child.exitCode}): ${logs}`);
    }
    if (await isPreviewServerReady(effectiveBaseUrl)) {
      return { baseUrl: effectiveBaseUrl, owned: true, stop };
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  await stop();
  throw new Error(`Timed out waiting for dev-preview.mjs at ${effectiveBaseUrl}. Logs: ${logs}`);
}

export function attachErrorMonitor(page) {
  const errors = [];

  const onPageError = (err) => {
    errors.push({ type: 'pageerror', message: err?.stack || String(err) });
  };
  const onConsole = (msg) => {
    if (msg.type() === 'error') {
      errors.push({ type: 'console.error', message: msg.text() });
    }
  };
  const onResponse = (res) => {
    const status = res.status();
    const url = res.url();
    if (status >= 500 || (status === 404 && !url.includes('favicon'))) {
      errors.push({ type: 'http', status, url });
    }
  };
  const onRequestFailed = (req) => {
    const errText = req.failure()?.errorText || '';
    if (errText === 'net::ERR_ABORTED') return;
    errors.push({ type: 'requestfailed', url: req.url(), message: errText });
  };

  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  page.on('response', onResponse);
  page.on('requestfailed', onRequestFailed);

  return {
    clear() {
      errors.length = 0;
    },
    getErrors() {
      return [...errors];
    },
    assertClean(label = 'page') {
      assert.equal(
        errors.length,
        0,
        `Unexpected runtime/network errors on ${label}:\n${JSON.stringify(errors, null, 2)}`
      );
    },
    detach() {
      page.off('pageerror', onPageError);
      page.off('console', onConsole);
      page.off('response', onResponse);
      page.off('requestfailed', onRequestFailed);
    },
  };
}

export async function waitForAppSettled(page, timeoutMs = 8000) {
  await page.waitForFunction(
    () => {
      const h1 = document.getElementById('main-heading') || document.getElementById('config-error-heading');
      if (!h1) return false;
      const loading = document.querySelectorAll('.skeleton, .startup-loading');
      return loading.length === 0;
    },
    null,
    { timeout: timeoutMs }
  );
}

export async function loginInApp(page, baseUrl, account, initialPath = '/') {
  const targetUrl = `${baseUrl}${initialPath}${initialPath.includes('?') ? '&' : '?'}mock=1`;
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#main-heading').waitFor({ state: 'visible', timeout: 8000 });

  await page.getByLabel('Username or work email').fill(account.username);
  await page.getByRole('textbox', { name: /^Password/i }).fill(account.password);
  await page.getByRole('button', { name: /^Sign in$/i }).click();

  await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 8000 });
  await waitForAppSettled(page);
}

export async function createSessionPage(
  browser,
  baseUrl,
  account = DEMO_ACCOUNTS.ADMIN,
  { viewport = { width: 1440, height: 900 }, reducedMotion = 'no-preference', initialPath = '/' } = {}
) {
  const context = await browser.newContext({
    viewport,
    reducedMotion,
  });
  const page = await context.newPage();
  const monitor = attachErrorMonitor(page);

  if (account) {
    await loginInApp(page, baseUrl, account, initialPath);
  } else {
    const targetUrl = `${baseUrl}${initialPath}${initialPath.includes('?') ? '&' : '?'}mock=1`;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await waitForAppSettled(page);
  }

  return { context, page, monitor };
}

export async function navigateInApp(page, targetPath) {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, '', nextPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, targetPath);
  await waitForAppSettled(page);
}

export async function confirmOpenDialog(page, buttonRegex = /confirm|send|deactivate|reactivate|assign|generate|publish|create|approve|reject|withdraw|record|submit|change|revoke|discard/i) {
  const dialog = page.locator('dialog[open], [role="dialog"]').last();
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  const btn = dialog.getByRole('button', { name: buttonRegex }).last();
  await btn.click();
  await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
}

export async function assertPageHygiene(page, label = 'screen') {
  const result = await page.evaluate(() => {
    const h1 = document.getElementById('main-heading') || document.getElementById('config-error-heading');
    const h1Visible = Boolean(h1 && h1.offsetParent !== null);
    const h1Text = (h1?.textContent || '').trim();
    const bodyText = (document.body?.innerText || '').trim();

    // Standalone "null" or "undefined" tokens from unguarded DOM appends
    const nullMatch = bodyText.match(/(?:^|\s)(null|undefined)(?=\s|$)/);

    const headings = Array.from(document.querySelectorAll('main h1, main h2, main h3, .auth-layout h1, .auth-layout h2'))
      .map((el) => (el.textContent || '').trim())
      .filter(Boolean);
    const rawCodeHeading = headings.find((text) => /\b(?:FDR-\d+|STB-\d+|OD-\d+)\b/.test(text)) || null;

    const storageKeys = {
      localStorage: Object.keys(window.localStorage),
      sessionStorage: Object.keys(window.sessionStorage),
    };

    return {
      h1Visible,
      h1Text,
      bodyLength: bodyText.length,
      nullToken: nullMatch ? nullMatch[1] : null,
      rawCodeHeading,
      storageKeys,
    };
  });

  assert.equal(result.h1Visible, true, `${label}: #main-heading is missing or hidden`);
  assert.ok(result.h1Text.length > 0, `${label}: #main-heading text is empty`);
  assert.ok(result.bodyLength > 15, `${label}: rendered body content is unexpectedly empty`);
  assert.equal(result.nullToken, null, `${label}: literal "${result.nullToken}" found in visible DOM text`);
  assert.equal(
    result.rawCodeHeading,
    null,
    `${label}: raw specification code found in heading: "${result.rawCodeHeading}"`
  );
  assert.equal(
    result.storageKeys.localStorage.length,
    0,
    `${label}: localStorage must remain empty (found keys: ${result.storageKeys.localStorage.join(', ')})`
  );
  assert.equal(
    result.storageKeys.sessionStorage.length,
    0,
    `${label}: sessionStorage must remain empty (found keys: ${result.storageKeys.sessionStorage.join(', ')})`
  );
}

export async function assertNoHorizontalOverflow(page, viewportWidth, label = 'viewport') {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(
    metrics.scrollWidth <= viewportWidth + 1,
    `${label}: horizontal overflow detected (scrollWidth=${metrics.scrollWidth}, viewportWidth=${viewportWidth})`
  );
}

export async function runWcagChecks(page, label = 'page', { expectAuthenticatedShell = true } = {}) {
  const audit = await page.evaluate((authShell) => {
    const mains = document.querySelectorAll('main#main-content');
    const headers = document.querySelectorAll('header.app-header');
    const primaryNavs = document.querySelectorAll('nav[aria-label="Primary"]');
    const nonDialogH1s = Array.from(document.querySelectorAll('main h1, .auth-layout h1')).filter(
      (el) => !el.closest('dialog') && el.offsetParent !== null
    );

    // Heading hierarchy check (no skipped heading levels inside main)
    const headingLevels = Array.from(
      document.querySelectorAll('main h1, main h2, main h3, main h4, .auth-layout h1, .auth-layout h2, .auth-layout h3')
    )
      .filter((el) => el.offsetParent !== null && !el.closest('dialog'))
      .map((el) => Number(el.tagName.slice(1)));
    let skippedHeading = null;
    for (let i = 1; i < headingLevels.length; i += 1) {
      if (headingLevels[i] - headingLevels[i - 1] > 1) {
        skippedHeading = `h${headingLevels[i - 1]} -> h${headingLevels[i]}`;
        break;
      }
    }

    // Form control label association
    const controls = Array.from(document.querySelectorAll('main input, main select, main textarea, .auth-layout input, .auth-layout select, .auth-layout textarea'))
      .filter((el) => el.type !== 'hidden' && el.offsetParent !== null && !el.closest('[hidden]'));
    const unlabeledControls = [];
    for (const ctrl of controls) {
      const id = ctrl.getAttribute('id');
      const hasForLabel = id ? Boolean(document.querySelector(`label[for="${CSS.escape(id)}"]`)) : false;
      const hasParentLabel = Boolean(ctrl.closest('label'));
      const hasAriaLabel = Boolean((ctrl.getAttribute('aria-label') || '').trim());
      const hasAriaLabelledBy = Boolean((ctrl.getAttribute('aria-labelledby') || '').trim());
      if (!hasForLabel && !hasParentLabel && !hasAriaLabel && !hasAriaLabelledBy) {
        unlabeledControls.push(ctrl.name || ctrl.tagName);
      }
    }

    // Non-color-only badges
    const emptyBadges = Array.from(document.querySelectorAll('.badge'))
      .filter((el) => el.offsetParent !== null && !(el.textContent || '').trim())
      .map((el) => el.className);

    // Live regions
    const politeRegion = Boolean(document.querySelector('#sr-status-polite[aria-live="polite"]'));
    const assertiveRegion = Boolean(document.querySelector('#sr-status-assertive[aria-live="assertive"]'));

    // Contrast helper for visible text elements
    function parseRgb(str) {
      const m = String(str || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!m) return null;
      return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: m[4] === undefined ? 1 : Number(m[4]) };
    }
    function relLum(c) {
      const toLin = (x) => {
        const s = x / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * toLin(c.r) + 0.7152 * toLin(c.g) + 0.0722 * toLin(c.b);
    }
    function effectiveBg(el) {
      let cur = el;
      while (cur) {
        const bg = parseRgb(getComputedStyle(cur).backgroundColor);
        if (bg && bg.a > 0.85) return bg;
        cur = cur.parentElement;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    }
    function contrast(fg, bg) {
      const l1 = relLum(fg);
      const l2 = relLum(bg);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    const contrastFailures = [];
    const sampleEls = Array.from(
      document.querySelectorAll('#main-heading, main p, main label, main th, main td, .btn-primary, .btn-secondary')
    ).filter((el) => el.offsetParent !== null && (el.textContent || '').trim().length > 0).slice(0, 40);

    for (const el of sampleEls) {
      const cs = getComputedStyle(el);
      const fg = parseRgb(cs.color);
      const bg = effectiveBg(el);
      if (!fg || !bg) continue;
      const ratio = contrast(fg, bg);
      const fontSize = parseFloat(cs.fontSize || '16');
      const weight = parseInt(cs.fontWeight || '400', 10);
      const isLarge = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
      const minRatio = isLarge ? 3.0 : 4.5;
      if (ratio < minRatio) {
        contrastFailures.push({
          text: (el.textContent || '').trim().slice(0, 40),
          tag: el.tagName,
          ratio: Number(ratio.toFixed(2)),
          minRatio,
        });
      }
    }

    return {
      mainCount: mains.length,
      headerCount: authShell ? headers.length : 1,
      primaryNavCount: authShell ? primaryNavs.length : 1,
      h1Count: nonDialogH1s.length,
      skippedHeading,
      unlabeledControls,
      emptyBadges,
      politeRegion,
      assertiveRegion,
      contrastFailures,
    };
  }, expectAuthenticatedShell);

  assert.equal(audit.mainCount, 1, `${label}: expected exactly 1 <main id="main-content">`);
  assert.equal(audit.headerCount, 1, `${label}: expected exactly 1 <header class="app-header">`);
  assert.equal(audit.primaryNavCount, 1, `${label}: expected exactly 1 Primary <nav>`);
  assert.equal(audit.h1Count, 1, `${label}: expected exactly 1 visible non-dialog <h1>`);
  assert.equal(audit.skippedHeading, null, `${label}: skipped heading level (${audit.skippedHeading})`);
  assert.deepEqual(audit.unlabeledControls, [], `${label}: unlabeled form controls found`);
  assert.deepEqual(audit.emptyBadges, [], `${label}: color-only badge without text found`);
  assert.equal(audit.politeRegion, true, `${label}: missing #sr-status-polite`);
  assert.equal(audit.assertiveRegion, true, `${label}: missing #sr-status-assertive`);
  assert.deepEqual(audit.contrastFailures, [], `${label}: WCAG AA contrast failures`);
}

export class TestSuiteRunner {
  constructor() {
    this.results = [];
  }

  async test(tier, id, name, fn) {
    const start = Date.now();
    try {
      await fn();
      const durationMs = Date.now() - start;
      this.results.push({ tier, id, name, status: 'pass', durationMs, error: null });
      console.log(`  [PASS] ${id} ${name} (${durationMs}ms)`);
    } catch (err) {
      const durationMs = Date.now() - start;
      const message = err?.message || String(err);
      this.results.push({ tier, id, name, status: 'fail', durationMs, error: message });
      console.error(`  [FAIL] ${id} ${name} (${durationMs}ms)\n         ${message.split('\n').join('\n         ')}`);
    }
  }

  summary() {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.status === 'pass').length;
    const failed = this.results.filter((r) => r.status === 'fail').length;
    return { total, passed, failed, results: this.results };
  }
}
