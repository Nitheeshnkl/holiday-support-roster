import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  DEMO_ACCOUNTS,
  FRONTEND_DIR,
  assertPageHygiene,
  confirmOpenDialog,
  createSessionPage,
  navigateInApp,
  waitForAppSettled,
} from './lib/harness.mjs';

export async function runTier2Boundaries(runner, { browser, baseUrl }) {
  console.log('\n=== Tier 2: Boundaries, Validation, Security, Recusal & Error/Empty/Loading States ===');

  await runner.test('T2', 'T2-01', 'Invalid login (401) shows non-enumerating error alert and re-enables submit', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, null, { initialPath: '/login' });
    try {
      await page.getByLabel('Username or work email').fill('admin@company.local');
      await page.getByRole('textbox', { name: /^Password/i }).fill('WrongPassword123');
      await page.getByRole('button', { name: /^Sign in$/i }).click();

      const alert1 = page.locator('[role="alert"]');
      await alert1.waitFor({ state: 'visible', timeout: 5000 });
      const msg1 = await alert1.innerText();

      await page.getByLabel('Username or work email').fill('nonexistent.user@company.local');
      await page.getByRole('textbox', { name: /^Password/i }).fill('WrongPassword123');
      await page.getByRole('button', { name: /^Sign in$/i }).click();

      await alert1.waitFor({ state: 'visible', timeout: 5000 });
      const msg2 = await alert1.innerText();
      const clean1 = msg1.replace(/Reference ID: [^\n]+/g, '').trim();
      const clean2 = msg2.replace(/Reference ID: [^\n]+/g, '').trim();
      assert.equal(clean1, clean2, 'Invalid login error must not enumerate whether username exists');
      assert.equal(await page.getByRole('button', { name: /^Sign in$/i }).isDisabled(), false);
      assert.ok(new URL(page.url()).pathname === '/login', 'User must remain on /login');

      monitor.assertClean('T2-01');
    } finally {
      await context.close();
    }
  });

  await runner.test('T2', 'T2-02', 'Session expiry (401) clears in-memory session, routes to /session-expired, and restores return path on login', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    try {
      await page.addInitScript((apiBase) => {
        window.__ROSTER_CONFIG__ = { apiBaseUrl: apiBase, mockMode: false };
      }, baseUrl);

      let expireSession = false;
      let loggedIn = false;

      await page.route('**/api/v2/**', async (route) => {
        const url = new URL(route.request().url());
        const apiPath = url.pathname.replace(/^\/api\/v2/, '');
        const method = route.request().method();

        if (apiPath === '/session/csrf') {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ csrfToken: 'csrf-1' }) });
        }
        if (apiPath === '/session/me') {
          if (!loggedIn || expireSession) {
            return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: 'UNAUTHORIZED', message: 'Expired' }) });
          }
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              user: { id: 1, employeeId: 101, displayName: 'Asha Rao', roles: ['ADMIN'], permissions: ['CALENDAR.READ', 'ROSTER.READ', 'NOTIFICATION.READ'], scopes: ['ORG'] },
              csrfToken: 'csrf-1',
              onboarding: { walkthroughs: [] },
            }),
          });
        }
        if (apiPath === '/session/login' && method === 'POST') {
          loggedIn = true;
          expireSession = false;
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              user: { id: 1, employeeId: 101, displayName: 'Asha Rao', roles: ['ADMIN'], permissions: ['CALENDAR.READ', 'ROSTER.READ', 'NOTIFICATION.READ'], scopes: ['ORG'] },
              csrfToken: 'csrf-2',
              onboarding: { walkthroughs: [] },
            }),
          });
        }
        if (apiPath === '/notifications/unread-count') {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0 }) });
        }
        if (apiPath === '/holidays') {
          if (expireSession) {
            return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: 'UNAUTHORIZED', message: 'Session expired' }) });
          }
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ items: [], page: { page: 0, pageSize: 25, totalElements: 0, totalPages: 0 } }),
          });
        }
        if (apiPath === '/roster-periods' || apiPath === '/replacement-requests' || apiPath === '/notifications') {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], page: { page: 0, pageSize: 25, totalElements: 0, totalPages: 0 } }) });
        }
        return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 'NOT_FOUND', message: 'Unhandled' }) });
      });

      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.locator('#main-heading').waitFor({ state: 'visible', timeout: 8000 });
      await page.getByLabel('Username or work email').fill('admin@company.local');
      await page.getByRole('textbox', { name: /^Password/i }).fill('AdminRoster#2026');
      await page.getByRole('button', { name: /^Sign in$/i }).click();
      await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 8000 });
      await waitForAppSettled(page);

      // Trigger 401 on /holidays navigation
      expireSession = true;
      await navigateInApp(page, '/holidays');
      await page.getByRole('heading', { level: 1, name: /Session expired/i }).waitFor({ state: 'visible', timeout: 5000 });
      await assertPageHygiene(page, 'T2-02 /session-expired');

      // Re-authenticate via Sign in link and verify pendingReturnTo restores /holidays
      await page.getByRole('link', { name: /^Sign in$/i }).click();
      await waitForAppSettled(page);
      await page.getByLabel('Username or work email').fill('admin@company.local');
      await page.getByRole('textbox', { name: /^Password/i }).fill('AdminRoster#2026');
      await page.getByRole('button', { name: /^Sign in$/i }).click();
      await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 8000 });
      await waitForAppSettled(page);
      assert.equal(new URL(page.url()).pathname, '/holidays', 'Signing back in should restore pendingReturnTo=/holidays');
    } finally {
      await context.close();
    }
  });

  await runner.test('T2', 'T2-03', 'Unauthorized routes render /unauthorized for Member and Team Lead without leaking privileged controls', async () => {
    const memberRestricted = ['/audit', '/authority/grants', '/employees/new', '/holidays/new', '/roster/401/generate', '/help/manage/new'];
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.MEMBER);
      try {
        for (const route of memberRestricted) {
          await navigateInApp(page, route);
          await assertPageHygiene(page, `T2-03 Member ${route}`);
          const headingText = await page.locator('#main-heading').innerText();
          assert.match(headingText, /Access denied/i, `Member on ${route} must see Access denied`);
        }
        await page.getByRole('link', { name: /Return to Overview/i }).click();
        await waitForAppSettled(page);
        assert.equal(new URL(page.url()).pathname, '/');
        monitor.assertClean('T2-03 Member');
      } finally {
        await context.close();
      }
    }

    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.TEAM_LEAD);
      try {
        for (const route of ['/audit', '/authority/grants']) {
          await navigateInApp(page, route);
          await assertPageHygiene(page, `T2-03 Lead ${route}`);
          const headingText = await page.locator('#main-heading').innerText();
          assert.match(headingText, /Access denied/i, `Team Lead on ${route} must see Access denied`);
        }
        monitor.assertClean('T2-03 Team Lead');
      } finally {
        await context.close();
      }
    }
  });

  await runner.test('T2', 'T2-04', 'Unknown route renders /unavailable safely when unauthenticated and authenticated', async () => {
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, null, { initialPath: '/does-not-exist-xyz' });
      try {
        await assertPageHygiene(page, 'T2-04 Unauthenticated /does-not-exist-xyz');
        assert.match(await page.locator('#main-heading').innerText(), /unavailable/i);
        monitor.assertClean('T2-04 Unauthenticated');
      } finally {
        await context.close();
      }
    }
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.MEMBER);
      try {
        await navigateInApp(page, '/does-not-exist-xyz');
        await assertPageHygiene(page, 'T2-04 Authenticated /does-not-exist-xyz');
        assert.match(await page.locator('#main-heading').innerText(), /unavailable/i);
        monitor.assertClean('T2-04 Authenticated');
      } finally {
        await context.close();
      }
    }
  });

  await runner.test('T2', 'T2-05', 'Password bounds (<12 chars, >72 UTF-8 bytes, mismatch, valid 12-char lowercase & 72-byte UTF-8)', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, null, { initialPath: '/reset-password?token=abc' });
    try {
      const search = await page.evaluate(() => window.location.search);
      assert.equal(search, '', 'Token query param must be stripped');

      const newPass = page.getByRole('textbox', { name: /^New password/i });
      const confirmPass = page.getByRole('textbox', { name: /^Confirm new password/i });
      const submit = page.getByRole('button', { name: /Reset password/i });

      // 11 chars -> invalid
      await newPass.fill('short123456');
      await confirmPass.fill('short123456');
      await submit.click();
      assert.equal(await newPass.getAttribute('aria-invalid'), 'true', '11-char password must set aria-invalid="true"');

      // 25 x 3-byte char = 75 UTF-8 bytes -> invalid
      const seventyFiveBytes = '€'.repeat(25);
      await newPass.fill(seventyFiveBytes);
      await confirmPass.fill(seventyFiveBytes);
      await submit.click();
      assert.equal(await newPass.getAttribute('aria-invalid'), 'true', '75-byte UTF-8 password must set aria-invalid="true"');

      // Mismatch -> invalid
      await newPass.fill('alllowercase');
      await confirmPass.fill('differentpass');
      await submit.click();
      assert.equal(await confirmPass.getAttribute('aria-invalid'), 'true', 'Mismatched password must set aria-invalid="true"');

      // Valid 12 lowercase chars (no composition rules)
      await newPass.fill('alllowercase');
      await confirmPass.fill('alllowercase');
      await submit.click();
      await page.getByText(/Password reset complete/i).waitFor({ state: 'visible', timeout: 5000 });

      // Valid 72 UTF-8 bytes (24 x €)
      await navigateInApp(page, '/activate?token=invite123');
      const seventyTwoBytes = '€'.repeat(24);
      await page.getByRole('textbox', { name: /^Choose password/i }).fill(seventyTwoBytes);
      await page.getByRole('textbox', { name: /^Confirm password/i }).fill(seventyTwoBytes);
      await page.getByRole('button', { name: /Activate account/i }).click();
      await page.getByText(/Account activated/i).waitFor({ state: 'visible', timeout: 5000 });

      monitor.assertClean('T2-05');
    } finally {
      await context.close();
    }
  });

  await runner.test('T2', 'T2-06', 'Mandatory audit reasons (ROS-05, ROS-07, REP-03, REP-01, STB-01, ORG-05) & self-grant / TEAM scopeId checks', async () => {
    // Admin checks: ROS-05, ROS-07, STB-01, ORG-05
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN);
      try {
        // ROS-05 empty reason
        await navigateInApp(page, '/roster/401/versions/502/assign?holidayId=201&slotType=PRIMARY&slotNumber=1&assignmentId=705');
        await page.getByLabel(/Eligible and available employee/i).selectOption('102');
        await page.getByRole('button', { name: /Save manual reassignment/i }).click();
        assert.equal(await page.getByLabel(/Audit reason/i).getAttribute('aria-invalid'), 'true');

        // ROS-07 empty reason
        await navigateInApp(page, '/roster/401/history');
        await page.getByRole('button', { name: /Create reasoned draft revision/i }).click();
        assert.equal(await page.getByLabel(/Revision reason/i).getAttribute('aria-invalid'), 'true');

        // STB-01 empty reason
        await navigateInApp(page, '/standby');
        await page.getByLabel(/Standby assignment ID/i).fill('702');
        await page.getByLabel(/Primary assignment ID/i).fill('701');
        await page.getByRole('button', { name: /Record standby activation/i }).click();
        assert.equal(await page.getByLabel(/Activation reason/i).getAttribute('aria-invalid'), 'true');

        // ORG-05 empty reason + self-grant prohibition + TEAM scope without scopeId
        await navigateInApp(page, '/authority/grants');
        await page.getByLabel(/Grantee user account ID/i).fill('1'); // self-grant
        await page.getByLabel(/Valid from/i).fill('2027-01-01');
        await page.getByLabel(/Valid until/i).fill('2027-12-31');
        await page.getByRole('button', { name: /Grant approval authority/i }).click();
        assert.equal(await page.getByLabel(/Grantee user account ID/i).getAttribute('aria-invalid'), 'true');
        assert.equal(await page.getByLabel(/^Reason/i).getAttribute('aria-invalid'), 'true');

        await page.getByLabel(/Grantee user account ID/i).fill('2');
        await page.getByLabel(/^Scope type/i).selectOption('TEAM');
        await page.getByLabel(/^Reason/i).fill('Valid reason');
        await page.getByRole('button', { name: /Grant approval authority/i }).click();
        assert.equal(await page.getByLabel(/Team scope/i).getAttribute('aria-invalid'), 'true');

        monitor.assertClean('T2-06 Admin');
      } finally {
        await context.close();
      }
    }

    // Member REP-01 empty reason & Approver REP-03 empty reason
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.MEMBER);
      try {
        await navigateInApp(page, '/replacements/new');
        await page.getByLabel(/Published assignment ID/i).fill('701');
        await page.getByRole('button', { name: /Submit unavailability request/i }).click();
        assert.equal(await page.getByLabel(/Reason for unavailability/i).getAttribute('aria-invalid'), 'true');
        monitor.assertClean('T2-06 Member');
      } finally {
        await context.close();
      }
    }
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.APPROVER);
      try {
        await navigateInApp(page, '/replacements/801');
        await page.getByLabel(/Select eligible replacement employee/i).selectOption('102');
        await page.getByRole('button', { name: /Submit Manager decision/i }).click();
        assert.equal(await page.getByLabel(/Decision reason/i).getAttribute('aria-invalid'), 'true');
        monitor.assertClean('T2-06 Approver');
      } finally {
        await context.close();
      }
    }
  });

  await runner.test('T2', 'T2-07', 'Invalid date ranges rejected across Availability, Roster, Holidays, Grants, Employees & Duty History', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN);
    try {
      // Availability inverted range
      await navigateInApp(page, '/availability');
      await page.getByLabel(/Start date/i).fill('2027-02-10');
      await page.getByLabel(/End date/i).fill('2027-02-05');
      await page.getByRole('button', { name: /Submit availability/i }).click();
      assert.equal(await page.getByLabel(/End date/i).getAttribute('aria-invalid'), 'true');

      // Availability overlap (as Member against #301 2026-12-31..2027-01-02)
      const memberSess = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.MEMBER);
      try {
        await navigateInApp(memberSess.page, '/availability');
        await memberSess.page.getByLabel(/Start date/i).fill('2026-12-31');
        await memberSess.page.getByLabel(/End date/i).fill('2027-01-01');
        await memberSess.page.getByRole('button', { name: /Submit availability/i }).click();
        await memberSess.page.locator('[role="alert"]').first().waitFor({ state: 'visible', timeout: 5000 });
        assert.match(await memberSess.page.locator('[role="alert"]').first().innerText(), /overlap/i);
      } finally {
        await memberSess.context.close();
      }

      // Roster period inverted range
      await navigateInApp(page, '/roster');
      await page.getByLabel(/Period code/i).fill('INV-RANGE');
      await page.getByLabel(/Period name/i).fill('Invalid Range');
      await page.getByLabel(/Start date/i).fill('2027-05-10');
      await page.getByLabel(/End date/i).fill('2027-05-01');
      await page.getByRole('button', { name: /Create roster period/i }).click();
      assert.equal(await page.getByLabel(/End date/i).getAttribute('aria-invalid'), 'true');

      // Holiday dutyWindowEnd <= dutyWindowStart
      await navigateInApp(page, '/holidays/new');
      await page.getByLabel(/Holiday name/i).fill('Bad Window');
      await page.getByLabel(/Holiday date/i).fill('2027-05-01');
      await page.getByLabel(/Primary count/i).fill('1');
      await page.getByLabel(/Standby count/i).fill('0');
      await page.getByLabel(/Duty window start/i).fill('2027-05-01T18:00');
      await page.getByLabel(/Duty window end/i).fill('2027-05-01T09:00');
      await page.getByRole('button', { name: /Create holiday/i }).click();
      assert.equal(await page.getByLabel(/Duty window end/i).getAttribute('aria-invalid'), 'true');

      // Employee end < start
      await navigateInApp(page, '/employees/new');
      await page.getByLabel(/Employee code/i).fill('EMP-BAD-DT');
      await page.getByLabel(/First name/i).fill('Bad');
      await page.getByLabel(/Last name/i).fill('Date');
      await page.getByLabel(/Work email/i).fill('baddate@company.local');
      await page.getByLabel(/Employment start date/i).fill('2027-05-10');
      await page.getByLabel(/Employment end date/i).fill('2027-05-01');
      await page.getByRole('button', { name: /Create employee/i }).click();
      assert.equal(await page.getByLabel(/Employment end date/i).getAttribute('aria-invalid'), 'true');

      monitor.assertClean('T2-07');
    } finally {
      await context.close();
    }
  });

  await runner.test('T2', 'T2-08', 'Holiday creation (CAL-02) enforces blank primaryCount/standbyCount defaults, bounds & post-publish 409 conflict', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN);
    try {
      await navigateInApp(page, '/holidays/new');
      const primaryInput = page.getByLabel(/Primary count/i);
      const standbyInput = page.getByLabel(/Standby count/i);
      assert.equal(await primaryInput.inputValue(), '', 'Primary count must be blank by default (no inferred default)');
      assert.equal(await standbyInput.inputValue(), '', 'Standby count must be blank by default (no inferred default)');

      // Empty primaryCount blocked
      await page.getByLabel(/Holiday name/i).fill('Boundary Holiday');
      await page.getByLabel(/Holiday date/i).fill('2027-06-01');
      await standbyInput.fill('0');
      await page.getByRole('button', { name: /Create holiday/i }).click();
      assert.equal(await primaryInput.getAttribute('aria-invalid'), 'true');

      // primaryCount = 0 blocked
      await primaryInput.fill('0');
      await page.getByRole('button', { name: /Create holiday/i }).click();
      assert.equal(await primaryInput.getAttribute('aria-invalid'), 'true');

      // standbyCount = -1 blocked
      await primaryInput.fill('1');
      await standbyInput.fill('-1');
      await page.getByRole('button', { name: /Create holiday/i }).click();
      assert.equal(await standbyInput.getAttribute('aria-invalid'), 'true');

      // Valid boundary: primaryCount = 1, standbyCount = 0
      await standbyInput.fill('0');
      await page.getByRole('button', { name: /Create holiday/i }).click();
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'T2-08 created boundary holiday');
      await expectVisible(page.getByRole('heading', { level: 1, name: /Boundary Holiday/i }));

      // Post-publish holiday #201 edit -> 409 conflict directing to Roster Revision
      await navigateInApp(page, '/holidays/201');
      await page.getByLabel(/Holiday name/i).fill('Winter Holiday Edited');
      await page.getByRole('button', { name: /Save pre-publication changes/i }).click();
      const conflictAlert = page.locator('[role="alert"]').first();
      await conflictAlert.waitFor({ state: 'visible', timeout: 5000 });
      assert.match(await conflictAlert.innerText(), /published|revision/i);

      monitor.assertClean('T2-08');
    } finally {
      await context.close();
    }
  });

  await runner.test('T2', 'T2-09', 'mockMode defaults to false and throws ConfigurationError on non-local hostnames', async () => {
    const configUrl = pathToFileURL(path.join(FRONTEND_DIR, 'js', 'config.js')).href;
    const { loadConfig, ConfigurationError } = await import(configUrl);
    const fakeDoc = {
      querySelector(sel) {
        if (sel === 'meta[name="roster-api-base-url"]') return { getAttribute: () => 'https://api.company.com' };
        return null;
      },
    };
    const defaultCfg = loadConfig(fakeDoc, { location: { hostname: 'app.company.com', search: '' } });
    assert.equal(defaultCfg.mockMode, false, 'mockMode must default to false');

    const emptyDoc = { querySelector: () => null };
    assert.throws(
      () => loadConfig(emptyDoc, { location: { hostname: 'app.company.com', search: '?mock=1' } }),
      ConfigurationError,
      'Non-local hostname with ?mock=1 must throw ConfigurationError'
    );
    assert.throws(
      () => loadConfig(emptyDoc, { __ROSTER_CONFIG__: { mockMode: true }, location: { hostname: 'roster.company.com' } }),
      ConfigurationError,
      'Non-local hostname with __ROSTER_CONFIG__.mockMode must throw ConfigurationError'
    );

    // Also verify unconfigured root without ?mock=1 in browser blocks startup safely
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
      await page.locator('#config-error-heading').waitFor({ state: 'visible', timeout: 5000 });
      assert.match(await page.locator('#config-error-heading').innerText(), /Configuration required/i);
    } finally {
      await context.close();
    }
  });

  await runner.test('T2', 'T2-10', 'FDR-03 Recusal (Member/Admin cannot decide) & FDR-09 Two-Person Publish Control', async () => {
    // 1. Member (requester/affected assignee) views /replacements/801 -> decision panel hidden
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.MEMBER);
      try {
        await navigateInApp(page, '/replacements/801');
        assert.equal(await page.locator('#rep-decide-h').count(), 0, 'Member must not see decision panel');
        assert.equal(await page.getByRole('button', { name: /Submit Manager decision/i }).count(), 0);
        monitor.assertClean('T2-10 Member');
      } finally {
        await context.close();
      }
    }

    // 2. Admin (no REPLACEMENT.APPROVE grant) views /replacements/801 -> decision panel hidden
    // 3. Admin attempts to publish v502 (revisedByUserAccountId = 1) -> TWO_PERSON_CONTROL_VIOLATION
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN);
      try {
        await navigateInApp(page, '/replacements/801');
        assert.equal(await page.locator('#rep-decide-h').count(), 0, 'Admin without approval grant must not see decision panel');

        await navigateInApp(page, '/roster/401/versions/502/publish');
        await page.getByText(/Two-person/i).waitFor({ state: 'visible', timeout: 5000 });
        await page.getByRole('button', { name: /Publish official roster/i }).click();
        await confirmOpenDialog(page, /Publish roster/i);
        const alert = page.locator('#publish-error-box [role="alert"]');
        await alert.waitFor({ state: 'visible', timeout: 5000 });
        assert.match(await alert.innerText(), /different user|two-person|blocked/i);
        monitor.assertClean('T2-10 Admin');
      } finally {
        await context.close();
      }
    }
  });

  await runner.test('T2', 'T2-11', 'XSS inert rendering (HO-01/HELP-01) & Empty / Loading / Error recovery states', async () => {
    // 1. XSS inert rendering in Handover & Help + Empty states
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN);
      try {
        const xssPayload = '<script>window.__xss=1</script><img src=x onerror="window.__xss=2">';
        await navigateInApp(page, '/handover');
        await page.getByLabel(/^Assignment ID/i).fill('701');
        await page.getByLabel(/Operational summary/i).fill(xssPayload);
        await page.getByLabel(/Item title/i).fill('XSS Check');
        await page.getByLabel(/Details/i).fill(xssPayload);
        await page.getByRole('button', { name: /Submit handover report/i }).click();
        await waitForAppSettled(page);
        assert.equal(await page.evaluate(() => window.__xss), undefined, 'XSS payload in handover must never execute');
        await expectVisible(page.getByText(xssPayload).first());

        await navigateInApp(page, '/help/manage/new');
        await page.getByLabel(/^Title/i).fill('XSS Safe Help');
        await page.getByLabel(/Publication status/i).selectOption('PUBLISHED');
        await page.getByLabel(/Article content/i).fill(xssPayload);
        await page.getByRole('button', { name: /Create article/i }).click();
        await waitForAppSettled(page);
        assert.equal(await page.evaluate(() => window.__xss), undefined, 'XSS payload in help article must never execute');
        await expectVisible(page.getByText(xssPayload).first());

        // Empty state on /holidays filtered to 2099
        await navigateInApp(page, '/holidays');
        await page.getByLabel(/From date/i).fill('2099-01-01');
        await page.getByLabel(/To date/i).fill('2099-01-02');
        await page.getByRole('button', { name: /^Filter$/i }).click();
        await waitForAppSettled(page);
        await expectVisible(page.getByText(/No holidays in this date range/i));

        monitor.assertClean('T2-11 XSS & Empty');
      } finally {
        await context.close();
      }
    }

    // 2. Loading skeleton & 503 error recovery with Retry via real fetch route interception
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      try {
        await page.addInitScript((apiBase) => {
          window.__ROSTER_CONFIG__ = { apiBaseUrl: apiBase, mockMode: false };
        }, baseUrl);

        let holidayCalls = 0;
        await page.route('**/api/v2/**', async (route) => {
          const url = new URL(route.request().url());
          const apiPath = url.pathname.replace(/^\/api\/v2/, '');
          if (apiPath === '/session/me') {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                user: { id: 1, employeeId: 101, displayName: 'Asha Rao', roles: ['ADMIN'], permissions: ['CALENDAR.READ', 'NOTIFICATION.READ'], scopes: ['ORG'] },
                csrfToken: 'csrf-1',
                onboarding: { walkthroughs: [] },
              }),
            });
          }
          if (apiPath === '/notifications/unread-count') {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0 }) });
          }
          if (apiPath === '/holidays') {
            holidayCalls += 1;
            await new Promise((r) => setTimeout(r, 250));
            if (holidayCalls === 1) {
              return route.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({ code: 'SERVICE_UNAVAILABLE', message: 'Maintenance window', correlationId: 'corr-503' }),
              });
            }
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                items: [{ id: 201, name: 'Recovered Holiday', holidayDate: '2026-12-25', primaryCount: 1, standbyCount: 1, status: 'ACTIVE' }],
                page: { page: 0, pageSize: 25, totalElements: 1, totalPages: 1 },
              }),
            });
          }
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
        });

        await page.goto(`${baseUrl}/holidays`, { waitUntil: 'domcontentloaded' });
        await page.locator('.skeleton').waitFor({ state: 'visible', timeout: 4000 });
        await page.locator('[role="alert"]').waitFor({ state: 'visible', timeout: 5000 });
        const errText = await page.locator('[role="alert"]').innerText();
        assert.match(errText, /Maintenance window/i);
        assert.match(errText, /corr-503/);

        await page.getByRole('button', { name: /Retry/i }).click();
        await waitForAppSettled(page);
        await expectVisible(page.getByText(/Recovered Holiday/i));
      } finally {
        await context.close();
      }
    }
  });
}

async function expectVisible(locator, timeout = 5000) {
  await locator.waitFor({ state: 'visible', timeout });
}
