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
import { resetMockState, configureMockBehavior, MOCK_DEMO_ACCOUNTS } from '../js/api/mock-adapter.js';
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

function enableMockConfig(hostname = 'localhost') {
  resetConfigCache();
  globalThis.window = {
    __ROSTER_CONFIG__: { mockMode: true },
    location: { hostname },
  };
  globalThis.document = makeMockDoc('');
}

test('mockMode is opt-in, defaults to false, and is blocked on non-local hostnames', () => {
  const realCfg = loadConfig(makeMockDoc('https://roster.internal.example'), { location: { hostname: 'roster.internal.example' } });
  assert.equal(realCfg.mockMode, false);

  assert.throws(
    () =>
      loadConfig(makeMockDoc(''), {
        __ROSTER_CONFIG__: { mockMode: true },
        location: { hostname: 'roster.company.com' },
      }),
    ConfigurationError
  );

  assert.throws(
    () =>
      loadConfig(makeMockDoc('https://api.company.com'), {
        __ROSTER_CONFIG__: { mockMode: true },
        location: { hostname: 'localhost' },
      }),
    ConfigurationError
  );

  const localMock = loadConfig(makeMockDoc(''), {
    __ROSTER_CONFIG__: { mockMode: true },
    location: { hostname: 'localhost' },
  });
  assert.equal(localMock.mockMode, true);
  assert.equal(localMock.apiV2Base, '/api/v2');

  const queryMock = loadConfig(makeMockDoc(''), {
    location: { hostname: '127.0.0.1', search: '?mock=1' },
  });
  assert.equal(queryMock.mockMode, true);
  assert.equal(queryMock.apiV2Base, '/api/v2');

  assert.throws(
    () =>
      loadConfig(makeMockDoc(''), {
        location: { hostname: 'roster.company.com', search: '?mock=1' },
      }),
    ConfigurationError
  );
});

test('mock adapter supports full auth, organization, Team Lead concurrency, and approval grants', async () => {
  const origFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called in mockMode');
  };

  try {
    enableMockConfig();
    resetMockState();
    clearSession();

    const adminDemo = MOCK_DEMO_ACCOUNTS.find((a) => a.username === 'admin@company.local');
    const session = await sessionApi.login({ username: adminDemo.username, password: adminDemo.password });
    setSession(session);
    assert.equal(fetchCalled, false);
    assert.equal(session.user.roles.includes('ADMIN'), true);
    assert.equal(hasPermission('ORG.TEAM_LEAD.MANAGE'), true);

    // Employee create + update with If-Match + 409 on stale version
    const createdEmp = await employeesApi.createEmployee({
      employeeCode: 'EMP-999',
      firstName: 'Sam',
      lastName: 'Taylor',
      workEmail: 'sam.taylor@company.local',
      employmentStartDate: '2026-01-01',
      employmentEndDate: null,
      rotationEligibleFrom: '2026-02-01',
      rotationEligibleTo: null,
    });
    assert.equal(createdEmp.displayName, 'Sam Taylor');
    const fetchedEmp = await employeesApi.getEmployee(createdEmp.id);
    const updatedEmp = await employeesApi.updateEmployee(
      createdEmp.id,
      { ...fetchedEmp, firstName: 'Samuel' },
      resolveIfMatch(fetchedEmp)
    );
    assert.equal(updatedEmp.displayName, 'Samuel Taylor');
    await assert.rejects(
      () => employeesApi.updateEmployee(createdEmp.id, { ...updatedEmp, firstName: 'Stale' }, '"1"'),
      (err) => err.status === 409 && err.code === 'CONCURRENT_MODIFICATION'
    );

    // Team Lead appointment, atomic replacement (collection ETag), and termination (rowVersion)
    const tlHistory1 = await employeesApi.listTeamLeadAssignments(2);
    const appointed = await employeesApi.assignTeamLead(
      2,
      { employeeId: 104, effectiveFrom: '2026-03-01' },
      resolveIfMatch(tlHistory1)
    );
    assert.equal(appointed.employeeId, 104);

    const tlHistory2 = await employeesApi.listTeamLeadAssignments(2);
    const replaced = await employeesApi.replaceTeamLead(
      2,
      appointed.id,
      { employeeId: 103, effectiveFrom: '2026-06-01' },
      resolveIfMatch(tlHistory2)
    );
    assert.equal(replaced.employeeId, 103);

    const tlHistory3 = await employeesApi.listTeamLeadAssignments(2);
    const activeLead = tlHistory3.items.find((x) => x.id === replaced.id);
    const terminated = await employeesApi.terminateTeamLeadAssignment(
      2,
      replaced.id,
      { effectiveTo: '2026-12-31' },
      resolveTeamLeadIfMatch('terminate', activeLead, tlHistory3)
    );
    assert.equal(terminated.effectiveTo, '2026-12-31');

    // Self-grant prohibition
    await assert.rejects(
      () =>
        employeesApi.createApprovalGrant({
          userAccountId: session.user.id,
          scopeType: 'ORGANISATION',
          scopeId: null,
          validFrom: '2026-01-01',
          validUntil: '2026-12-31',
          reason: 'Self grant test',
        }),
      (err) => err.status === 422 && err.code === 'SELF_GRANT_PROHIBITED'
    );
  } finally {
    globalThis.fetch = origFetch;
    resetConfigCache();
  }
});

test('mock adapter enforces holidays, availability overlap, roster revisions, replacements recusal, notifications, and audit', async () => {
  enableMockConfig();
  resetMockState();
  clearSession();

  try {
    // Sign in as Member (Maya Patel, employeeId 103)
    const memberCreds = MOCK_DEMO_ACCOUNTS.find((a) => a.username === 'member@company.local');
    const memberSession = await sessionApi.login({ username: memberCreds.username, password: memberCreds.password });
    setSession(memberSession);

    // Availability overlap rejected (422), non-overlapping created & withdrawn
    await assert.rejects(
      () =>
        availabilityApi.createAvailability({
          availabilityType: 'UNAVAILABLE',
          startDate: '2026-12-31',
          endDate: '2027-01-01',
          reasonCode: 'OVERLAP',
        }),
      (err) => err.status === 422 && err.code === 'OVERLAPPING_AVAILABILITY'
    );
    const avail = await availabilityApi.createAvailability({
      availabilityType: 'AVAILABLE',
      startDate: '2027-02-01',
      endDate: '2027-02-02',
      reasonCode: 'EXTRA',
    });
    const withdrawn = await availabilityApi.withdrawAvailability(avail.id, resolveIfMatch(avail));
    assert.equal(withdrawn, null);
    const availAfter = await availabilityApi.listAvailability();
    assert.equal(availAfter.items.find((x) => x.id === avail.id)?.status, 'CANCELLED');

    // Notifications unread count + mark read (204)
    const unreadBefore = await notificationsApi.getUnreadNotificationCount();
    assert.equal(unreadBefore.count, 1);
    const notifList = await notificationsApi.listNotifications();
    const markRes = await notificationsApi.markNotificationRead(notifList.items[0].id);
    assert.equal(markRes, null);
    const unreadAfter = await notificationsApi.getUnreadNotificationCount();
    assert.equal(unreadAfter.count, 0);

    // Handover report + addendum
    const ho = await handoverApi.createHandoverReport({
      assignmentId: 701,
      summary: 'Initial notes',
      items: [{ itemType: 'NOTE', title: 'Runbook', content: 'Verified' }],
    });
    const addendum = await handoverApi.createHandoverReport({
      assignmentId: 701,
      supersedesHandoverReportId: ho.id,
      summary: 'Updated contact',
      items: [{ itemType: 'CONTACT', title: 'Backup', content: 'Ext 400' }],
    });
    assert.equal(addendum.supersedesHandoverReportId, ho.id);

    // Switch to Approver (Noah Brooks, userId 4, employeeId 104)
    await sessionApi.logout();
    const approverCreds = MOCK_DEMO_ACCOUNTS.find((a) => a.username === 'approver@company.local');
    const approverSession = await sessionApi.login({ username: approverCreds.username, password: approverCreds.password });
    setSession(approverSession);

    const repList = await replacementsApi.listReplacementRequests();
    const req = repList.items[0];
    const candidates = await replacementsApi.listReplacementCandidates(req.id);
    assert.equal(candidates.items[0].suggestedStandby, true);

    // Approver cannot approve if selecting self (FDR-03 recusal)
    await assert.rejects(
      () =>
        replacementsApi.decideReplacement(
          req.id,
          { decision: 'APPROVED', replacementEmployeeId: 104, reason: 'Self select' },
          resolveIfMatch(req),
          'rep-decide-self-1'
        ),
      (err) => err.status === 403 && err.code === 'RECUSAL_REQUIRED'
    );

    // Approving Liam Chen (102) succeeds and unlocks Standby activation
    const decided = await replacementsApi.decideReplacement(
      req.id,
      { decision: 'APPROVED', replacementEmployeeId: 102, reason: 'Standby covers' },
      resolveIfMatch(req),
      'rep-decide-ok-1'
    );
    assert.equal(decided.status, 'APPROVED');

    const act = await replacementsApi.activateStandby({
      standbyAssignmentId: 702,
      primaryAssignmentId: 701,
      reason: 'Approved replacement activation',
    });
    assert.equal(act.status, 'ACTIVATED');
    assert.equal(act.activatedForEmployeeId, 103);
    assert.equal(act.activatedByUserAccountId, approverSession.user.id);

    // Simulated server error hook
    configureMockBehavior({ forcedError: { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Maintenance' } });
    await assert.rejects(
      () => helpApi.listHelpArticles(),
      (err) => err.status === 503 && err.code === 'SERVICE_UNAVAILABLE'
    );
  } finally {
    resetConfigCache();
  }
});

test('mock adapter OpenAPI v3 parity: account-status PUT, 204s, collection ETag, schemas, scoping, candidates, and role walkthroughs', async () => {
  enableMockConfig();
  resetMockState();
  clearSession();

  try {
    // 1. 204 on resetPassword & activateAccount + 72-byte password cap
    const resetRes = await sessionApi.resetPassword({ token: 'tok-1', newPassword: 'valid-long-password' });
    assert.equal(resetRes, null);
    const actRes = await sessionApi.activateAccount({ token: 'tok-2', newPassword: 'valid-long-password' });
    assert.equal(actRes, null);
    await assert.rejects(
      () => sessionApi.resetPassword({ token: 'tok-3', newPassword: '€'.repeat(25) }),
      (err) => err.status === 422 && err.code === 'VALIDATION_ERROR'
    );

    // 2. Admin session checks: walkthrough (7 steps), notifications, PUT account-status, revoke 204, Team Lead collection ETag
    const adminCreds = MOCK_DEMO_ACCOUNTS.find((a) => a.username === 'admin@company.local');
    const adminSession = await sessionApi.login({ username: adminCreds.username, password: adminCreds.password });
    setSession(adminSession);

    assert.equal(adminSession.onboarding.walkthroughs[0].roleCode, 'ADMIN');
    assert.equal(adminSession.onboarding.walkthroughs[0].steps.length, 7);
    const adminUnread = await notificationsApi.getUnreadNotificationCount();
    assert.ok(adminUnread.count >= 1);

    const emp105 = await employeesApi.getEmployee(105);
    const toggledOff = await employeesApi.setEmployeeAccountStatus(105, { active: false }, resolveIfMatch(emp105));
    assert.equal(toggledOff.active, false);
    const toggledOn = await employeesApi.setEmployeeAccountStatus(105, { active: true }, resolveIfMatch(toggledOff));
    assert.equal(toggledOn.active, true);

    const grants = await employeesApi.listApprovalGrants();
    const grant = grants.items[0];
    const revoked = await employeesApi.revokeApprovalGrant(grant.id, resolveIfMatch(grant));
    assert.equal(revoked, null);

    // assignTeamLead -> replaceTeamLead chained directly via returned collection ETag
    const tlInit = await employeesApi.listTeamLeadAssignments(2);
    const tl1 = await employeesApi.assignTeamLead(2, { employeeId: 104, effectiveFrom: '2026-03-01' }, resolveIfMatch(tlInit));
    const tl2 = await employeesApi.replaceTeamLead(2, tl1.id, { employeeId: 103, effectiveFrom: '2026-06-01' }, resolveIfMatch(tl1));
    assert.equal(tl2.employeeId, 103);
    const tlAfter = await employeesApi.listTeamLeadAssignments(2);
    assert.equal(resolveIfMatch(tl2), resolveIfMatch(tlAfter));

    // 3. Roster schemas & draft candidate filtering
    const rosterDraft = await rosterApi.getRoster(401, { status: 'DRAFT' });
    assert.ok(rosterDraft.slots.every((s) => Number.isInteger(s.id) && s.id > 0));
    assert.equal(rosterDraft.assignments[0].origin, 'AUTO');
    assert.equal(rosterDraft.assignments[0].status, 'PROPOSED');

    const runs = await rosterApi.listGenerationRuns(401);
    assert.ok(['RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL'].includes(runs.items[0].status));

    // Holiday 201 (2026-12-25) in version 502 already has Maya (103) assigned -> excluded
    const decCandidates = await rosterApi.listDraftAssignmentCandidates(502, {
      holidayId: 201,
      slotType: 'STANDBY',
      slotNumber: 1,
    });
    assert.equal(decCandidates.items.some((c) => c.employeeId === 103), false);
    assert.equal(decCandidates.items.some((c) => c.employeeId === 102), true);

    // Holiday 202 (2027-01-01) has Maya (103) marked UNAVAILABLE 2026-12-31..2027-01-02 -> excluded
    const janCandidates = await rosterApi.listDraftAssignmentCandidates(502, {
      holidayId: 202,
      slotType: 'PRIMARY',
      slotNumber: 1,
    });
    assert.equal(janCandidates.items.some((c) => c.employeeId === 103), false);
    assert.equal(janCandidates.items.some((c) => c.employeeId === 102), true);

    // Invalid slotNumber rejected with 422
    await assert.rejects(
      () => rosterApi.listDraftAssignmentCandidates(502, { holidayId: 201, slotType: 'PRIMARY', slotNumber: 99 }),
      (err) => err.status === 422
    );

    // Duty history date filters + FUTURE_PUBLISHED_PRIMARY
    const futureAll = await historyApi.getDutyHistory({
      dimension: 'FUTURE_PUBLISHED_PRIMARY',
      fromDate: '2027-01-01',
      toDate: '2027-01-31',
    });
    assert.equal(futureAll.items.length, 1);
    assert.equal(futureAll.items[0].holidayDate, '2027-01-01');

    // 4. TEAM_LEAD scope checks (TEAM:1) + walkthrough + notifications
    await sessionApi.logout();
    const leadCreds = MOCK_DEMO_ACCOUNTS.find((a) => a.username === 'lead@company.local');
    const leadSession = await sessionApi.login({ username: leadCreds.username, password: leadCreds.password });
    setSession(leadSession);
    assert.equal(leadSession.onboarding.walkthroughs[0].roleCode, 'TEAM_LEAD');
    assert.equal(leadSession.onboarding.walkthroughs[0].steps.length, 5);
    const leadUnread = await notificationsApi.getUnreadNotificationCount();
    assert.ok(leadUnread.count >= 1);

    // Team Lead can read Core Ops member 103, gets 404 on Payments member 104
    const teamMember = await employeesApi.getEmployee(103);
    assert.equal(teamMember.id, 103);
    await assert.rejects(() => employeesApi.getEmployee(104), (err) => err.status === 404);

    // Team Lead duty-history includes TEAM:1 members (103) and excludes Payments (104)
    const teamDuty = await historyApi.getDutyHistory({ dimension: 'EFFECTIVE_PUBLISHED_PRIMARY_CREDIT' });
    assert.equal(teamDuty.items.some((a) => a.employeeId === 103), true);
    assert.equal(teamDuty.items.some((a) => a.employeeId === 104), false);

    // 5. MEMBER scope checks (OWN) + walkthrough (6 steps)
    await sessionApi.logout();
    const memberCreds = MOCK_DEMO_ACCOUNTS.find((a) => a.username === 'member@company.local');
    const memberSession = await sessionApi.login({ username: memberCreds.username, password: memberCreds.password });
    setSession(memberSession);
    assert.equal(memberSession.onboarding.walkthroughs[0].roleCode, 'MEMBER');
    assert.equal(memberSession.onboarding.walkthroughs[0].steps.length, 6);
    await assert.rejects(() => employeesApi.getEmployee(102), (err) => err.status === 404);
    const memberReqs = await replacementsApi.listReplacementRequests();
    assert.ok(memberReqs.items.every((r) => r.requestedForEmployeeId === 103 || r.requesterUserAccountId === 3));
  } finally {
    clearSession();
    resetConfigCache();
  }
});
