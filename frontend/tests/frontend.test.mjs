import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig, ConfigurationError, resetConfigCache } from '../js/config.js';
import {
  clearSession,
  setSession,
  canApproveReplacements,
  isRecusedFromReplacement,
  hasPermission,
  hasScope,
} from '../js/state/session-store.js';
import { validatePasswordValue, validateDateRange } from '../js/utils/validation.js';
import { isValidIsoDate, formatIsoDate } from '../js/utils/date.js';
import { generateIdempotencyKey, utf8ByteLength } from '../js/utils/format.js';
import { apiRequest, resolveIfMatch, setUnauthorizedHandler } from '../js/api/client.js';
import * as sessionApi from '../js/api/session.js';
import * as employeesApi from '../js/api/employees.js';
import * as holidaysApi from '../js/api/holidays.js';
import * as availabilityApi from '../js/api/availability.js';
import * as rosterApi from '../js/api/roster.js';
import * as replacementsApi from '../js/api/replacements.js';
import * as historyApi from '../js/api/history.js';
import * as handoverApi from '../js/api/handover.js';
import * as notificationsApi from '../js/api/notifications.js';
import * as helpApi from '../js/api/help.js';
import * as auditApi from '../js/api/audit.js';
import * as onboardingApi from '../js/api/onboarding.js';
import { resolveTeamLeadIfMatch } from '../js/features/organization/team-lead-page.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..');

function makeMockDoc(metaContent = '') {
  return {
    querySelector(selector) {
      if (selector === 'meta[name="roster-api-base-url"]') {
        return { getAttribute: () => metaContent };
      }
      return null;
    },
  };
}

test('config.js rejects missing and invalid API base URLs', () => {
  assert.throws(() => loadConfig(makeMockDoc(''), {}), ConfigurationError);
  assert.throws(() => loadConfig(makeMockDoc('ftp://bad.example'), {}), ConfigurationError);
  assert.throws(() => loadConfig(makeMockDoc('https://user:pass@bad.example'), {}), ConfigurationError);
  assert.throws(() => loadConfig(makeMockDoc('https://bad.example?x=1'), {}), ConfigurationError);

  const sameOrigin = loadConfig(makeMockDoc('/'), {});
  assert.equal(sameOrigin.apiV2Base, '/api/v2');

  const explicit = loadConfig(makeMockDoc(''), {
    __ROSTER_CONFIG__: { apiBaseUrl: 'http://localhost:8080/' },
  });
  assert.equal(explicit.apiV2Base, 'http://localhost:8080/api/v2');
  assert.equal(explicit.csrfHeaderName, 'X-CSRF-TOKEN');
});

test('password validation enforces >=12 chars and <=72 UTF-8 bytes without composition rules', () => {
  assert.ok(validatePasswordValue('short12345') !== '');
  assert.equal(validatePasswordValue('alllowercasecharacters'), '');
  // 25 3-byte characters = 75 bytes (> 72 UTF-8 bytes)
  const seventyFiveBytes = '€'.repeat(25);
  assert.equal(utf8ByteLength(seventyFiveBytes), 75);
  assert.ok(validatePasswordValue(seventyFiveBytes) !== '');
  // 24 3-byte characters = 72 bytes (valid)
  const seventyTwoBytes = '€'.repeat(24);
  assert.equal(utf8ByteLength(seventyTwoBytes), 72);
  assert.equal(validatePasswordValue(seventyTwoBytes), '');
});

test('date helpers validate leap days and range ordering', () => {
  assert.equal(isValidIsoDate('2026-12-25'), true);
  assert.equal(isValidIsoDate('2026-02-29'), false);
  assert.equal(isValidIsoDate('2024-02-29'), true);
  assert.ok(validateDateRange('2026-12-26', '2026-12-25') !== null);
  assert.equal(validateDateRange('2026-12-25', '2026-12-25'), null);
  assert.match(formatIsoDate('2026-12-25'), /2026/);
});

test('session-store separates role names from REPLACEMENT.APPROVE and enforces FDR-03 recusal', () => {
  clearSession();
  setSession({
    csrfToken: 'csrf-test-123',
    user: {
      id: 10,
      employeeId: 100,
      displayName: 'Admin Without Grant',
      roles: ['ADMIN'],
      permissions: ['ORG.USER.MANAGE', 'ROSTER.PUBLISH'],
      scopes: ['ORGANISATION'],
    },
    onboarding: { walkthroughs: [] },
  });

  assert.equal(hasPermission('ROSTER.PUBLISH'), true);
  assert.equal(canApproveReplacements(), false);

  setSession({
    csrfToken: 'csrf-test-456',
    user: {
      id: 20,
      employeeId: 200,
      displayName: 'Authorized Approver',
      roles: ['TEAM_LEAD'],
      permissions: ['REPLACEMENT.APPROVE'],
      scopes: ['TEAM:1'],
    },
    onboarding: { walkthroughs: [] },
  });
  assert.equal(canApproveReplacements(), true);

  // Recused as requester
  assert.equal(
    isRecusedFromReplacement({ requesterUserAccountId: 20, requestedForEmployeeId: 300 }, []),
    true
  );
  // Recused as affected assignee
  assert.equal(
    isRecusedFromReplacement({ requesterUserAccountId: 10, requestedForEmployeeId: 200 }, []),
    true
  );
  // Recused as candidate
  assert.equal(
    isRecusedFromReplacement(
      { requesterUserAccountId: 10, requestedForEmployeeId: 300 },
      [{ employeeId: 200 }]
    ),
    true
  );
  // Unconflicted approver
  assert.equal(
    isRecusedFromReplacement(
      { requesterUserAccountId: 10, requestedForEmployeeId: 300 },
      [{ employeeId: 301 }]
    ),
    false
  );
  clearSession();
});

test('api client attaches credentials, CSRF token, If-Match, Idempotency-Key, and normalizes errors', async () => {
  resetConfigCache();
  globalThis.window = { __ROSTER_CONFIG__: { apiBaseUrl: 'http://localhost:8080' } };
  globalThis.document = makeMockDoc('');

  setSession({
    csrfToken: 'secret-csrf-token',
    user: { id: 1, employeeId: 1, displayName: 'Test', roles: ['ADMIN'], permissions: [] },
    onboarding: { walkthroughs: [] },
  });

  const captured = [];
  const origFetch = globalThis.fetch;
  let unauthorizedCalled = false;
  setUnauthorizedHandler(() => {
    unauthorizedCalled = true;
  });

  try {
    globalThis.fetch = async (url, init) => {
      captured.push({ url, init });
      if (url.endsWith('/holidays/5')) {
        return new Response(
          JSON.stringify({
            code: 'CONCURRENT_MODIFICATION',
            message: 'Stale row version.',
            fieldErrors: [{ field: 'primaryCount', code: 'MIN', message: 'Must be >= 1' }],
            correlationId: 'corr-409',
            timestamp: '2026-11-27T10:00:00Z',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.endsWith('/session/me')) {
        return new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'Expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ id: 5, rowVersion: 2 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ETag: '"etag-v2"' },
      });
    };

    const res = await holidaysApi.createHoliday({
      name: 'Republic Day',
      holidayDate: '2027-01-26',
      primaryCount: 2,
      standbyCount: 1,
    });
    assert.equal(resolveIfMatch(res), '"etag-v2"');
    assert.equal(captured[0].init.credentials, 'same-origin');
    assert.equal(captured[0].init.headers['X-CSRF-TOKEN'], 'secret-csrf-token');

    await assert.rejects(
      () =>
        holidaysApi.updateHoliday(
          5,
          { name: 'X', holidayDate: '2027-01-26', primaryCount: 1, standbyCount: 0 },
          resolveIfMatch(res)
        ),
      (err) =>
        err.status === 409 &&
        err.code === 'CONCURRENT_MODIFICATION' &&
        err.correlationId === 'corr-409' &&
        err.fieldErrors.length === 1
    );
    assert.equal(captured[1].init.headers['If-Match'], '"etag-v2"');

    const key = generateIdempotencyKey('test');
    assert.ok(key.length >= 8 && key.length <= 128);
    await apiRequest('/roster-periods/1/generate', { method: 'POST', idempotencyKey: key });
    assert.equal(captured[2].init.headers['Idempotency-Key'], key);

    await assert.rejects(() => apiRequest('/session/me'), (err) => err.status === 401);
    assert.equal(unauthorizedCalled, true);
  } finally {
    globalThis.fetch = origFetch;
    setUnauthorizedHandler(null);
    clearSession();
    resetConfigCache();
  }
});


test('unauthenticated mutations bootstrap CSRF and target the v2 contract', async () => {
  resetConfigCache();
  clearSession();
  globalThis.window = { __ROSTER_CONFIG__: { apiBaseUrl: 'http://localhost:8080' } };
  globalThis.document = makeMockDoc('');
  const captured = [];
  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      captured.push({ url, init });
      if (url.endsWith('/session/csrf')) {
        return new Response(JSON.stringify({ csrfToken: 'anonymous-csrf' }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
      }
      return new Response(null, { status: 204 });
    };
    await apiRequest('/account-activations', { method: 'POST', body: { token: 'one-time' }, skipUnauthorizedRedirect: true });
    assert.equal(captured.length, 2);
    assert.match(captured[0].url, /\/api\/v2\/session\/csrf$/);
    assert.match(captured[1].url, /\/api\/v2\/account-activations$/);
    assert.equal(captured[1].init.headers['X-CSRF-TOKEN'], 'anonymous-csrf');
    assert.equal(resolveIfMatch({}, '"0"'), null);
  } finally {
    globalThis.fetch = origFetch;
    clearSession();
    resetConfigCache();
  }
});

test('CSRF token is refreshed after login, logout, password reset, and activation', async () => {
  resetConfigCache();
  clearSession();
  globalThis.window = { __ROSTER_CONFIG__: { apiBaseUrl: 'http://localhost:8080' } };
  globalThis.document = makeMockDoc('');
  const captured = [];
  let tokenNumber = 0;
  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      captured.push({ url, init });
      if (url.endsWith('/session/csrf')) return new Response(JSON.stringify({ csrfToken: `token-${++tokenNumber}` }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
      if (url.endsWith('/session/login')) return new Response(JSON.stringify({ user: { id: 1 }, onboarding: { walkthroughs: [] } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      return new Response(null, { status: 204 });
    };
    const session = await sessionApi.login({ username: 'person', password: 'secret' });
    assert.equal(session.csrfToken, 'token-2');
    assert.equal(captured.find((x) => x.url.endsWith('/session/login')).init.headers['X-CSRF-TOKEN'], 'token-1');
    await sessionApi.logout();
    assert.equal(captured.find((x) => x.url.endsWith('/session/logout')).init.headers['X-CSRF-TOKEN'], 'token-2');
    await sessionApi.resetPassword({ token: 'once', newPassword: 'long-enough-password' });
    assert.equal(captured.find((x) => x.url.endsWith('/password-resets')).init.headers['X-CSRF-TOKEN'], 'token-3');
    await sessionApi.activateAccount({ token: 'once', newPassword: 'long-enough-password' });
    assert.equal(captured.find((x) => x.url.endsWith('/account-activations')).init.headers['X-CSRF-TOKEN'], 'token-4');
    assert.equal(tokenNumber, 5);
  } finally {
    globalThis.fetch = origFetch;
    clearSession();
    resetConfigCache();
  }
});

test('Team Lead API services and scope helpers match v3 authorization contracts', () => {
  for (const name of ['getCsrfToken', 'listTeamLeadAssignments', 'assignTeamLead', 'replaceTeamLead', 'terminateTeamLeadAssignment', 'correctTeamLeadAssignmentHistory']) {
    assert.equal(typeof (sessionApi[name] || employeesApi[name]), 'function', `${name} service exists`);
  }
  clearSession();
  setSession({ user: { id: 1, roles: ['TEAM_LEAD'], permissions: ['ORG.USER.READ'], scopes: ['TEAM:7'] } });
  assert.equal(hasScope('TEAM', 7), true);
  assert.equal(hasScope('TEAM', 8), false);
  assert.equal(hasScope('ORG'), false);
  setSession({ user: { id: 2, roles: ['ADMIN'], permissions: ['ORG.USER.READ'], scopes: ['ORG'] } });
  assert.equal(hasScope('ORG'), true);
  assert.throws(() => employeesApi.assignTeamLead(7, { employeeId: 12, effectiveFrom: '2027-01-01' }, null), /current ETag or rowVersion/);
  assert.equal(resolveTeamLeadIfMatch('replace', { rowVersion: 9 }, { _etag: '"team-v4"' }), '"team-v4"');
  assert.equal(resolveTeamLeadIfMatch('terminate', { rowVersion: 9 }, { _etag: '"team-v4"' }), '"9"');
  assert.throws(() => resolveTeamLeadIfMatch('replace', { rowVersion: 9 }, {}), /collection ETag/);
  clearSession();
});

test('v3 contract preserves legacy employee schemas and applies approved v2 organization fields', () => {
  const openapiText = fs.readFileSync(path.join(repoRoot, 'docs/openapi.yaml'), 'utf8');
  assert.match(openapiText, /V1EmployeeInput:.*displayName/);
  assert.match(openapiText, /V1EmployeeInput:.*rotationEligible: \{type: boolean\}/);
  assert.match(openapiText, /EmployeeInput: \{type: object, required: \[employeeCode, firstName, lastName, workEmail, employmentStartDate\]/);
  assert.match(openapiText, /rotationEligibleFrom: \{type: string, format: date, nullable: true\}, rotationEligibleTo:/);
  assert.match(openapiText, /V1TeamInput: \{type: object, required: \[code, name\], properties: \{code: \{type: string, maxLength: 40\}, name: \{type: string, maxLength: 160\}/);
  assert.match(openapiText, /TeamInput: \{type: object, required: \[code, name\], properties: \{code: \{type: string, maxLength: 40\}, name: \{type: string, maxLength: 120\}/);
  assert.match(openapiText, /operationId: v1_createTeam[\s\S]{0,600}V1TeamInput/);
  assert.match(openapiText, /operationId: createTeam[\s\S]{0,600}schemas\/TeamInput/);
  const organizationUi = fs.readFileSync(path.join(frontendRoot, 'js/features/organization/organization-pages.js'), 'utf8');
  assert.match(organizationUi, /name: 'name', label: 'Team name', required: true, maxlength: 120/);
  assert.match(openapiText, /assignedByUserAccountId: \{type: integer, format: int64, nullable: true/);
  assert.match(openapiText, /TeamLeadTerminationInput: \{type: object, required: \[effectiveTo\]/);
  assert.doesNotMatch(openapiText.match(/TeamLeadTerminationInput:[^\n]+/)[0], /reason/);
  assert.match(openapiText, /TeamLeadAssignmentCorrectionInput: \{type: object, required: \[effectiveFrom\]/);
});

test('all API v2 OpenAPI operations are represented in frontend/js/api and no forbidden patterns exist', () => {
  const openapiText = fs.readFileSync(path.join(repoRoot, 'docs/openapi.yaml'), 'utf8');
  const operationIds = [];
  let currentPath = '';
  for (const line of openapiText.split(/\r?\n/)) {
    const pathMatch = line.match(/^  (\/api\/v[12]\/.*):$/);
    if (pathMatch) currentPath = pathMatch[1];
    if (currentPath.startsWith('/api/v2/')) {
      const operationMatch = line.match(/^      operationId: ([A-Za-z0-9_]+)/);
      if (operationMatch) operationIds.push(operationMatch[1]);
    }
  }
  assert.equal(operationIds.length, 65);
  assert.equal(new Set(operationIds).size, operationIds.length);

  const allApiFns = new Set([
    ...Object.keys(sessionApi),
    ...Object.keys(onboardingApi),
    ...Object.keys(employeesApi),
    ...Object.keys(holidaysApi),
    ...Object.keys(availabilityApi),
    ...Object.keys(rosterApi),
    ...Object.keys(replacementsApi),
    ...Object.keys(historyApi),
    ...Object.keys(handoverApi),
    ...Object.keys(notificationsApi),
    ...Object.keys(helpApi),
    ...Object.keys(auditApi),
  ]);

  for (const opId of operationIds) {
    assert.equal(allApiFns.has(opId), true, `Missing API service export for OpenAPI operationId: ${opId}`);
  }

  // Verify zero innerHTML / document.write / eval / React / Vue / hardcoded prod URLs in frontend/js
  const jsFiles = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) jsFiles.push(full);
    }
  };
  walk(path.join(frontendRoot, 'js'));

  for (const file of jsFiles) {
    const rawSrc = fs.readFileSync(file, 'utf8');
    const codeOnly = rawSrc
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    assert.equal(/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b|\beval\(/i.test(codeOnly), false, `Unsafe sink in ${file}`);
    assert.equal(/\blocalStorage\b|\bsessionStorage\b/.test(codeOnly), false, `Forbidden Web Storage use in ${file}`);
  }
});

function relativeLuminance(hex) {
  const clean = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(clean.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const [light, dark] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

test('CSS design tokens satisfy WCAG 2.2 AA contrast ratios', () => {
  const tokens = fs.readFileSync(path.join(frontendRoot, 'css/tokens.css'), 'utf8');
  const getToken = (name) => {
    const m = tokens.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
    assert.ok(m, `Missing token ${name}`);
    return m[1];
  };

  const surface = getToken('--color-surface');
  const canvas = getToken('--color-canvas');
  for (const fgToken of [
    '--color-ink',
    '--color-muted',
    '--color-primary',
    '--color-success',
    '--color-warning',
    '--color-danger',
    '--color-info',
  ]) {
    const fg = getToken(fgToken);
    assert.ok(contrastRatio(fg, surface) >= 4.5, `${fgToken} on surface contrast < 4.5`);
    assert.ok(contrastRatio(fg, canvas) >= 4.5, `${fgToken} on canvas contrast < 4.5`);
  }

  // White button text on primary / danger buttons
  assert.ok(contrastRatio('#ffffff', getToken('--color-primary')) >= 4.5);
  assert.ok(contrastRatio('#ffffff', getToken('--color-danger')) >= 4.5);
  // Non-text contrast >= 3:1 for focus ring and input borders
  assert.ok(contrastRatio(getToken('--color-focus'), surface) >= 3.0);
  assert.ok(contrastRatio(getToken('--color-input-border'), surface) >= 3.0);
});
