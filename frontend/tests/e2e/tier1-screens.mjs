import assert from 'node:assert/strict';
import {
  DEMO_ACCOUNTS,
  assertPageHygiene,
  confirmOpenDialog,
  createSessionPage,
  navigateInApp,
  waitForAppSettled,
} from './lib/harness.mjs';

export async function runTier1Screens(runner, { browser, baseUrl }) {
  console.log('\n=== Tier 1: All 31 Document 08 Screens + Calendar Views + Role Dashboards ===');

  await runner.test('T1', 'T1-01', 'AUTH-01/02/03 Public auth routes (login, forgot, reset, activate, session-expired, unauthorized, unavailable)', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, null, { initialPath: '/login' });
    try {
      await assertPageHygiene(page, 'AUTH-01 /login');
      await expectVisible(page.getByRole('heading', { level: 1, name: /Sign in/i }));
      await expectVisible(page.locator('details summary', { hasText: /Development mock accounts/i }));

      // Forgot password
      await page.getByRole('link', { name: /Forgot password/i }).click();
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'AUTH-01 /forgot-password');
      await page.getByLabel(/Work email address/i).fill('member@company.local');
      await page.getByRole('button', { name: /Send reset request/i }).click();
      await expectVisible(page.getByText(/Request accepted/i));

      // Reset password with query token stripped from URL
      await navigateInApp(page, '/reset-password?token=demo-reset-token');
      await assertPageHygiene(page, 'AUTH-01 /reset-password');
      const resetSearch = await page.evaluate(() => window.location.search);
      assert.equal(resetSearch, '', 'Reset token must be stripped from window.location.search');
      await page.getByRole('textbox', { name: /^New password/i }).fill('ValidResetPass2026');
      await page.getByRole('textbox', { name: /^Confirm new password/i }).fill('ValidResetPass2026');
      await page.getByRole('button', { name: /Reset password/i }).click();
      await expectVisible(page.getByText(/Password reset complete/i));

      // Activate account with query token stripped from URL
      await navigateInApp(page, '/activate?token=demo-invite-token');
      await assertPageHygiene(page, 'AUTH-01 /activate');
      const activateSearch = await page.evaluate(() => window.location.search);
      assert.equal(activateSearch, '', 'Invitation token must be stripped from window.location.search');
      await page.getByRole('textbox', { name: /^Choose password/i }).fill('ValidActivatePass2026');
      await page.getByRole('textbox', { name: /^Confirm password/i }).fill('ValidActivatePass2026');
      await page.getByRole('button', { name: /Activate account/i }).click();
      await expectVisible(page.getByText(/Account activated/i));

      // Session expired, Unauthorized, Unavailable
      await navigateInApp(page, '/session-expired');
      await assertPageHygiene(page, 'AUTH-02 /session-expired');
      await expectVisible(page.getByRole('link', { name: /Sign in/i }));

      await navigateInApp(page, '/unauthorized');
      await assertPageHygiene(page, 'AUTH-03 /unauthorized');
      await expectVisible(page.getByRole('heading', { level: 1, name: /Access denied/i }));

      await navigateInApp(page, '/unavailable');
      await assertPageHygiene(page, 'AUTH-03 /unavailable');
      await expectVisible(page.getByRole('heading', { level: 1, name: /unavailable/i }));

      monitor.assertClean('T1-01');
    } finally {
      await context.close();
    }
  });

  await runner.test('T1', 'T1-02', 'APP-01 & SHELL & AUTH-01/02 Role dashboards (Admin, Team Lead, Employee), /account, and Sign out', async () => {
    // 1. Admin dashboard + /account + Sign out
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN);
      try {
        await assertPageHygiene(page, 'APP-01 Admin /');
        await expectVisible(page.locator('#dash-hol-h'));
        await expectVisible(page.locator('#dash-ros-h'));
        await expectVisible(page.locator('#dash-rep-h'));
        await expectVisible(page.locator('#dash-not-h'));
        await page.getByRole('button', { name: /Refresh/i }).click();
        await waitForAppSettled(page);

        // /account
        await navigateInApp(page, '/account');
        await assertPageHygiene(page, 'AUTH-01 /account');
        await expectVisible(page.locator('#account-profile-heading'));
        await expectVisible(page.locator('#account-password-heading'));
        await page.locator('details summary', { hasText: /Effective permissions/i }).click();
        await expectVisible(page.getByText(/ROSTER\.PUBLISH/));

        await page.getByRole('textbox', { name: /^Current password/i }).fill(DEMO_ACCOUNTS.ADMIN.password);
        await page.getByRole('textbox', { name: /^New password/i }).fill('AdminNewPass#2026');
        await page.getByRole('textbox', { name: /^Confirm new password/i }).fill('AdminNewPass#2026');
        await page.getByRole('button', { name: /Change password/i }).click();
        await confirmOpenDialog(page, /Change password/i);
        await expectVisible(page.getByText(/Password changed/i));

        // Sign out -> /login
        await page.getByRole('button', { name: /Sign out/i }).click();
        await waitForAppSettled(page);
        await expectVisible(page.getByRole('heading', { level: 1, name: /Sign in/i }));
        monitor.assertClean('T1-02 Admin');
      } finally {
        await context.close();
      }
    }

    // 2. Team Lead dashboard
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.TEAM_LEAD);
      try {
        await assertPageHygiene(page, 'APP-01 Team Lead /');
        const navText = await page.locator('#app-sidebar').innerText();
        assert.equal(/Audit Log/i.test(navText), false, 'Team Lead sidebar must omit Audit Log');
        assert.equal(/Approval Authority/i.test(navText), false, 'Team Lead sidebar must omit Approval Authority');
        monitor.assertClean('T1-02 Team Lead');
      } finally {
        await context.close();
      }
    }

    // 3. Employee dashboard + Onboarding banner check
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.MEMBER);
      try {
        await assertPageHygiene(page, 'APP-01 Employee /');
        await expectVisible(page.locator('#dash-dut-h'));
        await expectVisible(page.getByRole('button', { name: /Start guide|Resume guide|Guide/i }).first());
        monitor.assertClean('T1-02 Employee');
      } finally {
        await context.close();
      }
    }
  });

  await runner.test('T1', 'T1-03', 'CAL-HUB Schedule Calendar 5 views (Month, Week, Day, Agenda, Team Grid), filters & Inspector', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN);
    try {
      await navigateInApp(page, '/calendar');
      await assertPageHygiene(page, 'CAL-HUB /calendar');

      // Switch all 5 views
      for (const tabName of ['Month', 'Week', 'Day', 'Agenda', 'Team Grid']) {
        const tab = page.getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') });
        await tab.click();
        assert.equal(await tab.getAttribute('aria-selected'), 'true', `Calendar tab ${tabName} should be selected`);
        await assertPageHygiene(page, `CAL-HUB ${tabName}`);
      }

      // Team Grid specific assertions
      await expectVisible(page.getByRole('region', { name: /Team schedule grid/i }));
      await expectVisible(page.locator('.cal-team-table'));

      // Return to Month, test date navigation & filters
      await page.getByRole('tab', { name: /^Month$/i }).click();
      await page.getByRole('button', { name: 'Previous period' }).click();
      await page.getByRole('button', { name: 'Next period' }).click();
      await page.getByLabel('Jump to date').fill('2026-12-25');

      await page.getByLabel('Schedule status').selectOption('DRAFT');
      await waitForAppSettled(page);
      await expectVisible(page.getByText(/Draft .* not published/i));

      await page.getByLabel('Duty type filter').selectOption('PRIMARY');
      await page.getByLabel('Duty type filter').selectOption('');
      await page.getByLabel('Employee filter').selectOption('103');
      await page.getByLabel('Employee filter').selectOption('');

      // Open inspector on Maya Patel chip and close it
      await page.locator('.cal-pill', { hasText: /Maya Patel/i }).first().click();
      const inspector = page.locator('aside[aria-label="Schedule inspector"]');
      await expectVisible(inspector);
      await inspector.getByRole('button', { name: /Close details panel/i }).click();
      await inspector.waitFor({ state: 'hidden', timeout: 3000 });

      monitor.assertClean('T1-03');
    } finally {
      await context.close();
    }
  });

  await runner.test('T1', 'T1-04', 'CAL-01 & CAL-02 Holidays list, tabs, create holiday, and holiday detail', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN);
    try {
      await navigateInApp(page, '/holidays');
      await assertPageHygiene(page, 'CAL-01 /holidays');
      await expectVisible(page.getByText(/Winter Holiday Day 1/i));

      await page.getByRole('tab', { name: /Month schedule/i }).click();
      await expectVisible(page.locator('.holiday-card').first());
      await page.getByRole('tab', { name: /List view/i }).click();

      // Create holiday
      await page.getByRole('link', { name: /Configure holiday/i }).click();
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'CAL-02 /holidays/new');

      await page.getByLabel(/Holiday name/i).fill('Spring Operations Day');
      await page.getByLabel(/Holiday date/i).fill('2027-03-15');
      await page.getByLabel(/Primary count/i).fill('1');
      await page.getByLabel(/Standby count/i).fill('1');
      await page.getByRole('button', { name: /Create holiday/i }).click();
      await waitForAppSettled(page);

      await assertPageHygiene(page, 'CAL-02 /holidays/:id created');
      await expectVisible(page.getByRole('heading', { level: 1, name: /Spring Operations Day/i }));

      // Inspect existing holiday 201
      await navigateInApp(page, '/holidays/201');
      await assertPageHygiene(page, 'CAL-02 /holidays/201');
      await expectVisible(page.getByRole('heading', { level: 1, name: /Winter Holiday Day 1/i }));

      monitor.assertClean('T1-04');
    } finally {
      await context.close();
    }
  });

  await runner.test('T1', 'T1-05', 'ORG-01..05 Employees, Detail, Create/Edit, Teams, Team Leads & Approval Grants', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN);
    try {
      // ORG-01 Employee Directory
      await navigateInApp(page, '/employees');
      await assertPageHygiene(page, 'ORG-01 /employees');
      await page.getByLabel(/Employment status filter/i).selectOption('true');
      await page.getByRole('button', { name: /Apply filter/i }).click();
      await waitForAppSettled(page);
      await expectVisible(page.locator('#main-content').getByRole('link', { name: /Asha Rao/i }));

      // ORG-03 Create Employee
      await navigateInApp(page, '/employees/new');
      await assertPageHygiene(page, 'ORG-03 /employees/new');
      await page.getByLabel(/Employee code/i).fill('EMP-777');
      await page.getByLabel(/First name/i).fill('Jordan');
      await page.getByLabel(/Last name/i).fill('Lee');
      await page.getByLabel(/Work email/i).fill('jordan.lee@company.local');
      await page.getByLabel(/Employment start date/i).fill('2026-01-01');
      await page.getByRole('button', { name: /Create employee/i }).click();
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'ORG-02 /employees/:id created');
      await expectVisible(page.getByRole('heading', { level: 1, name: /Jordan Lee/i }));

      // ORG-02 Employee Detail & ORG-03 Edit
      await navigateInApp(page, '/employees/103');
      await assertPageHygiene(page, 'ORG-02 /employees/103');
      await expectVisible(page.locator('#emp-team-h'));
      await expectVisible(page.locator('#emp-role-h'));
      await expectVisible(page.locator('#emp-duty-h'));

      // Switch duty history dimension on detail page
      await page.locator('#emp-duty-h').locator('..').getByLabel(/Dimension/i).selectOption('STANDBY_ASSIGNMENT');
      await waitForAppSettled(page);

      // Invite account
      await page.getByRole('button', { name: /Invite account/i }).click();
      await confirmOpenDialog(page, /Send invitation/i);
      await expectVisible(page.getByText(/Invitation queued/i).first());

      // Edit employee
      await navigateInApp(page, '/employees/103/edit');
      await assertPageHygiene(page, 'ORG-03 /employees/103/edit');
      await page.getByRole('button', { name: /Save changes/i }).click();
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'ORG-02 /employees/103 after edit');

      // Deactivate account (expects PUT /employees/:id/account-status per OpenAPI; detects pre-M1 PATCH mock bug)
      await page.getByRole('button', { name: /Deactivate account/i }).click();
      await confirmOpenDialog(page, /Deactivate/i);
      await expectVisible(page.getByRole('button', { name: /Activate account/i }));

      // ORG-04 Teams & Team Leads
      await navigateInApp(page, '/teams');
      await assertPageHygiene(page, 'ORG-04 /teams');
      await page.getByLabel(/Team code/i).fill('SRE-OPS');
      await page.getByLabel(/Team name/i).fill('Site Reliability');
      await page.getByRole('button', { name: /Create team/i }).click();
      await waitForAppSettled(page);
      await expectVisible(page.getByText(/Site Reliability/i));

      await navigateInApp(page, '/teams/2/team-leads');
      await assertPageHygiene(page, 'ORG-04 /teams/2/team-leads');
      await page.getByLabel(/^Employee ID/i).fill('104');
      await page.getByLabel(/Effective from/i).fill('2026-06-01');
      await page.getByRole('button', { name: /^Appoint$/i }).click();
      await waitForAppSettled(page);
      await expectVisible(page.getByText(/Employee #104/i));

      // ORG-05 Approval Grants
      await navigateInApp(page, '/authority/grants');
      await assertPageHygiene(page, 'ORG-05 /authority/grants');
      await page.getByLabel(/Grantee user account ID/i).fill('2');
      await page.getByLabel(/Valid from/i).fill('2027-01-01');
      await page.getByLabel(/Valid until/i).fill('2027-12-31');
      await page.getByLabel(/^Reason/i).fill('Q1 team lead approval coverage');
      await page.getByRole('button', { name: /Grant approval authority/i }).click();
      await waitForAppSettled(page);
      await expectVisible(page.getByText(/Q1 team lead approval coverage/i));

      monitor.assertClean('T1-05');
    } finally {
      await context.close();
    }
  });

  await runner.test('T1', 'T1-06', 'ROS-01..07 Roster periods, overview, generate, draft review, manual assign, publish & history/revision', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN);
    try {
      // ROS-01 Roster Period List + Create
      await navigateInApp(page, '/roster');
      await assertPageHygiene(page, 'ROS-01 /roster');
      await page.getByLabel(/Period code/i).fill('HOL-2027-Q1');
      await page.getByLabel(/Period name/i).fill('Spring Holidays 2027');
      await page.getByLabel(/Start date/i).fill('2027-03-01');
      await page.getByLabel(/End date/i).fill('2027-04-30');
      await page.getByRole('button', { name: /Create roster period/i }).click();
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'ROS-02 created period');

      // ROS-02 Roster Overview (401)
      await navigateInApp(page, '/roster/401');
      await assertPageHygiene(page, 'ROS-02 /roster/401');
      await expectVisible(page.locator('#gen-runs-h'));
      await expectVisible(page.locator('#ver-summary-h'));

      // ROS-04 Draft Review
      await navigateInApp(page, '/roster/401/draft');
      await assertPageHygiene(page, 'ROS-04 /roster/401/draft');
      await expectVisible(page.getByText(/Draft — not published/i).first());

      // ROS-05 Manual Draft Assignment on v502
      await navigateInApp(page, '/roster/401/versions/502/assign?holidayId=201&slotType=PRIMARY&slotNumber=1&assignmentId=705');
      await assertPageHygiene(page, 'ROS-05 /roster/401/versions/502/assign');
      await page.getByLabel(/Eligible and available employee/i).selectOption('102');
      await page.getByLabel(/Audit reason/i).fill('Tier 1 manual rebalance');
      await page.getByRole('button', { name: /Save manual reassignment/i }).click();
      await confirmOpenDialog(page, /Confirm assignment/i);
      await page.waitForFunction(() => !window.location.pathname.includes('/assign'), { timeout: 5000 }).catch(() => {});
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'ROS-02 after manual assign');

      // ROS-03 Generate Draft -> creates fresh draft (parentVersionId: null) that Admin can publish in ROS-06
      await navigateInApp(page, '/roster/401/generate');
      await assertPageHygiene(page, 'ROS-03 /roster/401/generate');
      await page.getByRole('button', { name: /Generate draft roster/i }).click();
      await confirmOpenDialog(page, /Generate draft/i);
      await expectVisible(page.getByRole('heading', { level: 2, name: /Generation Run #/i }));

      // Navigate via Inspect generated draft and then Review & publish (ROS-06)
      await page.getByRole('link', { name: /Inspect generated draft/i }).click();
      await waitForAppSettled(page);
      await page.getByRole('link', { name: /Review & publish/i }).click();
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'ROS-06 /publish');
      await page.getByRole('button', { name: /Publish official roster/i }).click();
      await confirmOpenDialog(page, /Publish roster/i);
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'ROS-02 after publish');
      await expectVisible(page.getByText(/Published official version/i));

      // ROS-07 History & Reasoned Revision
      await navigateInApp(page, '/roster/401/history');
      await assertPageHygiene(page, 'ROS-07 /roster/401/history');
      await page.getByLabel(/Revision reason/i).fill('Tier 1 correction revision');
      await page.getByLabel(/Employee ID \(for ASSIGNMENT\)/i).fill('102');
      await page.getByRole('button', { name: /Create reasoned draft revision/i }).click();
      await confirmOpenDialog(page, /Create revision/i);
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'ROS-02 after revision');

      monitor.assertClean('T1-06');
    } finally {
      await context.close();
    }
  });

  await runner.test('T1', 'T1-07', 'AVL-01/02 Availability submit, detail, update & withdraw', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.MEMBER);
    try {
      await navigateInApp(page, '/availability');
      await assertPageHygiene(page, 'AVL-01 /availability');
      await page.getByLabel(/Declaration type/i).selectOption('AVAILABLE');
      await page.getByLabel(/Reason code/i).fill('EXTRA_COV');
      await page.getByLabel(/Start date/i).fill('2027-02-15');
      await page.getByLabel(/End date/i).fill('2027-02-16');
      await page.getByLabel(/Note/i).fill('Available for extra support');
      await page.getByRole('button', { name: /Submit availability/i }).click();
      await waitForAppSettled(page);
      await expectVisible(page.getByText(/EXTRA_COV/));

      // Open newly created availability detail (first Manage link or row matching EXTRA_COV)
      const createdRow = page.locator('tr', { hasText: 'EXTRA_COV' });
      await createdRow.getByRole('link', { name: /Manage/i }).click();
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'AVL-02 /availability/:id');

      await page.getByLabel(/^Note$/i).fill('Updated availability note');
      await page.getByRole('button', { name: /Save update/i }).click();
      await waitForAppSettled(page);

      await page.getByRole('button', { name: /Withdraw declaration/i }).click();
      await confirmOpenDialog(page, /Withdraw declaration/i);
      await waitForAppSettled(page);
      await assertPageHygiene(page, 'AVL-01 after withdraw');

      monitor.assertClean('T1-07');
    } finally {
      await context.close();
    }
  });

  await runner.test('T1', 'T1-08', 'REP-01/02/03, STB-01 & DUT-01 Replacements, Standby activation & 7 Duty History dimensions', async () => {
    // Member: REP-01 & REP-02
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.MEMBER);
      try {
        await navigateInApp(page, '/replacements/new');
        await assertPageHygiene(page, 'REP-01 /replacements/new');
        await page.getByLabel(/Published assignment ID/i).fill('701');
        await page.getByLabel(/Reason for unavailability/i).fill('Family travel conflict');
        await page.getByRole('button', { name: /Submit unavailability request/i }).click();
        await confirmOpenDialog(page, /Submit request/i);
        await waitForAppSettled(page);
        await assertPageHygiene(page, 'REP-02 /replacements/:newId');
        await expectVisible(page.locator('#rep-summary-h'));
        await expectVisible(page.locator('#rep-hist-h'));
        monitor.assertClean('T1-08 Member');
      } finally {
        await context.close();
      }
    }

    // Approver: REP-02, REP-03 (Standby first + approve), STB-01 (activate standby), DUT-01 (7 dimensions)
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.APPROVER);
      try {
        await navigateInApp(page, '/replacements');
        await assertPageHygiene(page, 'REP-02 /replacements');
        await page.getByLabel(/Request status/i).selectOption('AWAITING_MANAGER_DECISION');
        await page.getByRole('button', { name: /^Filter$/i }).click();
        await waitForAppSettled(page);

        await navigateInApp(page, '/replacements/801');
        await assertPageHygiene(page, 'REP-03 /replacements/801');
        await expectVisible(page.locator('#rep-decide-h'));

        // Verify designated Standby (Liam Chen) is listed first in candidates table
        const firstCandidateRow = page.locator('table tbody tr').first();
        await expectVisible(firstCandidateRow);
        const firstRowText = await firstCandidateRow.innerText();
        assert.match(firstRowText, /Liam Chen/i, 'Designated Standby candidate must be listed first');

        await page.getByLabel(/Select eligible replacement employee/i).selectOption('102');
        await page.getByLabel(/Decision reason/i).fill('Designated standby confirmed');
        await page.getByRole('button', { name: /Submit Manager decision/i }).click();
        await confirmOpenDialog(page, /Approve replacement/i);
        await waitForAppSettled(page);
        await expectVisible(page.getByText(/Approved/i).first());

        // STB-01 Standby and activation
        await navigateInApp(page, '/standby');
        await assertPageHygiene(page, 'STB-01 /standby');
        await page.getByRole('button', { name: /Use for activation/i }).first().click();
        await page.getByLabel(/Primary assignment ID/i).fill('701');
        await page.getByLabel(/Activation reason/i).fill('Approved replacement activation');
        await page.getByRole('button', { name: /Record standby activation/i }).click();
        await confirmOpenDialog(page, /Record activation/i);
        await waitForAppSettled(page);
        await expectVisible(page.getByText(/Activation #\d+ recorded/i));

        // DUT-01 Workload & Assignment History across all 7 dimensions
        await navigateInApp(page, '/duty-history');
        await assertPageHygiene(page, 'DUT-01 /duty-history');
        const dimensions = [
          'EFFECTIVE_PUBLISHED_PRIMARY_CREDIT',
          'FUTURE_PUBLISHED_PRIMARY',
          'STANDBY_ASSIGNMENT',
          'STANDBY_ACTIVATION',
          'DRAFT_ASSIGNMENT',
          'REPLACED_ASSIGNMENT',
          'CANCELLED_ASSIGNMENT',
        ];
        for (const dim of dimensions) {
          await page.getByLabel(/Workload \/ history dimension/i).selectOption(dim);
          await page.getByRole('button', { name: /Inspect dimension/i }).click();
          await waitForAppSettled(page);
          await assertPageHygiene(page, `DUT-01 ${dim}`);
        }

        monitor.assertClean('T1-08 Approver');
      } finally {
        await context.close();
      }
    }
  });

  await runner.test('T1', 'T1-09', 'HO-01, NOT-01, HELP-01/02 & AUD-01 Shift Notes, Notifications, Help & Audit', async () => {
    // Member: HO-01 & NOT-01
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.MEMBER);
      try {
        await navigateInApp(page, '/handover');
        await assertPageHygiene(page, 'HO-01 /handover');
        await page.getByLabel(/^Assignment ID/i).fill('701');
        await page.getByLabel(/Operational summary/i).fill('Holiday shift handover summary');
        await page.getByLabel(/Item title/i).fill('Runbook link');
        await page.getByLabel(/Details/i).fill('Follow primary escalation runbook.');
        await page.getByRole('button', { name: /Submit handover report/i }).click();
        await waitForAppSettled(page);
        await assertPageHygiene(page, 'HO-01 /handover/:id');
        await expectVisible(page.getByRole('link', { name: /Create corrective addendum/i }));

        await navigateInApp(page, '/notifications');
        await assertPageHygiene(page, 'NOT-01 /notifications');
        await page.getByRole('button', { name: /Mark read/i }).first().click();
        await waitForAppSettled(page);
        await expectVisible(page.getByText(/^Read /i).first());

        monitor.assertClean('T1-09 Member');
      } finally {
        await context.close();
      }
    }

    // Admin: HELP-01 & HELP-02
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN);
      try {
        await navigateInApp(page, '/help');
        await assertPageHygiene(page, 'HELP-01 /help');
        await page.getByLabel(/Search articles/i).fill('Drafts');
        await page.getByRole('button', { name: /^Search$/i }).click();
        await waitForAppSettled(page);
        await expectVisible(page.getByText(/Roster Drafts vs Published Versions/i));

        // Open article 1 (note: pre-M1/M5 baseline contains "(FDR-03)" in h1 which assertPageHygiene flags cleanly)
        await navigateInApp(page, '/help/1');
        await assertPageHygiene(page, 'HELP-01 /help/1');

        // HELP-02 Create & Edit
        await navigateInApp(page, '/help/manage/new');
        await assertPageHygiene(page, 'HELP-02 /help/manage/new');
        await page.getByLabel(/^Title/i).fill('Holiday Operations Quick Guide');
        await page.getByLabel(/Publication status/i).selectOption('PUBLISHED');
        await page.getByLabel(/Summary/i).fill('Quick guide summary.');
        await page.getByLabel(/Article content/i).fill('# Overview\n- Check schedule calendar.');
        await expectVisible(page.locator('#help-preview-heading'));
        await page.getByRole('button', { name: /Create article/i }).click();
        await waitForAppSettled(page);
        await assertPageHygiene(page, 'HELP-01 created article');

        await page.getByRole('link', { name: /Edit article/i }).click();
        await waitForAppSettled(page);
        await assertPageHygiene(page, 'HELP-02 /help/manage/:id/edit');
        await page.getByRole('button', { name: /Save new version/i }).click();
        await waitForAppSettled(page);
        await assertPageHygiene(page, 'HELP-01 edited article');

        monitor.assertClean('T1-09 Admin');
      } finally {
        await context.close();
      }
    }

    // Auditor: AUD-01
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.AUDITOR);
      try {
        await navigateInApp(page, '/audit');
        await assertPageHygiene(page, 'AUD-01 /audit');
        await expectVisible(page.getByText(/Roster Version Published|ROSTER_VERSION_PUBLISHED/i).first());
        await page.getByLabel(/From date/i).fill('2026-01-01');
        await page.getByRole('button', { name: /^Filter$/i }).click();
        await waitForAppSettled(page);
        await assertPageHygiene(page, 'AUD-01 filtered');
        monitor.assertClean('T1-09 Auditor');
      } finally {
        await context.close();
      }
    }
  });
}

async function expectVisible(locator, timeout = 5000) {
  await locator.waitFor({ state: 'visible', timeout });
}
