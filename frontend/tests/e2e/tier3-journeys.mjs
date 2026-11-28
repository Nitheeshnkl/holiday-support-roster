import assert from 'node:assert/strict';
import {
  DEMO_ACCOUNTS,
  assertPageHygiene,
  confirmOpenDialog,
  createSessionPage,
  navigateInApp,
  waitForAppSettled,
} from './lib/harness.mjs';

export async function runTier3Journeys(runner, { browser, baseUrl }) {
  console.log('\n=== Tier 3: End-to-End User Journeys (J1 - J5) ===');

  await runner.test('T3', 'J1', 'Admin /calendar -> 5 views -> filter -> inspector -> /roster/401/versions/502/assign manual reassignment', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN);
    try {
      await assertPageHygiene(page, 'J1 Admin /');
      await page.locator('#app-sidebar').getByRole('link', { name: /Schedule Calendar/i }).click();
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'J1 /calendar');

      // Switch all 5 calendar views
      for (const tabName of ['Month', 'Week', 'Day', 'Agenda', 'Team Grid']) {
        const tab = page.getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') });
        await tab.click();
        assert.equal(await tab.getAttribute('aria-selected'), 'true');
      }

      // Return to Month, switch to Draft only, test filters, jump to 2026-12-25
      await page.getByRole('tab', { name: /^Month$/i }).click();
      await page.getByLabel('Schedule status').selectOption('DRAFT');
      await waitForAppSettled(page);
      await page.getByText(/Draft .* not published/i).waitFor({ state: 'visible', timeout: 5000 });

      await page.getByLabel('Duty type filter').selectOption('PRIMARY');
      await page.getByLabel('Employee filter').selectOption('103');
      await page.getByLabel('Jump to date').fill('2026-12-25');

      // Click Maya Patel draft event chip -> open inspector -> Reassign draft slot
      await page.locator('.cal-pill', { hasText: /Maya Patel/i }).first().click();
      const inspector = page.locator('aside[aria-label="Schedule inspector"]');
      await inspector.waitFor({ state: 'visible', timeout: 5000 });
      await inspector.getByRole('link', { name: /Reassign draft slot/i }).click();
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'J1 ROS-05 assign');

      assert.match(page.url(), /\/roster\/401\/versions\/502\/assign/);
      await page.getByLabel(/Eligible and available employee/i).selectOption('102');
      await page.getByLabel(/Audit reason/i).fill('Rebalancing Q4 draft assignment');
      await page.getByRole('button', { name: /Save manual reassignment/i }).click();
      await confirmOpenDialog(page, /Confirm assignment/i);
      await waitForAppSettled(page);

      assert.match(page.url(), /\/roster\/401/);
      await assertPageHygiene(page, 'J1 /roster/401 after assign');
      const tableText = await page.locator('table').first().innerText();
      assert.match(tableText, /Liam Chen/i, 'Updated assignee Liam Chen must appear in draft roster');
      assert.match(tableText, /Manual/i, 'Manual origin must appear on reassigned slot');

      monitor.assertClean('J1');
    } finally {
      await context.close();
    }
  });

  await runner.test('T3', 'J2', 'Team Lead checks /calendar coverage gaps, /availability, and /roster/401', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.TEAM_LEAD);
    try {
      await assertPageHygiene(page, 'J2 Team Lead /');
      await page.locator('#app-sidebar').getByRole('link', { name: /Schedule Calendar/i }).click();
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'J2 /calendar');

      await page.getByLabel('Duty type filter').selectOption('GAP');
      await page.getByLabel('Duty type filter').selectOption('AVAILABILITY');
      await page.getByLabel('Duty type filter').selectOption('');

      // Check team availability
      await page.locator('#app-sidebar').getByRole('link', { name: /availability/i }).click();
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'J2 /availability');
      await page.getByLabel(/Employee ID/i).fill('103');
      await page.getByRole('button', { name: /^Filter$/i }).click();
      await waitForAppSettled(page);
      await page.getByText(/FAMILY_TRAVEL/i).waitFor({ state: 'visible', timeout: 5000 });

      // Inspect /roster/401 and verify Team Lead has no Publish button and no approval decision buttons
      await navigateInApp(page, '/roster/401');
      await assertPageHygiene(page, 'J2 /roster/401');
      assert.equal(await page.getByRole('link', { name: /Review & publish/i }).count(), 0);

      await navigateInApp(page, '/replacements/801');
      assert.equal(await page.locator('#rep-decide-h').count(), 0);

      monitor.assertClean('J2');
    } finally {
      await context.close();
    }
  });

  await runner.test('T3', 'J3', 'Employee views upcoming shift, submits non-overlapping availability, submits replacement for #701, published assignment unchanged', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.MEMBER);
    try {
      await assertPageHygiene(page, 'J3 Member /');
      await page.locator('#dash-dut-h').waitFor({ state: 'visible', timeout: 5000 });

      // Check upcoming shift on /calendar
      await page.locator('#app-sidebar').getByRole('link', { name: /Schedule Calendar/i }).click();
      await waitForAppSettled(page);
      await page.locator('.cal-pill', { hasText: /Maya Patel/i }).first().waitFor({ state: 'visible', timeout: 5000 });

      // Navigate to /availability and submit non-overlapping 2027-02-10..2027-02-12
      await page.locator('#app-sidebar').getByRole('link', { name: /availability/i }).click();
      await waitForAppSettled(page);
      await page.getByLabel(/Declaration type/i).selectOption('UNAVAILABLE');
      await page.getByLabel(/Reason code/i).fill('FAMILY_EVENT');
      await page.getByLabel(/Start date/i).fill('2027-02-10');
      await page.getByLabel(/End date/i).fill('2027-02-12');
      await page.getByLabel(/Note/i).fill('Family travel planned');
      await page.getByRole('button', { name: /Submit availability/i }).click();
      await waitForAppSettled(page);
      await page.getByText('FAMILY_EVENT').waitFor({ state: 'visible', timeout: 5000 });

      // Navigate to /replacements/new via CTA and submit replacement for #701
      await page.getByRole('link', { name: /Report published assignment unavailability/i }).click();
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'J3 /replacements/new');
      await page.getByLabel(/Published assignment ID/i).fill('701');
      await page.getByLabel(/Reason for unavailability/i).fill('Urgent travel conflict');
      await page.getByRole('button', { name: /Submit unavailability request/i }).click();
      await confirmOpenDialog(page, /Submit request/i);
      await page.waitForURL(/\/replacements\/\d+/, { timeout: 8000 });
      await waitForAppSettled(page);

      assert.match(page.url(), /\/replacements\/\d+/);
      await assertPageHygiene(page, 'J3 /replacements/:newId');
      await page.getByText(/Awaiting Manager decision/i).first().waitFor({ state: 'visible', timeout: 5000 });
      assert.equal(await page.locator('#rep-decide-h').count(), 0, 'Employee must not see Manager approval controls');

      // Verify original published assignment #701 remains active & unchanged in published roster
      await navigateInApp(page, '/roster/401?status=PUBLISHED');
      await assertPageHygiene(page, 'J3 /roster/401?status=PUBLISHED');
      const primaryRow = page.locator('tbody tr', { hasText: /Winter Holiday Day 1/i }).filter({ hasText: /Maya Patel/i }).first();
      await primaryRow.waitFor({ state: 'visible', timeout: 5000 });
      assert.match(await primaryRow.innerText(), /Published/i, 'Published assignment #701 must remain PUBLISHED pending Manager decision');

      monitor.assertClean('J3');
    } finally {
      await context.close();
    }
  });

  await runner.test('T3', 'J4', 'First-time employee completes interactive role-aware onboarding tour (spotlight/popover, Next -> Complete, Restart -> Skip, persisted without localStorage)', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.MEMBER);
    try {
      await assertPageHygiene(page, 'J4 Member /');

      // Banner should be visible with Start guide
      const startBtn = page.getByRole('button', { name: /Start guide/i });
      await startBtn.waitFor({ state: 'visible', timeout: 5000 });
      await startBtn.click();

      // Verify interactive spotlight / tour UI (requires real UI control highlight per R5 & Doc 09)
      const tourPopover = page.locator('.tour-popover, .onboarding-tour, [data-tour-popover], dialog[open]').first();
      await tourPopover.waitFor({ state: 'visible', timeout: 5000 });

      const spotlightCount = await page.locator('.tour-spotlight, .onboarding-spotlight, [data-tour-highlight="true"], [data-tour-active="true"]').count();
      assert.ok(
        spotlightCount > 0,
        'ONB-01 interactive tour must highlight an actual UI control with a spotlight/highlight indicator (not just a static popup modal)'
      );

      // Step through Next -> Complete
      for (let stepGuard = 0; stepGuard < 10; stepGuard += 1) {
        const completeBtn = page.getByRole('button', { name: /Complete|Finish/i }).first();
        if (await completeBtn.isVisible().catch(() => false)) {
          await completeBtn.click();
          break;
        }
        const nextBtn = page.getByRole('button', { name: /^Next/i }).first();
        await nextBtn.waitFor({ state: 'visible', timeout: 4000 });
        await nextBtn.click();
      }

      // Banner should disappear after completion
      await page.locator('.onboarding-banner').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      assert.equal(await page.locator('.onboarding-banner').count(), 0, 'Onboarding banner must dismiss after completion');

      // Reopen via Guide header button -> Restart -> Skip
      await page.getByRole('button', { name: /^Guide$/i }).click();
      const restartBtn = page.getByRole('button', { name: /Restart/i }).first();
      await restartBtn.waitFor({ state: 'visible', timeout: 4000 });
      await restartBtn.click();

      const skipBtn = page.getByRole('button', { name: /Skip/i }).first();
      await skipBtn.waitFor({ state: 'visible', timeout: 4000 });
      await skipBtn.click();

      // Verify zero localStorage usage
      const storageCount = await page.evaluate(() => window.localStorage.length + window.sessionStorage.length);
      assert.equal(storageCount, 0, 'Onboarding progress must never use localStorage/sessionStorage');

      monitor.assertClean('J4');
    } finally {
      await context.close();
    }
  });

  await runner.test('T3', 'J5', 'Notification navigation from unread header badge -> /notifications -> mark read & deep-link to /replacements/801 and /roster/401', async () => {
    // 1. Approver notification #951 -> /replacements/801
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.APPROVER);
      try {
        const notifUtility = page.locator('header').getByRole('link', { name: /Notifications/i });
        await notifUtility.waitFor({ state: 'visible', timeout: 5000 });
        const ariaLabel = await notifUtility.getAttribute('aria-label');
        assert.match(String(ariaLabel || ''), /1 unread|unread/i, 'Header should indicate unread notifications');

        await notifUtility.click();
        await waitForAppSettled(page);
        await assertPageHygiene(page, 'J5 Approver /notifications');

        const row = page.locator('tbody tr', { hasText: /Replacement decision required/i }).first();
        await row.waitFor({ state: 'visible', timeout: 5000 });

        await row.getByRole('button', { name: /Mark read/i }).click();
        await waitForAppSettled(page);
        await row.getByText(/^Read /i).waitFor({ state: 'visible', timeout: 5000 });

        await row.getByRole('link', { name: /Open item/i }).click();
        await waitForAppSettled(page);
        assert.equal(new URL(page.url()).pathname, '/replacements/801');
        await assertPageHygiene(page, 'J5 /replacements/801');
        await page.locator('#rep-decide-h').waitFor({ state: 'visible', timeout: 5000 });

        monitor.assertClean('J5 Approver');
      } finally {
        await context.close();
      }
    }

    // 2. Member notification #952 -> /roster/401
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.MEMBER);
      try {
        await navigateInApp(page, '/notifications');
        const row = page.locator('tbody tr', { hasText: /Schedule v1 published|Roster v1 published/i }).first();
        await row.waitFor({ state: 'visible', timeout: 5000 });
        await row.getByRole('link', { name: /Open item/i }).click();
        await waitForAppSettled(page);
        assert.equal(new URL(page.url()).pathname, '/roster/401');
        await assertPageHygiene(page, 'J5 /roster/401');
        monitor.assertClean('J5 Member');
      } finally {
        await context.close();
      }
    }
  });
}
