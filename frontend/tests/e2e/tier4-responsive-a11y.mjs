import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  DEMO_ACCOUNTS,
  assertNoHorizontalOverflow,
  assertPageHygiene,
  createSessionPage,
  navigateInApp,
  runWcagChecks,
  waitForAppSettled,
} from './lib/harness.mjs';

const VIEWPORTS = [
  { name: 'Desktop', width: 1440, height: 900, mobileDrawer: false },
  { name: 'Laptop', width: 1280, height: 800, mobileDrawer: false },
  { name: 'Tablet', width: 820, height: 1180, mobileDrawer: true },
  { name: 'Mobile', width: 390, height: 844, mobileDrawer: true },
  { name: 'SmallMobile', width: 360, height: 800, mobileDrawer: true },
];

export async function runTier4ResponsiveA11y(runner, { browser, baseUrl, screenshotsDir = null }) {
  console.log('\n=== Tier 4: Responsive (5 Viewports), WCAG 2.2 AA, Reduced Motion & Visual Screenshots ===');

  if (screenshotsDir) {
    await fs.mkdir(screenshotsDir, { recursive: true });
  }

  const saveShot = async (page, filename) => {
    if (!screenshotsDir) return;
    await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: false });
  };

  for (const vp of VIEWPORTS) {
    await runner.test('T4', `T4-VP-${vp.name}`, `Responsive layout & zero horizontal overflow at ${vp.width}x${vp.height} (${vp.name})`, async () => {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN, {
        viewport: { width: vp.width, height: vp.height },
      });
      try {
        for (const route of ['/', '/calendar', '/holidays', '/employees', '/availability', '/replacements', '/standby', '/audit']) {
          await navigateInApp(page, route);
          await assertPageHygiene(page, `${vp.name} ${route}`);
          await assertNoHorizontalOverflow(page, vp.width, `${vp.name} ${route}`);
        }

        // Verify Team Grid usable without page-level overflow
        await navigateInApp(page, '/calendar');
        await page.getByRole('tab', { name: /^Team Grid$/i }).click();
        await page.locator('.cal-team-table').waitFor({ state: 'visible', timeout: 5000 });
        await assertNoHorizontalOverflow(page, vp.width, `${vp.name} /calendar Team Grid`);

        // Verify mobile/tablet header and drawer behavior
        if (vp.mobileDrawer) {
          const headerBox = await page.locator('header.app-header').boundingBox();
          assert.ok(headerBox && headerBox.height <= 96, `${vp.name}: mobile header height (${headerBox?.height}px) should stay compact`);

          const toggleBtn = page.getByRole('button', { name: /Toggle navigation/i });
          await toggleBtn.click();
          const drawerOpen = await page.locator('#app-sidebar').getAttribute('data-drawer-open');
          assert.equal(drawerOpen, 'true', `${vp.name}: sidebar drawer should open on toggle`);
          await page.keyboard.press('Escape');
          const drawerAfterEsc = await page.locator('#app-sidebar').getAttribute('data-drawer-open');
          assert.equal(drawerAfterEsc, 'false', `${vp.name}: Escape should close mobile drawer`);
        }

        monitor.assertClean(`T4-VP-${vp.name}`);
      } finally {
        await context.close();
      }
    });
  }

  await runner.test('T4', 'T4-A11Y-01', 'WCAG 2.2 AA landmarks, headings, labels, contrast, skip-link, focus-visible & reduced-motion', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN, {
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    });
    try {
      for (const route of ['/', '/calendar', '/holidays', '/employees', '/availability', '/replacements/801', '/standby', '/audit']) {
        await navigateInApp(page, route);
        await runWcagChecks(page, `WCAG ${route}`);
      }

      // Skip link activation moves focus to #main-heading
      await navigateInApp(page, '/');
      await page.locator('a.skip-link').focus();
      await page.locator('a.skip-link').press('Enter');
      const focusedId = await page.evaluate(() => document.activeElement?.id || '');
      assert.equal(focusedId, 'main-heading', 'Activating skip link must focus #main-heading');

      // Keyboard Tab + focus-visible indicator check
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      const focusStyle = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        const cs = getComputedStyle(el);
        return {
          tag: el.tagName,
          outlineStyle: cs.outlineStyle,
          outlineWidth: parseFloat(cs.outlineWidth || '0'),
          boxShadow: cs.boxShadow,
        };
      });
      assert.ok(
        focusStyle && ((focusStyle.outlineStyle !== 'none' && focusStyle.outlineWidth > 0) || (focusStyle.boxShadow && focusStyle.boxShadow !== 'none')),
        `Keyboard-focused element must expose visible focus indicator: ${JSON.stringify(focusStyle)}`
      );

      // Reduced motion verification
      const transitionDuration = await page.evaluate(() => {
        const el = document.querySelector('.btn, .app-nav__link, main');
        if (!el) return 0;
        const dur = getComputedStyle(el).transitionDuration || '0s';
        return Math.max(...dur.split(',').map((s) => parseFloat(s) || 0));
      });
      assert.ok(transitionDuration <= 0.05, `prefers-reduced-motion should minimize transitionDuration (got ${transitionDuration}s)`);

      monitor.assertClean('T4-A11Y-01');
    } finally {
      await context.close();
    }
  });

  await runner.test('T4', 'T4-A11Y-02', 'WCAG 2.2 AA interactive widgets: tablist ArrowRight/ArrowLeft & <dialog> Escape close + focus restore', async () => {
    const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN, {
      viewport: { width: 1440, height: 900 },
    });
    try {
      // Dialog Escape close & focus restore on /employees/103
      await navigateInApp(page, '/employees/103');
      const inviteBtn = page.getByRole('button', { name: /Invite account/i });
      await inviteBtn.click();
      const dialog = page.locator('dialog[open]');
      await dialog.waitFor({ state: 'visible', timeout: 4000 });
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden', timeout: 4000 });
      const restoredText = await page.evaluate(() => document.activeElement?.textContent?.trim() || '');
      assert.match(restoredText, /Invite account/i, 'Closing <dialog> with Escape must restore focus to invoking button');

      // Tablist ArrowRight/ArrowLeft keyboard navigation on /calendar
      await navigateInApp(page, '/calendar');
      const monthTab = page.getByRole('tab', { name: /^Month$/i });
      await monthTab.focus();
      await page.keyboard.press('ArrowRight');
      const weekSelected = await page.getByRole('tab', { name: /^Week$/i }).getAttribute('aria-selected');
      assert.equal(weekSelected, 'true', 'ArrowRight on calendar tablist should activate Week tab');
      await page.keyboard.press('ArrowLeft');
      const monthSelected = await monthTab.getAttribute('aria-selected');
      assert.equal(monthSelected, 'true', 'ArrowLeft on calendar tablist should return to Month tab');

      monitor.assertClean('T4-A11Y-02');
    } finally {
      await context.close();
    }
  });

  await runner.test('T4', 'T4-SHOTS', 'Capture all 19 visual evidence screenshots across Desktop, Mobile, Small Mobile & roles', async () => {
    // 1-6, 9-10, 17-19: Admin Desktop (1440x900)
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN, {
        viewport: { width: 1440, height: 900 },
      });
      try {
        await saveShot(page, '01-admin-dashboard.png');

        await navigateInApp(page, '/calendar');
        await saveShot(page, '02-calendar-month.png');

        await page.getByRole('tab', { name: /^Week$/i }).click();
        await saveShot(page, '03-calendar-week.png');

        await page.getByRole('tab', { name: /^Team Grid$/i }).click();
        await saveShot(page, '04-calendar-team-grid.png');

        await page.getByRole('tab', { name: /^Month$/i }).click();
        await page.locator('.cal-pill', { hasText: /Maya Patel/i }).first().click();
        await page.locator('aside[aria-label="Schedule inspector"]').waitFor({ state: 'visible', timeout: 4000 });
        await saveShot(page, '05-schedule-inspector.png');

        await navigateInApp(page, '/employees');
        await saveShot(page, '06-org-people.png');

        await navigateInApp(page, '/standby');
        await saveShot(page, '09-backup-standby.png');

        await navigateInApp(page, '/holidays');
        await saveShot(page, '10-holiday-management.png');

        await navigateInApp(page, '/handover');
        await saveShot(page, '17-shift-notes.png');

        await navigateInApp(page, '/help');
        await saveShot(page, '18-help-centre.png');

        await navigateInApp(page, '/audit');
        await saveShot(page, '19-audit-log.png');

        monitor.assertClean('T4-SHOTS Admin Desktop');
      } finally {
        await context.close();
      }
    }

    // 7, 11, 12: Member Desktop (1440x900)
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.MEMBER, {
        viewport: { width: 1440, height: 900 },
      });
      try {
        await saveShot(page, '12-employee-dashboard.png');

        const startGuide = page.getByRole('button', { name: /Start guide|Resume guide|Guide/i }).first();
        await startGuide.click();
        await page.locator('.tour-popover, .onboarding-tour, dialog[open]').first().waitFor({ state: 'visible', timeout: 4000 });
        await saveShot(page, '11-interactive-onboarding.png');
        await page.keyboard.press('Escape').catch(() => {});

        await navigateInApp(page, '/availability');
        await saveShot(page, '07-availability.png');

        monitor.assertClean('T4-SHOTS Member Desktop');
      } finally {
        await context.close();
      }
    }

    // 8: Approver Desktop /replacements/801
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.APPROVER, {
        viewport: { width: 1440, height: 900 },
      });
      try {
        await navigateInApp(page, '/replacements/801');
        await saveShot(page, '08-replacement-requests.png');
        monitor.assertClean('T4-SHOTS Approver Desktop');
      } finally {
        await context.close();
      }
    }

    // 15: Team Lead Desktop /
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.TEAM_LEAD, {
        viewport: { width: 1440, height: 900 },
      });
      try {
        await saveShot(page, '15-team-lead-dashboard.png');
        monitor.assertClean('T4-SHOTS Team Lead Desktop');
      } finally {
        await context.close();
      }
    }

    // 13: Mobile Dashboard (Member 390x844) & 14: Mobile Calendar (Admin 390x844)
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.MEMBER, {
        viewport: { width: 390, height: 844 },
      });
      try {
        await assertNoHorizontalOverflow(page, 390, 'Mobile Dashboard 390x844');
        await saveShot(page, '13-mobile-dashboard.png');
        monitor.assertClean('T4-SHOTS Mobile Dashboard');
      } finally {
        await context.close();
      }
    }
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN, {
        viewport: { width: 390, height: 844 },
      });
      try {
        await navigateInApp(page, '/calendar');
        await assertNoHorizontalOverflow(page, 390, 'Mobile Calendar 390x844');
        await saveShot(page, '14-mobile-calendar.png');
        monitor.assertClean('T4-SHOTS Mobile Calendar');
      } finally {
        await context.close();
      }
    }

    // 16: Small Mobile Calendar Team Grid (Admin 360x800)
    {
      const { context, page, monitor } = await createSessionPage(browser, baseUrl, DEMO_ACCOUNTS.ADMIN, {
        viewport: { width: 360, height: 800 },
      });
      try {
        await navigateInApp(page, '/calendar');
        await page.getByRole('tab', { name: /^Team Grid$/i }).click();
        await page.locator('.cal-team-table').waitFor({ state: 'visible', timeout: 5000 });
        await assertNoHorizontalOverflow(page, 360, 'Small Mobile Team Grid 360x800');
        await saveShot(page, '16-small-mobile-calendar.png');
        monitor.assertClean('T4-SHOTS Small Mobile Calendar');
      } finally {
        await context.close();
      }
    }
  });
}
