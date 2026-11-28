import { el, clear, announceStatus } from './utils/dom.js';
import { getConfig, ConfigurationError } from './config.js';
import { createRouter } from './router.js';
import { setUnauthorizedHandler } from './api/client.js';
import * as sessionApi from './api/session.js';
import * as notificationsApi from './api/notifications.js';
import {
  clearSession,
  getSnapshot,
  hasAnyPermission,
  hasPermission,
  hasScope,
  setPendingReturnTo,
  setSession,
  setUnreadCount,
} from './state/session-store.js';
import { renderAppShell } from './components/shell.js';
import { createAlert } from './components/alert.js';
import { openOnboardingModal } from './features/onboarding/onboarding-panel.js';
import {
  renderAccountSecurityPage,
  renderActivateAccountPage,
  renderForgotPasswordPage,
  renderLoginPage,
  renderResetPasswordPage,
  renderSessionExpiredPage,
  renderStatusNoticePage,
} from './features/auth/auth-pages.js';
import { renderDashboardPage } from './features/dashboard/dashboard-page.js';
import { renderCalendarPage } from './features/calendar/calendar-page.js';
import { renderTeamLeadAssignmentsPage } from './features/organization/team-lead-page.js';
import {
  renderApprovalGrantsPage,
  renderEmployeeDetailPage,
  renderEmployeeFormPage,
  renderEmployeeListPage,
  renderTeamsPage,
} from './features/organization/organization-pages.js';
import { renderHolidayDetailPage, renderHolidaysPage } from './features/holidays/holidays-pages.js';
import {
  renderAvailabilityDetailPage,
  renderAvailabilityPage,
} from './features/availability/availability-pages.js';
import {
  renderGenerateRosterPage,
  renderManualAssignPage,
  renderPublishRosterPage,
  renderRosterHistoryPage,
  renderRosterOverviewPage,
  renderRosterPeriodsPage,
} from './features/roster/roster-pages.js';
import {
  renderCreateReplacementPage,
  renderReplacementDetailPage,
  renderReplacementListPage,
} from './features/replacements/replacements-pages.js';
import { renderStandbyPage } from './features/standby/standby-page.js';
import { renderDutyHistoryPage } from './features/history/history-page.js';
import {
  renderHandoverDetailPage,
  renderHandoverListPage,
} from './features/handover/handover-pages.js';
import { renderNotificationsPage } from './features/notifications/notifications-page.js';
import {
  renderHelpArticleDetailPage,
  renderHelpCentrePage,
  renderHelpManagePage,
} from './features/help/help-pages.js';
import { renderAuditPage } from './features/audit/audit-page.js';

const APP_TITLE = 'Holiday Support Roster';

const ROUTES = [
  { path: '/login', public: true, title: 'Sign in', render: renderLoginPage },
  { path: '/forgot-password', public: true, title: 'Forgot password', render: renderForgotPasswordPage },
  { path: '/reset-password', public: true, title: 'Reset password', render: renderResetPasswordPage },
  { path: '/activate', public: true, title: 'Activate account', render: renderActivateAccountPage },
  { path: '/session-expired', public: true, title: 'Session expired', render: renderSessionExpiredPage },
  { path: '/unauthorized', allowAnySession: true, title: 'Access denied', render: (ctx) => renderStatusNoticePage({ ...ctx, mode: 'unauthorized', isAuthenticated: Boolean(ctx.session) }) },
  { path: '/unavailable', allowAnySession: true, title: 'Unavailable', render: (ctx) => renderStatusNoticePage({ ...ctx, mode: 'unavailable', isAuthenticated: Boolean(ctx.session) }) },

  { path: '/', title: 'Overview', breadcrumbs: () => [{ label: 'Overview', path: '/' }], render: renderDashboardPage },
  { path: '/calendar', title: 'Schedule Calendar', check: () => hasAnyPermission(['ROSTER.READ', 'CALENDAR.READ']), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Schedule Calendar' }], render: renderCalendarPage },
  { path: '/account', title: 'Account & Security', breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Account & Security' }], render: renderAccountSecurityPage },

  { path: '/availability', title: 'My availability', check: () => hasAnyPermission(['AVAILABILITY.MANAGE_OWN', 'AVAILABILITY.READ', 'AVAILABILITY.MANAGE_ON_BEHALF']), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'My availability' }], render: renderAvailabilityPage },
  { path: '/availability/:availabilityId', title: 'Availability detail', check: () => hasAnyPermission(['AVAILABILITY.MANAGE_OWN', 'AVAILABILITY.READ', 'AVAILABILITY.MANAGE_ON_BEHALF']), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'My availability', path: '/availability' }, { label: 'Record' }], render: renderAvailabilityDetailPage },

  { path: '/holidays', title: 'Holidays', check: () => hasPermission('CALENDAR.READ'), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Holidays' }], render: renderHolidaysPage },
  { path: '/holidays/new', title: 'Add holiday', check: () => hasPermission('CALENDAR.MANAGE'), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Holidays', path: '/holidays' }, { label: 'New' }], render: renderHolidayDetailPage },
  { path: '/holidays/:holidayId', title: 'Holiday detail', check: () => hasPermission('CALENDAR.READ'), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Holidays', path: '/holidays' }, { label: 'Detail' }], render: renderHolidayDetailPage },

  { path: '/employees', title: 'People & Teams', check: () => hasPermission('ORG.USER.READ') && (hasScope('ORG') || hasScope('TEAM') || hasScope('OWN')), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'People & Teams' }], render: renderEmployeeListPage },
  { path: '/employees/new', title: 'Add employee', check: () => hasPermission('ORG.USER.MANAGE') && hasScope('ORG'), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'People & Teams', path: '/employees' }, { label: 'New' }], render: renderEmployeeFormPage },
  { path: '/employees/:employeeId', title: 'Person details', check: () => hasPermission('ORG.USER.READ') && (hasScope('ORG') || hasScope('TEAM') || hasScope('OWN')), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'People & Teams', path: '/employees' }, { label: 'Details' }], render: renderEmployeeDetailPage },
  { path: '/employees/:employeeId/edit', title: 'Edit person', check: () => hasPermission('ORG.USER.MANAGE') && hasScope('ORG'), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'People & Teams', path: '/employees' }, { label: 'Edit' }], render: renderEmployeeFormPage },
  { path: '/teams', title: 'Teams', check: () => hasPermission('ORG.USER.READ') && (hasScope('ORG') || hasScope('TEAM')), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'People & Teams', path: '/employees' }, { label: 'Teams' }], render: renderTeamsPage },
  { path: '/teams/:teamId/team-leads', title: 'Team Lead history', check: () => hasPermission('ORG.USER.READ') && (hasScope('ORG') || hasScope('TEAM')), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Teams', path: '/teams' }, { label: 'Team Lead history' }], render: renderTeamLeadAssignmentsPage },
  { path: '/authority/grants', title: 'Approval Authority', check: () => hasPermission('ORG.AUTHORITY.MANAGE') && hasScope('ORG'), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Approval Authority' }], render: renderApprovalGrantsPage },

  { path: '/roster', title: 'Schedules', check: () => hasPermission('ROSTER.READ'), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Schedules' }], render: renderRosterPeriodsPage },
  { path: '/roster/:periodId', title: 'Schedule overview', check: () => hasPermission('ROSTER.READ'), breadcrumbs: (p) => [{ label: 'Overview', path: '/' }, { label: 'Schedules', path: '/roster' }, { label: `Period #${p.periodId}` }], render: renderRosterOverviewPage },
  { path: '/roster/:periodId/draft', title: 'Draft review', check: () => hasPermission('ROSTER.READ'), breadcrumbs: (p) => [{ label: 'Overview', path: '/' }, { label: 'Schedules', path: '/roster' }, { label: `Period #${p.periodId}`, path: `/roster/${p.periodId}` }, { label: 'Draft review' }], render: (ctx) => renderRosterOverviewPage({ ...ctx, query: new URLSearchParams({ status: 'DRAFT' }) }) },
  { path: '/roster/:periodId/generate', title: 'Generate draft', check: () => hasPermission('ROSTER.GENERATE'), breadcrumbs: (p) => [{ label: 'Overview', path: '/' }, { label: 'Schedules', path: '/roster' }, { label: `Period #${p.periodId}`, path: `/roster/${p.periodId}` }, { label: 'Generate draft' }], render: renderGenerateRosterPage },
  { path: '/roster/:periodId/history', title: 'Version history', check: () => hasPermission('ROSTER.READ'), breadcrumbs: (p) => [{ label: 'Overview', path: '/' }, { label: 'Schedules', path: '/roster' }, { label: `Period #${p.periodId}`, path: `/roster/${p.periodId}` }, { label: 'History' }], render: renderRosterHistoryPage },
  { path: '/roster/:periodId/versions/:versionId/assign', title: 'Manual assignment', check: () => hasPermission('ROSTER.MANUAL_ASSIGN'), breadcrumbs: (p) => [{ label: 'Overview', path: '/' }, { label: 'Schedules', path: '/roster' }, { label: `Period #${p.periodId}`, path: `/roster/${p.periodId}` }, { label: 'Assign slot' }], render: renderManualAssignPage },
  { path: '/roster/:periodId/versions/:versionId/publish', title: 'Publish schedule', check: () => hasPermission('ROSTER.PUBLISH'), breadcrumbs: (p) => [{ label: 'Overview', path: '/' }, { label: 'Schedules', path: '/roster' }, { label: `Period #${p.periodId}`, path: `/roster/${p.periodId}` }, { label: 'Publish' }], render: renderPublishRosterPage },

  { path: '/replacements', title: 'Requests', check: () => hasAnyPermission(['REPLACEMENT.READ', 'REPLACEMENT.REQUEST_OWN', 'REPLACEMENT.APPROVE']), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Requests' }], render: renderReplacementListPage },
  { path: '/replacements/new', title: 'Report unavailability', check: () => hasPermission('REPLACEMENT.REQUEST_OWN'), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Requests', path: '/replacements' }, { label: 'Report unavailability' }], render: renderCreateReplacementPage },
  { path: '/replacements/:requestId', title: 'Request detail', check: () => hasAnyPermission(['REPLACEMENT.READ', 'REPLACEMENT.REQUEST_OWN', 'REPLACEMENT.APPROVE']), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Requests', path: '/replacements' }, { label: 'Detail' }], render: renderReplacementDetailPage },

  { path: '/standby', title: 'Backup & Standby', check: () => hasAnyPermission(['ROSTER.READ', 'STANDBY.ACTIVATE']), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Backup & Standby' }], render: renderStandbyPage },
  { path: '/duty-history', title: 'Work History', check: () => hasPermission('DUTY.REPORT.READ') && (hasScope('ORG') || hasScope('TEAM') || hasScope('OWN')), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Work History' }], render: renderDutyHistoryPage },

  { path: '/handover', title: 'Shift Notes', check: () => hasAnyPermission(['HANDOVER.READ', 'HANDOVER.CREATE']), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Shift Notes' }], render: renderHandoverListPage },
  { path: '/handover/:handoverId', title: 'Shift note detail', check: () => hasPermission('HANDOVER.READ'), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Shift Notes', path: '/handover' }, { label: 'Note' }], render: renderHandoverDetailPage },

  { path: '/notifications', title: 'Notifications', check: () => hasPermission('NOTIFICATION.READ'), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Notifications' }], render: renderNotificationsPage },
  { path: '/help', title: 'Help Centre', check: () => hasAnyPermission(['HELP.READ', 'HELP.MANAGE']), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Help Centre' }], render: renderHelpCentrePage },
  { path: '/help/manage/new', title: 'Create help article', check: () => hasPermission('HELP.MANAGE'), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Help Centre', path: '/help' }, { label: 'New article' }], render: renderHelpManagePage },
  { path: '/help/manage/:articleId/edit', title: 'Edit help article', check: () => hasPermission('HELP.MANAGE'), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Help Centre', path: '/help' }, { label: 'Edit article' }], render: renderHelpManagePage },
  { path: '/help/:articleId', title: 'Help article', check: () => hasAnyPermission(['HELP.READ', 'HELP.MANAGE']), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Help Centre', path: '/help' }, { label: 'Article' }], render: renderHelpArticleDetailPage },

  { path: '/audit', title: 'Audit Log', check: () => hasPermission('AUDIT.READ'), breadcrumbs: () => [{ label: 'Overview', path: '/' }, { label: 'Audit Log' }], render: renderAuditPage },
];

export async function startApplication(rootEl) {
  try {
    getConfig();
  } catch (err) {
    clear(rootEl);
    rootEl.appendChild(
      el(
        'main',
        { id: 'main-content', className: 'auth-layout' },
        el(
          'section',
          { className: 'auth-card', 'aria-labelledby': 'config-error-heading' },
          el('h1', { id: 'config-error-heading', tabindex: '-1' }, 'Configuration required'),
          createAlert({
            variant: 'error',
            title: 'Application startup blocked',
            message:
              err instanceof ConfigurationError
                ? err.message
                : 'Invalid runtime environment configuration.',
          })
        )
      )
    );
    return;
  }

  const router = createRouter(ROUTES);
  let activeRouteController = null;
  let sidebarCollapsed = false;

  const refreshUnread = async () => {
    if (!hasPermission('NOTIFICATION.READ')) return;
    try {
      const res = await notificationsApi.getUnreadNotificationCount();
      if (res && typeof res.count === 'number') {
        setUnreadCount(res.count);
      }
    } catch {
      // Non-critical utility count failure does not block UI
    }
  };

  setUnauthorizedHandler(() => {
    activeRouteController?.abort();
    const matched = router.match();
    if (!matched.route?.public) {
      setPendingReturnTo(matched.pathname + window.location.search);
    }
    clearSession();
    router.navigate('/session-expired', { replace: true });
  });

  const handleLogout = async () => {
    try {
      await sessionApi.logout();
    } catch {
      // Clear local session state regardless of server state
    }
    activeRouteController?.abort();
    clearSession();
    router.navigate('/login', { replace: true });
  };

  const renderCurrentRoute = async () => {
    activeRouteController?.abort();
    activeRouteController = new AbortController();
    const { signal } = activeRouteController;

    const { session, unreadCount } = getSnapshot();
    const { route, pathname, params, query } = router.match();

    if (!route) {
      document.title = `Unavailable | ${APP_TITLE}`;
      if (!session) {
        renderStatusNoticePage({
          container: rootEl,
          navigate: router.navigate,
          mode: 'unavailable',
          isAuthenticated: false,
        });
      } else {
        const { shell, contentContainer } = renderAppShell({
          session,
          unreadCount,
          currentPath: pathname,
          pageTitle: 'Unavailable',
          breadcrumbs: [{ label: 'Overview', path: '/' }, { label: 'Unavailable' }],
          sidebarCollapsed,
          onToggleSidebar: (next) => {
            sidebarCollapsed = next;
          },
          onNavigate: router.navigate,
          onOpenOnboarding: () =>
            openOnboardingModal({ onboarding: getSnapshot().onboarding ?? session.onboarding }),
          onLogout: handleLogout,
          signal,
        });
        clear(rootEl);
        rootEl.appendChild(shell);
        renderStatusNoticePage({
          container: contentContainer,
          navigate: router.navigate,
          mode: 'unavailable',
          isAuthenticated: true,
        });
      }
      document.getElementById('main-heading')?.focus();
      return;
    }

    if (route.public) {
      if (session && pathname === '/login') {
        router.navigate('/', { replace: true });
        return;
      }
      document.title = `${route.title} | ${APP_TITLE}`;
      await route.render({
        container: rootEl,
        params,
        query,
        navigate: router.navigate,
        onAuthenticated: refreshUnread,
        signal,
      });
      document.getElementById('main-heading')?.focus();
      return;
    }

    if (!session) {
      if (route.allowAnySession) {
        document.title = `${route.title} | ${APP_TITLE}`;
        await route.render({
          container: rootEl,
          session: null,
          params,
          query,
          navigate: router.navigate,
          signal,
        });
        document.getElementById('main-heading')?.focus();
        return;
      }
      setPendingReturnTo(pathname + window.location.search);
      router.navigate('/login', { replace: true });
      return;
    }

    if (typeof route.check === 'function' && !route.check(session, params)) {
      document.title = `Access denied | ${APP_TITLE}`;
      const { shell, contentContainer } = renderAppShell({
        session,
        unreadCount,
        currentPath: pathname,
        pageTitle: 'Access denied',
        breadcrumbs: [{ label: 'Overview', path: '/' }, { label: 'Access denied' }],
        sidebarCollapsed,
        onToggleSidebar: (next) => {
          sidebarCollapsed = next;
        },
        onNavigate: router.navigate,
        onOpenOnboarding: () =>
          openOnboardingModal({ onboarding: getSnapshot().onboarding ?? session.onboarding }),
        onLogout: handleLogout,
        signal,
      });
      clear(rootEl);
      rootEl.appendChild(shell);
      renderStatusNoticePage({
        container: contentContainer,
        navigate: router.navigate,
        mode: 'unauthorized',
        isAuthenticated: true,
      });
      document.getElementById('main-heading')?.focus();
      return;
    }

    document.title = `${route.title} | ${APP_TITLE}`;
    const breadcrumbs = typeof route.breadcrumbs === 'function' ? route.breadcrumbs(params) : [];
    const { shell, contentContainer } = renderAppShell({
      session,
      unreadCount,
      currentPath: pathname,
      pageTitle: route.title,
      breadcrumbs,
      sidebarCollapsed,
      onToggleSidebar: (next) => {
        sidebarCollapsed = next;
      },
      onNavigate: router.navigate,
      onOpenOnboarding: () =>
        openOnboardingModal({ onboarding: getSnapshot().onboarding ?? session.onboarding }),
      onLogout: handleLogout,
      signal,
    });

    clear(rootEl);
    rootEl.appendChild(shell);

    await route.render({
      container: contentContainer,
      session,
      params,
      query,
      navigate: router.navigate,
      onLogout: handleLogout,
      signal,
    });

    if (!signal.aborted) {
      document.getElementById('main-heading')?.focus();
      announceStatus(`Navigated to ${route.title}`);
    }
  };

  window.addEventListener('popstate', () => {
    renderCurrentRoute();
  });

  // Bootstrap neutral shell -> verify session state via API-AUTH-03 (getCurrentSession)
  try {
    const session = await sessionApi.getCurrentSession({ skipUnauthorizedRedirect: true });
    setSession(session);
    await refreshUnread();
  } catch {
    clearSession();
  }

  await renderCurrentRoute();
}
