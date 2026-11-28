import { el, clear } from '../../utils/dom.js';
import { formatIsoDate, formatDateTimeUtc } from '../../utils/date.js';
import { createAlert, createSkeleton } from '../../components/alert.js';
import { createStatusBadge } from '../../components/status-badge.js';
import { hasAnyPermission, hasPermission, hasScope } from '../../state/session-store.js';
import * as rosterApi from '../../api/roster.js';
import * as replacementsApi from '../../api/replacements.js';
import * as notificationsApi from '../../api/notifications.js';
import * as historyApi from '../../api/history.js';
import * as holidaysApi from '../../api/holidays.js';
import { isAbortError } from '../../api/errors.js';

export async function renderDashboardPage({ container, session, navigate, signal }) {
  const user = session.user;
  const isRosterOperator = hasAnyPermission([
    'ROSTER.GENERATE',
    'ROSTER.PUBLISH',
    'CALENDAR.MANAGE',
    'ORG.USER.MANAGE',
  ]);
  const intro = isRosterOperator
    ? 'Review coverage, roster periods, and operational work that needs attention.'
    : hasPermission('REPLACEMENT.APPROVE')
      ? 'Review replacement decisions within your approved scope and monitor coverage.'
      : user.roles?.includes('TEAM_LEAD')
        ? 'Coordinate permitted team coverage, availability, and operational follow-up.'
        : 'Review your assignments, availability, and requests in one place.';
  const header = el(
    'div',
    { className: 'page-header dashboard-header' },
    el(
      'div',
      { className: 'page-header__title-group' },
      el('h1', { id: 'main-heading', tabindex: '-1' }, 'Overview'),
      el(
        'p',
        { className: 'muted' },
        intro
      )
    ),
    el(
      'div',
      { className: 'page-header__actions' },
      el(
        'button',
        {
          type: 'button',
          className: 'btn btn-secondary btn-sm',
          onClick: () => navigate('/'),
        },
        'Refresh'
      )
    )
  );

  const grid = el('div', { className: 'grid-12 dashboard-grid' });
  const loadingBox = createSkeleton({ rows: 4, label: 'Loading permitted dashboard panels…' });
  container.append(header, loadingBox, grid);

  const tasks = [];

  if (hasPermission('CALENDAR.READ')) {
    tasks.push(
      holidaysApi
        .listHolidays({ page: 0, pageSize: 5, signal })
        .then((res) => ({ key: 'holidays', res }))
        .catch((err) => ({ key: 'holidays', err }))
    );
  }

  if (hasPermission('ROSTER.READ')) {
    tasks.push(
      rosterApi
        .listRosterPeriods({ page: 0, pageSize: 5, signal })
        .then((res) => ({ key: 'periods', res }))
        .catch((err) => ({ key: 'periods', err }))
    );
  }

  if (hasAnyPermission(['REPLACEMENT.READ', 'REPLACEMENT.REQUEST_OWN', 'REPLACEMENT.APPROVE'])) {
    tasks.push(
      replacementsApi
        .listReplacementRequests({ status: 'AWAITING_MANAGER_DECISION', page: 0, pageSize: 5, signal })
        .then((res) => ({ key: 'replacements', res }))
        .catch((err) => ({ key: 'replacements', err }))
    );
  }

  if (hasPermission('NOTIFICATION.READ')) {
    tasks.push(
      notificationsApi
        .listNotifications({ page: 0, pageSize: 5, signal })
        .then((res) => ({ key: 'notifications', res }))
        .catch((err) => ({ key: 'notifications', err }))
    );
  }

  if (user.employeeId != null && hasPermission('DUTY.REPORT.READ') && hasScope('OWN')) {
    tasks.push(
      historyApi
        .getDutyHistory({
          employeeId: user.employeeId ?? undefined,
          dimension: 'EFFECTIVE_PUBLISHED_PRIMARY_CREDIT',
          page: 0,
          pageSize: 5,
          signal,
        })
        .then((res) => ({ key: 'duty', res }))
        .catch((err) => ({ key: 'duty', err }))
    );
  }

  const results = await Promise.all(tasks);
  if (signal?.aborted) return;
  loadingBox.remove();

  for (const entry of results) {
    if (entry.err && isAbortError(entry.err)) return;

    if (entry.key === 'holidays') {
      const panel = el('section', { className: 'panel col-span-6', 'aria-labelledby': 'dash-hol-h' });
      panel.appendChild(
        el(
          'div',
          { className: 'panel__header' },
          el('h2', { id: 'dash-hol-h' }, 'Upcoming holidays'),
          el(
            'a',
            {
              href: '/holidays',
              onClick: (e) => {
                e.preventDefault();
                navigate('/holidays');
              },
            },
            'View calendar'
          )
        )
      );
      if (entry.err) {
        panel.appendChild(
          createAlert({ variant: 'warning', message: 'Holiday calendar unavailable for your current scope.' })
        );
      } else if (!entry.res?.items?.length) {
        panel.appendChild(el('p', { className: 'muted' }, 'No holidays configured yet.'));
      } else {
        panel.appendChild(
          el(
            'ul',
            { className: 'stack-sm' },
            entry.res.items.map((h) =>
              el(
                'li',
                {},
                `${formatIsoDate(h.holidayDate)} — `,
                el('strong', {}, h.name),
                ` (Primary: ${h.primaryCount}, Standby: ${h.standbyCount}) `,
                createStatusBadge(h.status)
              )
            )
          )
        );
      }
      grid.appendChild(panel);
    }

    if (entry.key === 'periods') {
      const panel = el('section', { className: 'panel col-span-6', 'aria-labelledby': 'dash-ros-h' });
      panel.appendChild(
        el(
          'div',
          { className: 'panel__header' },
          el('h2', { id: 'dash-ros-h' }, 'Roster periods'),
          el(
            'a',
            {
              href: '/roster',
              onClick: (e) => {
                e.preventDefault();
                navigate('/roster');
              },
            },
            'Open rosters'
          )
        )
      );
      if (entry.err) {
        panel.appendChild(createAlert({ variant: 'warning', message: entry.err.message }));
      } else if (!entry.res?.items?.length) {
        panel.appendChild(el('p', { className: 'muted' }, 'No roster periods found.'));
      } else {
        panel.appendChild(
          el(
            'ul',
            { className: 'stack-sm' },
            entry.res.items.map((p) =>
              el(
                'li',
                {},
                el(
                  'a',
                  {
                    href: `/roster/${p.id}`,
                    onClick: (e) => {
                      e.preventDefault();
                      navigate(`/roster/${p.id}`);
                    },
                  },
                  `${p.periodName} (${p.periodCode})`
                ),
                ` · ${formatIsoDate(p.startDate)} – ${formatIsoDate(p.endDate)} `,
                createStatusBadge(p.status)
              )
            )
          )
        );
      }
      grid.appendChild(panel);
    }

    if (entry.key === 'replacements') {
      const panel = el('section', { className: 'panel col-span-6', 'aria-labelledby': 'dash-rep-h' });
      panel.appendChild(
        el(
          'div',
          { className: 'panel__header' },
          el('h2', { id: 'dash-rep-h' }, 'Pending replacement requests'),
          el(
            'a',
            {
              href: '/replacements',
              onClick: (e) => {
                e.preventDefault();
                navigate('/replacements');
              },
            },
            'View requests'
          )
        )
      );
      if (entry.err) {
        panel.appendChild(createAlert({ variant: 'warning', message: entry.err.message }));
      } else if (!entry.res?.items?.length) {
        panel.appendChild(el('p', { className: 'muted' }, 'No requests awaiting Manager decision in your scope.'));
      } else {
        panel.appendChild(
          el(
            'ul',
            { className: 'stack-sm' },
            entry.res.items.map((r) =>
              el(
                'li',
                {},
                el(
                  'a',
                  {
                    href: `/replacements/${r.id}`,
                    onClick: (e) => {
                      e.preventDefault();
                      navigate(`/replacements/${r.id}`);
                    },
                  },
                  r.requestCode || `Request #${r.id}`
                ),
                ` · ${formatIsoDate(r.holidayDate)} (${r.requestedForDisplayName || `Employee #${r.requestedForEmployeeId}`}) `,
                r.staffingGap ? createStatusBadge('UNRESOLVED_STAFFING_GAP') : createStatusBadge(r.status)
              )
            )
          )
        );
      }
      grid.appendChild(panel);
    }

    if (entry.key === 'notifications') {
      const panel = el('section', { className: 'panel col-span-6', 'aria-labelledby': 'dash-not-h' });
      panel.appendChild(
        el(
          'div',
          { className: 'panel__header' },
          el('h2', { id: 'dash-not-h' }, 'Recent notifications'),
          el(
            'a',
            {
              href: '/notifications',
              onClick: (e) => {
                e.preventDefault();
                navigate('/notifications');
              },
            },
            'View all'
          )
        )
      );
      if (entry.err) {
        panel.appendChild(createAlert({ variant: 'warning', message: entry.err.message }));
      } else if (!entry.res?.items?.length) {
        panel.appendChild(el('p', { className: 'muted' }, 'No recent notifications.'));
      } else {
        panel.appendChild(
          el(
            'ul',
            { className: 'stack-sm' },
            entry.res.items.map((n) =>
              el(
                'li',
                {},
                el('strong', {}, n.title),
                `: ${n.message} `,
                el('span', { className: 'muted' }, `(${formatDateTimeUtc(n.createdAtUtc)})`),
                !n.readAtUtc ? el('span', { className: 'badge badge--info' }, 'Unread') : null
              )
            )
          )
        );
      }
      grid.appendChild(panel);
    }

    if (entry.key === 'duty') {
      const panel = el('section', { className: 'panel col-span-12', 'aria-labelledby': 'dash-dut-h' });
      panel.appendChild(
        el(
          'div',
          { className: 'panel__header' },
          el('h2', { id: 'dash-dut-h' }, 'Effective published Primary credits'),
          el(
            'a',
            {
              href: '/duty-history',
              onClick: (e) => {
                e.preventDefault();
                navigate('/duty-history');
              },
            },
            'Inspect all 7 dimensions'
          )
        )
      );
      if (entry.err) {
        panel.appendChild(
          createAlert({
            variant: 'info',
            message: 'Effective published Primary credit summary is not visible for your current scope.',
          })
        );
      } else {
        const count = entry.res?.page?.totalElements ?? entry.res?.items?.length ?? 0;
        panel.appendChild(
          el(
            'p',
            {},
            `Returned records in Effective Published Primary Credit dimension: ${count}. Standby designations, drafts, and activations are tracked separately and excluded from Primary credit.`
          )
        );
      }
      grid.appendChild(panel);
    }
  }

  if (!grid.children.length) {
    grid.appendChild(
      el(
        'section',
        { className: 'panel col-span-12' },
        createAlert({
          variant: 'info',
          title: 'Permitted modules only',
          message: 'Use the navigation menu or Help Centre to access your authorized workflows.',
        })
      )
    );
  }
}
