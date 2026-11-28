import { el, clear, svgIcon } from '../../utils/dom.js';
import { formatIsoDate, formatDateTimeUtc } from '../../utils/date.js';
import { createAlert, createEmptyState, createSkeleton } from '../../components/alert.js';
import { createStatusBadge } from '../../components/status-badge.js';
import { createTabs } from '../../components/tabs.js';
import { hasAnyPermission, hasPermission, hasScope } from '../../state/session-store.js';
import * as rosterApi from '../../api/roster.js';
import * as holidaysApi from '../../api/holidays.js';
import * as availabilityApi from '../../api/availability.js';
import * as employeesApi from '../../api/employees.js';
import { isAbortError } from '../../api/errors.js';

const VIEWS = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'team', label: 'Team Grid' },
];

function addDaysIso(isoDate, delta) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function addMonthsIso(isoDate, delta) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 10);
}

function startOfWeekMonday(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getMonthGridDates(isoDate) {
  const firstOfMonth = `${isoDate.slice(0, 7)}-01`;
  const gridStart = startOfWeekMonday(firstOfMonth);
  const dates = [];
  for (let i = 0; i < 42; i += 1) {
    dates.push(addDaysIso(gridStart, i));
  }
  return dates;
}

function getWeekDates(isoDate) {
  const start = startOfWeekMonday(isoDate);
  return Array.from({ length: 7 }, (_, i) => addDaysIso(start, i));
}

function formatMonthYear(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function formatShortDay(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export async function renderCalendarPage({ container, query, session, navigate, signal }) {
  const canReadRoster = hasPermission('ROSTER.READ');
  const canReadHolidays = hasPermission('CALENDAR.READ');
  const canReadAvailability = hasAnyPermission([
    'AVAILABILITY.MANAGE_OWN',
    'AVAILABILITY.READ',
    'AVAILABILITY.MANAGE_ON_BEHALF',
  ]);
  const canReadEmployees = hasPermission('ORG.USER.READ') && (hasScope('ORG') || hasScope('TEAM') || hasScope('OWN'));
  const canManualAssign = hasPermission('ROSTER.MANUAL_ASSIGN');
  const canManageHolidays = hasPermission('CALENDAR.MANAGE');
  const canReportUnavail = hasPermission('REPLACEMENT.REQUEST_OWN');
  const canHandover = hasPermission('HANDOVER.CREATE');

  let viewMode = query?.get('view') || 'month';
  if (!VIEWS.some((v) => v.id === viewMode)) viewMode = 'month';
  let anchorDate = query?.get('date') || '2026-12-25';
  let selectedPeriodId = query?.get('periodId') || '';
  let requestedStatus = query?.get('status') || '';
  let filterTeamId = '';
  let filterEmployeeId = '';
  let filterDutyType = '';
  let selectedItem = null;

  const host = el('div', { className: 'stack' });
  container.appendChild(host);

  const loadAndRender = async () => {
    clear(host);
    host.appendChild(createSkeleton({ rows: 6, label: 'Loading schedule calendar…' }));

    try {
      const [periodsRes, holidaysRes, availabilityRes, employeesRes, teamsRes] = await Promise.all([
        canReadRoster ? rosterApi.listRosterPeriods({ page: 0, pageSize: 50, signal }).catch(() => null) : Promise.resolve(null),
        canReadHolidays ? holidaysApi.listHolidays({ page: 0, pageSize: 100, signal }).catch(() => null) : Promise.resolve(null),
        canReadAvailability ? availabilityApi.listAvailability({ page: 0, pageSize: 100, signal }).catch(() => null) : Promise.resolve(null),
        canReadEmployees ? employeesApi.listEmployees({ page: 0, pageSize: 100, active: true, signal }).catch(() => null) : Promise.resolve(null),
        canReadEmployees && (hasScope('ORG') || hasScope('TEAM'))
          ? employeesApi.listTeams({ page: 0, pageSize: 100, signal }).catch(() => null)
          : Promise.resolve(null),
      ]);
      if (signal?.aborted) return;

      const periods = periodsRes?.items || [];
      if (!selectedPeriodId && periods.length) {
        selectedPeriodId = String(periods[0].id);
      }

      let roster = null;
      if (canReadRoster && selectedPeriodId) {
        roster = await rosterApi
          .getRoster(selectedPeriodId, { status: requestedStatus || undefined, signal })
          .catch(() => null);
        if (signal?.aborted) return;
      }

      const holidays = holidaysRes?.items || [];
      const availability = availabilityRes?.items || [];
      const employees = employeesRes?.items || [];
      const teams = teamsRes?.items || [];

      // Resolve team memberships for team filtering when teams exist
      const empTeamMap = new Map();
      if (filterTeamId && employees.length) {
        await Promise.all(
          employees.slice(0, 25).map((emp) =>
            employeesApi
              .listEmployeeTeamMemberships(emp.id, { page: 0, pageSize: 10, signal })
              .then((res) => {
                const activeMem = (res?.items || []).find((m) => m.status === 'ACTIVE');
                if (activeMem) empTeamMap.set(emp.id, String(activeMem.teamId));
              })
              .catch(() => {})
          )
        );
        if (signal?.aborted) return;
      }

      const versions = Array.isArray(roster?.versions) ? roster.versions : [];
      const activeVersion = (() => {
        if (!versions.length) return null;
        if (requestedStatus) {
          const matched = versions.filter((v) => v.status === requestedStatus);
          if (matched.length) return matched[matched.length - 1];
        }
        const pub = versions.filter((v) => v.status === 'PUBLISHED');
        if (pub.length) return pub[pub.length - 1];
        return versions[versions.length - 1];
      })();
      const isDraft = Boolean(activeVersion && ['DRAFT', 'REVIEWED'].includes(activeVersion.status));
      const isPublished = Boolean(activeVersion && activeVersion.status === 'PUBLISHED');
      const assignments = Array.isArray(roster?.assignments) ? roster.assignments : [];
      const assignById = new Map(assignments.map((a) => [a.id, a]));
      const slots = Array.isArray(roster?.slots) ? roster.slots : [];

      // Normalize calendar events from real API resources
      const events = [];
      for (const h of holidays) {
        events.push({
          id: `hol-${h.id}`,
          kind: 'HOLIDAY',
          date: h.holidayDate,
          title: h.name,
          subtitle: `Primary ${h.primaryCount} · Standby ${h.standbyCount}`,
          status: h.status || 'ACTIVE',
          raw: h,
        });
      }
      for (const slot of slots) {
        const assignment = slot.assignmentId != null ? assignById.get(slot.assignmentId) : null;
        if (!assignment) {
          events.push({
            id: `gap-${slot.holidayId}-${slot.slotType}-${slot.slotNumber}`,
            kind: 'GAP',
            date: slot.holidayDate,
            title: `Unassigned ${slot.slotType === 'PRIMARY' ? 'Primary' : 'Standby'} #${slot.slotNumber}`,
            subtitle: slot.holidayName,
            slot,
            version: activeVersion,
            isDraft,
            isPublished,
          });
        } else {
          events.push({
            id: `asg-${assignment.id}`,
            kind: assignment.slotType === 'PRIMARY' ? 'PRIMARY' : 'STANDBY',
            date: assignment.holidayDate || slot.holidayDate,
            title: assignment.employeeDisplayName || `Employee #${assignment.employeeId}`,
            subtitle: `${assignment.slotType === 'PRIMARY' ? 'Primary' : 'Standby'} #${assignment.slotNumber} · ${slot.holidayName}`,
            employeeId: assignment.employeeId,
            assignment,
            slot,
            version: activeVersion,
            isDraft,
            isPublished,
          });
        }
      }

      const filteredEvents = events.filter((ev) => {
        if (filterDutyType && ev.kind !== filterDutyType) return false;
        if (filterEmployeeId && ev.employeeId != null && String(ev.employeeId) !== filterEmployeeId) return false;
        if (filterEmployeeId && ev.kind === 'GAP') return false;
        if (filterTeamId && ev.employeeId != null && empTeamMap.get(ev.employeeId) !== filterTeamId) return false;
        return true;
      });

      const activeAvailability = availability.filter((a) => {
        if (a.status !== 'ACTIVE') return false;
        if (filterEmployeeId && String(a.employeeId) !== filterEmployeeId) return false;
        if (filterDutyType && filterDutyType !== 'AVAILABILITY') return false;
        return true;
      });

      clear(host);

      // Page Header
      const headerActions = el('div', { className: 'page-header__actions' });
      if (hasPermission('AVAILABILITY.MANAGE_OWN')) {
        headerActions.appendChild(
          el(
            'a',
            {
              href: '/availability',
              className: 'btn btn-secondary btn-sm',
              onClick: (e) => {
                e.preventDefault();
                navigate('/availability');
              },
            },
            'Set availability'
          )
        );
      }
      if (canReadRoster && selectedPeriodId) {
        headerActions.appendChild(
          el(
            'a',
            {
              href: `/roster/${selectedPeriodId}`,
              className: 'btn btn-primary btn-sm',
              onClick: (e) => {
                e.preventDefault();
                navigate(`/roster/${selectedPeriodId}`);
              },
            },
            'Manage schedule'
          )
        );
      }

      host.appendChild(
        el(
          'div',
          { className: 'page-header' },
          el(
            'div',
            { className: 'page-header__title-group' },
            el('h1', { id: 'main-heading', tabindex: '-1' }, 'Schedule Calendar'),
            el(
              'p',
              { className: 'muted' },
              'Central holiday support schedule across Primary shifts, Backup Standby, holidays, availability, and coverage gaps.'
            )
          ),
          headerActions
        )
      );

      if (isDraft && activeVersion) {
        host.appendChild(
          createAlert({
            variant: 'draft',
            title: `Viewing Draft v${activeVersion.versionNumber ?? activeVersion.id} — not published`,
            message:
              'Provisional draft shifts are shown for planning only and do not represent official published commitments.',
          })
        );
      }

      // Calendar Toolbar (Date Nav + View Switcher + Filters)
      const periodSelect = el(
        'select',
        {
          className: 'field__select',
          'aria-label': 'Schedule period',
          onChange: (e) => {
            selectedPeriodId = e.target.value;
            const p = periods.find((x) => String(x.id) === selectedPeriodId);
            if (p?.startDate) anchorDate = p.startDate;
            loadAndRender();
          },
        },
        periods.length
          ? periods.map((p) => {
              const opt = el('option', { value: String(p.id) }, `${p.periodName} (${p.periodCode})`);
              if (String(p.id) === String(selectedPeriodId)) opt.selected = true;
              return opt;
            })
          : el('option', { value: '' }, 'No periods')
      );

      const statusSelect = el(
        'select',
        {
          className: 'field__select',
          'aria-label': 'Schedule status',
          onChange: (e) => {
            requestedStatus = e.target.value;
            loadAndRender();
          },
        },
        [
          { value: '', label: 'Active (Published first)' },
          { value: 'PUBLISHED', label: 'Published only' },
          { value: 'DRAFT', label: 'Draft only' },
        ].map((item) => {
          const opt = el('option', { value: item.value }, item.label);
          if (item.value === requestedStatus) opt.selected = true;
          return opt;
        })
      );

      const dutySelect = el(
        'select',
        {
          className: 'field__select',
          'aria-label': 'Duty type filter',
          onChange: (e) => {
            filterDutyType = e.target.value;
            renderWorkspace();
          },
        },
        [
          { value: '', label: 'All events' },
          { value: 'PRIMARY', label: 'Primary duty' },
          { value: 'STANDBY', label: 'Standby backup' },
          { value: 'HOLIDAY', label: 'Holidays' },
          { value: 'AVAILABILITY', label: 'Availability' },
          { value: 'GAP', label: 'Coverage gaps' },
        ].map((item) => {
          const opt = el('option', { value: item.value }, item.label);
          if (item.value === filterDutyType) opt.selected = true;
          return opt;
        })
      );

      const teamSelect = teams.length
        ? el(
            'select',
            {
              className: 'field__select',
              'aria-label': 'Team filter',
              onChange: (e) => {
                filterTeamId = e.target.value;
                loadAndRender();
              },
            },
            [
              el('option', { value: '' }, 'All teams'),
              ...teams.map((t) => {
                const opt = el('option', { value: String(t.id) }, t.name);
                if (String(t.id) === filterTeamId) opt.selected = true;
                return opt;
              }),
            ]
          )
        : null;

      const empSelect = employees.length
        ? el(
            'select',
            {
              className: 'field__select',
              'aria-label': 'Employee filter',
              onChange: (e) => {
                filterEmployeeId = e.target.value;
                renderWorkspace();
              },
            },
            [
              el('option', { value: '' }, 'All people'),
              ...employees.map((emp) => {
                const opt = el('option', { value: String(emp.id) }, emp.displayName);
                if (String(emp.id) === filterEmployeeId) opt.selected = true;
                return opt;
              }),
            ]
          )
        : null;

      const dateHeading = el('h2', { className: 'cal-toolbar__title' }, formatMonthYear(anchorDate));
      const dateInput = el('input', {
        type: 'date',
        className: 'field__input cal-date-picker',
        'aria-label': 'Jump to date',
        value: anchorDate,
        onChange: (e) => {
          if (e.target.value) {
            anchorDate = e.target.value;
            renderWorkspace();
          }
        },
      });

      const viewTabs = createTabs({
        label: 'Calendar view',
        className: 'cal-view-tabs',
        tabClassName: 'cal-view-tab',
        activeId: viewMode,
        tabs: VIEWS.map((v) => ({ id: v.id, label: v.label })),
        onChange: (nextId) => {
          viewMode = nextId;
          renderWorkspace();
        },
      });

      const toolbar = el(
        'section',
        { className: 'panel cal-toolbar', 'aria-label': 'Calendar controls' },
        el(
          'div',
          { className: 'cal-toolbar__row' },
          el(
            'div',
            { className: 'cluster' },
            el(
              'button',
              {
                type: 'button',
                className: 'btn btn-secondary btn-sm',
                'aria-label': 'Previous period',
                onClick: () => {
                  anchorDate =
                    viewMode === 'month' || viewMode === 'agenda'
                      ? addMonthsIso(anchorDate, -1)
                      : viewMode === 'week' || viewMode === 'team'
                        ? addDaysIso(anchorDate, -7)
                        : addDaysIso(anchorDate, -1);
                  renderWorkspace();
                },
              },
              svgIcon('chevronLeft', { size: 16 })
            ),
            el(
              'button',
              {
                type: 'button',
                className: 'btn btn-secondary btn-sm',
                onClick: () => {
                  anchorDate = new Date().toISOString().slice(0, 10);
                  renderWorkspace();
                },
              },
              'Today'
            ),
            el(
              'button',
              {
                type: 'button',
                className: 'btn btn-secondary btn-sm',
                'aria-label': 'Next period',
                onClick: () => {
                  anchorDate =
                    viewMode === 'month' || viewMode === 'agenda'
                      ? addMonthsIso(anchorDate, 1)
                      : viewMode === 'week' || viewMode === 'team'
                        ? addDaysIso(anchorDate, 7)
                        : addDaysIso(anchorDate, 1);
                  renderWorkspace();
                },
              },
              svgIcon('chevronRight', { size: 16 })
            ),
            dateHeading,
            dateInput
          ),
          viewTabs
        ),
        el(
          'div',
          { className: 'cal-toolbar__filters' },
          canReadRoster ? periodSelect : null,
          canReadRoster ? statusSelect : null,
          teamSelect,
          empSelect,
          dutySelect
        ),
        el(
          'div',
          { className: 'cal-legend', 'aria-label': 'Schedule legend' },
          el('span', { className: 'cal-legend__item cal-pill--primary' }, 'Primary duty'),
          el('span', { className: 'cal-legend__item cal-pill--standby' }, 'Standby backup'),
          el('span', { className: 'cal-legend__item cal-pill--holiday' }, 'Holiday'),
          el('span', { className: 'cal-legend__item cal-pill--unavail' }, 'Availability / Leave'),
          el('span', { className: 'cal-legend__item cal-pill--gap' }, 'Coverage gap')
        )
      );

      const workspace = el('div', { className: 'cal-workspace' });
      const canvasHost = el('div', { className: 'cal-canvas' });
      const inspectorHost = el('aside', {
        className: 'panel cal-inspector',
        'aria-label': 'Schedule inspector',
        hidden: true,
      });
      workspace.append(canvasHost, inspectorHost);

      host.append(toolbar, workspace);

      const openInspector = (item) => {
        selectedItem = item;
        workspace.dataset.inspectorOpen = 'true';
        inspectorHost.hidden = false;
        clear(inspectorHost);

        const closeBtn = el(
          'button',
          {
            type: 'button',
            className: 'btn btn-ghost btn-sm',
            'aria-label': 'Close details panel',
            onClick: () => {
              selectedItem = null;
              inspectorHost.hidden = true;
              delete workspace.dataset.inspectorOpen;
            },
          },
          svgIcon('close', { size: 16 })
        );

        if (item.type === 'EVENT') {
          const ev = item.event;
          const actions = el('div', { className: 'stack-sm' });
          if (ev.kind === 'PRIMARY' || ev.kind === 'STANDBY') {
            if (ev.isDraft && canManualAssign && ev.version && selectedPeriodId) {
              const qs = new URLSearchParams({
                holidayId: String(ev.slot.holidayId),
                slotType: ev.slot.slotType,
                slotNumber: String(ev.slot.slotNumber),
                assignmentId: String(ev.assignment.id),
              }).toString();
              actions.appendChild(
                el(
                  'a',
                  {
                    href: `/roster/${selectedPeriodId}/versions/${ev.version.id}/assign?${qs}`,
                    className: 'btn btn-primary btn-sm',
                    onClick: (e) => {
                      e.preventDefault();
                      navigate(`/roster/${selectedPeriodId}/versions/${ev.version.id}/assign?${qs}`);
                    },
                  },
                  'Reassign draft slot'
                )
              );
            }
            if (ev.isPublished && canReportUnavail && session?.user?.employeeId === ev.assignment.employeeId) {
              actions.appendChild(
                el(
                  'a',
                  {
                    href: `/replacements/new?assignmentId=${ev.assignment.id}`,
                    className: 'btn btn-primary btn-sm',
                    onClick: (e) => {
                      e.preventDefault();
                      navigate(`/replacements/new?assignmentId=${ev.assignment.id}`);
                    },
                  },
                  'Request a replacement'
                )
              );
            }
            if (ev.isPublished && canHandover) {
              actions.appendChild(
                el(
                  'a',
                  {
                    href: `/handover?assignmentId=${ev.assignment.id}`,
                    className: 'btn btn-secondary btn-sm',
                    onClick: (e) => {
                      e.preventDefault();
                      navigate(`/handover?assignmentId=${ev.assignment.id}`);
                    },
                  },
                  'Add shift note'
                )
              );
            }
          } else if (ev.kind === 'GAP') {
            if (ev.isDraft && canManualAssign && ev.version && selectedPeriodId) {
              const qs = new URLSearchParams({
                holidayId: String(ev.slot.holidayId),
                slotType: ev.slot.slotType,
                slotNumber: String(ev.slot.slotNumber),
              }).toString();
              actions.appendChild(
                el(
                  'a',
                  {
                    href: `/roster/${selectedPeriodId}/versions/${ev.version.id}/assign?${qs}`,
                    className: 'btn btn-primary btn-sm',
                    onClick: (e) => {
                      e.preventDefault();
                      navigate(`/roster/${selectedPeriodId}/versions/${ev.version.id}/assign?${qs}`);
                    },
                  },
                  'Fill uncovered slot'
                )
              );
            }
          } else if (ev.kind === 'HOLIDAY' && canManageHolidays) {
            actions.appendChild(
              el(
                'a',
                {
                  href: `/holidays/${ev.raw.id}`,
                  className: 'btn btn-secondary btn-sm',
                  onClick: (e) => {
                    e.preventDefault();
                    navigate(`/holidays/${ev.raw.id}`);
                  },
                },
                'Configure holiday'
              )
            );
          }

          inspectorHost.append(
            el('div', { className: 'panel__header' }, el('h3', {}, ev.title), closeBtn),
            el('p', { className: 'muted' }, `${formatShortDay(ev.date)} (${ev.date})`),
            el('p', {}, ev.subtitle),
            ev.isDraft
              ? createStatusBadge('DRAFT', 'Draft — not published')
              : ev.isPublished
                ? createStatusBadge('PUBLISHED', 'Published official')
                : createStatusBadge(ev.kind),
            ev.assignment
              ? el(
                  'dl',
                  { className: 'kv-grid' },
                  el('div', { className: 'kv-item' }, el('dt', {}, 'Origin'), el('dd', {}, ev.assignment.origin)),
                  el('div', { className: 'kv-item' }, el('dt', {}, 'Status'), el('dd', {}, ev.assignment.status))
                )
              : null,
            ev.raw?.dutyWindowStart
              ? el('p', { className: 'muted' }, `Window: ${formatDateTimeUtc(ev.raw.dutyWindowStart)} – ${formatDateTimeUtc(ev.raw.dutyWindowEnd)}`)
              : null,
            actions
          );
        } else if (item.type === 'AVAILABILITY') {
          const av = item.record;
          inspectorHost.append(
            el('div', { className: 'panel__header' }, el('h3', {}, `${av.availabilityType} declaration`), closeBtn),
            el('p', {}, `${formatIsoDate(av.startDate)} – ${formatIsoDate(av.endDate)}`),
            av.note ? el('p', { className: 'muted' }, av.note) : null,
            el(
              'a',
              {
                href: `/availability/${av.id}`,
                className: 'btn btn-secondary btn-sm',
                onClick: (e) => {
                  e.preventDefault();
                  navigate(`/availability/${av.id}`);
                },
              },
              'Manage availability'
            )
          );
        } else if (item.type === 'DAY') {
          const dayActions = el('div', { className: 'stack-sm' });
          if (hasPermission('AVAILABILITY.MANAGE_OWN')) {
            dayActions.appendChild(
              el(
                'a',
                {
                  href: '/availability',
                  className: 'btn btn-secondary btn-sm',
                  onClick: (e) => {
                    e.preventDefault();
                    navigate('/availability');
                  },
                },
                'Declare availability'
              )
            );
          }
          if (canManageHolidays) {
            dayActions.appendChild(
              el(
                'a',
                {
                  href: '/holidays/new',
                  className: 'btn btn-secondary btn-sm',
                  onClick: (e) => {
                    e.preventDefault();
                    navigate('/holidays/new');
                  },
                },
                'Configure holiday'
              )
            );
          }
          inspectorHost.append(
            el('div', { className: 'panel__header' }, el('h3', {}, formatShortDay(item.date)), closeBtn),
            el('p', { className: 'muted' }, `${item.dayEvents.length} scheduled item(s)`),
            dayActions
          );
        }
      };

      const renderEventChip = (ev) => {
        const cls =
          ev.kind === 'PRIMARY'
            ? 'cal-pill cal-pill--primary'
            : ev.kind === 'STANDBY'
              ? 'cal-pill cal-pill--standby'
              : ev.kind === 'HOLIDAY'
                ? 'cal-pill cal-pill--holiday'
                : 'cal-pill cal-pill--gap';
        return el(
          'button',
          {
            type: 'button',
            className: cls,
            onClick: (e) => {
              e.stopPropagation();
              openInspector({ type: 'EVENT', event: ev });
            },
          },
          el('span', { className: 'cal-pill__title' }, ev.title)
        );
      };

      const renderAvailabilityChip = (av) =>
        el(
          'button',
          {
            type: 'button',
            className: 'cal-pill cal-pill--unavail',
            onClick: (e) => {
              e.stopPropagation();
              openInspector({ type: 'AVAILABILITY', record: av });
            },
          },
          el('span', { className: 'cal-pill__title' }, `${av.availabilityType === 'UNAVAILABLE' ? 'Unavailable' : 'Available'} (#${av.employeeId})`)
        );

      const renderWorkspace = () => {
        clear(canvasHost);
        dateHeading.textContent =
          viewMode === 'day' ? formatShortDay(anchorDate) : formatMonthYear(anchorDate);
        dateInput.value = anchorDate;

        // Sync tab aria-selected
        viewTabs.querySelectorAll('[role="tab"]').forEach((btn, idx) => {
          btn.setAttribute('aria-selected', String(VIEWS[idx].id === viewMode));
        });

        const eventsOnDate = (iso) => filteredEvents.filter((ev) => ev.date === iso);
        const availOnDate = (iso) =>
          activeAvailability.filter((a) => a.startDate <= iso && a.endDate >= iso);

        const todayIso = new Date().toISOString().slice(0, 10);

        if (viewMode === 'month') {
          const monthPrefix = anchorDate.slice(0, 7);
          const dates = getMonthGridDates(anchorDate);
          const grid = el('div', { className: 'cal-month-grid', role: 'grid', 'aria-label': formatMonthYear(anchorDate) });
          for (const dayName of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
            grid.appendChild(el('div', { className: 'cal-month-grid__dow', role: 'columnheader' }, dayName));
          }
          for (const iso of dates) {
            const dayEvents = eventsOnDate(iso);
            const dayAvail = availOnDate(iso);
            const isOutside = !iso.startsWith(monthPrefix);
            const isToday = iso === todayIso;
            const cell = el(
              'div',
              {
                className: `cal-day-cell${isOutside ? ' cal-day-cell--outside' : ''}${isToday ? ' cal-day-cell--today' : ''}`,
                role: 'gridcell',
                tabindex: '0',
                'aria-label': `${formatShortDay(iso)}, ${dayEvents.length} events`,
                onClick: () => openInspector({ type: 'DAY', date: iso, dayEvents }),
              },
              el('div', { className: 'cal-day-cell__num' }, String(Number(iso.slice(8, 10)))),
              el(
                'div',
                { className: 'cal-day-cell__items' },
                dayEvents.slice(0, 4).map(renderEventChip),
                dayAvail.slice(0, 2).map(renderAvailabilityChip),
                dayEvents.length + dayAvail.length > 6
                  ? el('span', { className: 'muted cal-more' }, `+${dayEvents.length + dayAvail.length - 6} more`)
                  : null
              )
            );
            grid.appendChild(cell);
          }
          canvasHost.appendChild(el('div', { className: 'panel cal-panel' }, grid));
        } else if (viewMode === 'week') {
          const weekDates = getWeekDates(anchorDate);
          const grid = el('div', { className: 'cal-week-grid' });
          for (const iso of weekDates) {
            const dayEvents = eventsOnDate(iso);
            const dayAvail = availOnDate(iso);
            grid.appendChild(
              el(
                'section',
                {
                  className: `panel cal-week-col${iso === todayIso ? ' cal-day-cell--today' : ''}`,
                  onClick: () => openInspector({ type: 'DAY', date: iso, dayEvents }),
                },
                el('h3', { className: 'cal-week-col__head' }, formatShortDay(iso)),
                dayEvents.length || dayAvail.length
                  ? el('div', { className: 'stack-sm' }, dayEvents.map(renderEventChip), dayAvail.map(renderAvailabilityChip))
                  : el('p', { className: 'muted' }, 'No shifts')
              )
            );
          }
          canvasHost.appendChild(grid);
        } else if (viewMode === 'day') {
          const dayEvents = eventsOnDate(anchorDate);
          const dayAvail = availOnDate(anchorDate);
          const card = el('section', { className: 'panel stack' }, el('h3', {}, formatShortDay(anchorDate)));
          if (!dayEvents.length && !dayAvail.length) {
            card.appendChild(
              createEmptyState({
                title: 'No holidays or shifts on this date',
                description: 'Select another date or use the week/month views.',
              })
            );
          } else {
            card.append(
              el('div', { className: 'stack-sm' }, dayEvents.map(renderEventChip), dayAvail.map(renderAvailabilityChip))
            );
          }
          canvasHost.appendChild(card);
        } else if (viewMode === 'agenda') {
          const monthPrefix = anchorDate.slice(0, 7);
          const monthDates = Array.from(
            new Set(
              filteredEvents
                .filter((ev) => ev.date.startsWith(monthPrefix))
                .map((ev) => ev.date)
            )
          ).sort();
          if (!monthDates.length) {
            canvasHost.appendChild(
              createEmptyState({
                title: `No scheduled events in ${formatMonthYear(anchorDate)}`,
                description: 'Switch months or adjust your filters.',
              })
            );
          } else {
            const list = el('div', { className: 'stack' });
            for (const iso of monthDates) {
              const dayEvents = eventsOnDate(iso);
              list.appendChild(
                el(
                  'section',
                  { className: 'panel stack-sm' },
                  el('h3', {}, formatShortDay(iso)),
                  el('div', { className: 'cluster' }, dayEvents.map(renderEventChip))
                )
              );
            }
            canvasHost.appendChild(list);
          }
        } else if (viewMode === 'team') {
          const weekDates = getWeekDates(anchorDate);
          const visibleEmployees = filterEmployeeId
            ? employees.filter((e) => String(e.id) === filterEmployeeId)
            : employees;
          if (!visibleEmployees.length) {
            canvasHost.appendChild(
              createEmptyState({
                title: 'No team members visible in your scope',
                description: 'Team scheduling grid requires scoped employee visibility.',
              })
            );
          } else {
            const table = el(
              'table',
              { className: 'cal-team-table' },
              el('caption', { className: 'visually-hidden' }, 'Team schedule matrix'),
              el(
                'thead',
                {},
                el(
                  'tr',
                  {},
                  el('th', { scope: 'col', className: 'cal-team-table__emp' }, 'Team member'),
                  weekDates.map((iso) => el('th', { scope: 'col' }, formatShortDay(iso)))
                )
              ),
              el(
                'tbody',
                {},
                visibleEmployees.map((emp) =>
                  el(
                    'tr',
                    {},
                    el('th', { scope: 'row', className: 'cal-team-table__emp' }, emp.displayName),
                    weekDates.map((iso) => {
                      const empEvents = eventsOnDate(iso).filter((ev) => ev.employeeId === emp.id);
                      const empAvail = activeAvailability.filter(
                        (a) => a.employeeId === emp.id && a.startDate <= iso && a.endDate >= iso
                      );
                      return el(
                        'td',
                        {},
                        el(
                          'div',
                          { className: 'stack-sm' },
                          empEvents.map(renderEventChip),
                          empAvail.map(renderAvailabilityChip)
                        )
                      );
                    })
                  )
                )
              )
            );
            canvasHost.appendChild(
              el('div', { className: 'panel table-wrapper', tabindex: '0', role: 'region', 'aria-label': 'Team schedule grid' }, table)
            );
          }
        }
      };

      renderWorkspace();
      if (selectedItem) openInspector(selectedItem);
    } catch (err) {
      if (isAbortError(err)) return;
      clear(host);
      host.append(
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Schedule Calendar unavailable'),
        createAlert({ variant: 'error', title: 'Failed to load calendar', message: err.message, correlationId: err.correlationId, actionLabel: 'Retry', onAction: loadAndRender })
      );
    }
  };

  await loadAndRender();
}
