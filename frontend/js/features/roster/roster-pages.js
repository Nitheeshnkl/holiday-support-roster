import { el, clear, appendChildren } from '../../utils/dom.js';
import { formatIsoDate } from '../../utils/date.js';
import { bindFormValidation, applyServerFieldErrors, clearServerFieldErrors, validateDateRange } from '../../utils/validation.js';
import { generateIdempotencyKey } from '../../utils/format.js';
import { createField } from '../../components/form-controls.js';
import { createAlert, createEmptyState, createSkeleton, showToast } from '../../components/alert.js';
import { createDataTable } from '../../components/data-table.js';
import { createPagination } from '../../components/pagination.js';
import { createStatusBadge } from '../../components/status-badge.js';
import { confirmDialog } from '../../components/dialog.js';
import { hasAnyPermission, hasPermission } from '../../state/session-store.js';
import { resolveIfMatch } from '../../api/client.js';
import * as rosterApi from '../../api/roster.js';
import { isAbortError } from '../../api/errors.js';

function pickActiveVersion(roster, requestedStatus) {
  const versions = Array.isArray(roster?.versions) ? roster.versions : [];
  if (!versions.length) return null;
  if (requestedStatus) {
    const matched = versions.filter((v) => v.status === requestedStatus);
    if (matched.length) return matched[matched.length - 1];
  }
  const published = versions.filter((v) => v.status === 'PUBLISHED');
  if (published.length) return published[published.length - 1];
  const draft = versions.filter((v) => v.status === 'DRAFT' || v.status === 'REVIEWED');
  if (draft.length) return draft[draft.length - 1];
  return versions[versions.length - 1];
}

export async function renderRosterPeriodsPage({ container, navigate, signal }) {
  let page = 0;
  let pageSize = 25;
  const canCreatePeriod = hasAnyPermission(['ROSTER.GENERATE', 'ROSTER.PUBLISH', 'ROSTER.REVISE']);

  const formHost = el('div', { className: 'stack' });
  const listHost = el('div', { className: 'stack' });

  container.append(
    el(
      'div',
      { className: 'page-header' },
      el(
        'div',
        { className: 'page-header__title-group' },
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Roster periods'),
        el('p', { className: 'muted' }, 'Planning periods grouping holidays and versioned draft/published rosters.')
      )
    ),
    formHost,
    listHost
  );

  if (canCreatePeriod) {
    const errBox = el('div', { className: 'stack-sm' });
    const submitBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Create roster period');
    const form = el(
      'form',
      { className: 'panel stack', novalidate: true },
      el('h2', {}, 'Create roster period'),
      errBox,
      el(
        'div',
        { className: 'form-grid' },
        createField({ name: 'periodCode', label: 'Period code', required: true, maxlength: 40 }),
        createField({ name: 'periodName', label: 'Period name', required: true, maxlength: 120 }),
        createField({ name: 'startDate', label: 'Start date', type: 'date', required: true }),
        createField({ name: 'endDate', label: 'End date', type: 'date', required: true })
      ),
      el('div', { className: 'cluster' }, submitBtn)
    );
    formHost.appendChild(form);

    bindFormValidation(form, {
      signal,
      customValidators: {
        endDate: (val, f) => {
          const err = validateDateRange(f.elements.namedItem('startDate').value, val);
          return err ? err.message : '';
        },
      },
      onSubmitValid: async (fd) => {
        clearServerFieldErrors(form);
        clear(errBox);
        submitBtn.disabled = true;
        try {
          const created = await rosterApi.createRosterPeriod({
            periodCode: String(fd.get('periodCode') || '').trim(),
            periodName: String(fd.get('periodName') || '').trim(),
            startDate: String(fd.get('startDate')),
            endDate: String(fd.get('endDate')),
          });
          showToast('Roster period created.', { variant: 'success' });
          navigate(`/roster/${created.id}`);
        } catch (err) {
          applyServerFieldErrors(form, err.fieldErrors);
          errBox.appendChild(
            createAlert({ variant: 'error', title: 'Create period failed', message: err.message, correlationId: err.correlationId })
          );
        } finally {
          submitBtn.disabled = false;
        }
      },
    });
  }

  const load = async () => {
    clear(listHost);
    listHost.appendChild(createSkeleton({ rows: 4, label: 'Loading roster periods…' }));
    try {
      const data = await rosterApi.listRosterPeriods({ page, pageSize, signal });
      if (signal?.aborted) return;
      clear(listHost);
      const items = data?.items || [];
      if (!items.length) {
        listHost.appendChild(
          createEmptyState({
            title: 'No roster periods available',
            description: 'Create a planning period above if you hold roster planning authority.',
          })
        );
        return;
      }

      listHost.appendChild(
        createDataTable({
          caption: 'Roster planning periods',
          columns: [
            {
              key: 'periodName',
              label: 'Period',
              isRowHeader: true,
              render: (p) =>
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
            },
            {
              key: 'startDate',
              label: 'Date range',
              render: (p) => `${formatIsoDate(p.startDate)} – ${formatIsoDate(p.endDate)}`,
            },
            { key: 'status', label: 'Period status', render: (p) => createStatusBadge(p.status) },
            {
              key: 'actions',
              label: 'Actions',
              render: (p) =>
                el(
                  'div',
                  { className: 'data-table__actions' },
                  el(
                    'a',
                    {
                      href: `/roster/${p.id}`,
                      className: 'btn btn-secondary btn-sm',
                      onClick: (e) => {
                        e.preventDefault();
                        navigate(`/roster/${p.id}`);
                      },
                    },
                    'Open roster'
                  ),
                  hasPermission('ROSTER.GENERATE')
                    ? el(
                        'a',
                        {
                          href: `/roster/${p.id}/generate`,
                          className: 'btn btn-ghost btn-sm',
                          onClick: (e) => {
                            e.preventDefault();
                            navigate(`/roster/${p.id}/generate`);
                          },
                        },
                        'Generate'
                      )
                    : null
                ),
            },
          ],
          rows: items,
        })
      );

      listHost.appendChild(
        createPagination({
          page: data.page,
          onPageChange: (next) => {
            page = next;
            load();
          },
          onPageSizeChange: (nextSize) => {
            pageSize = nextSize;
            page = 0;
            load();
          },
        })
      );
    } catch (err) {
      if (isAbortError(err)) return;
      clear(listHost);
      listHost.appendChild(
        createAlert({ variant: 'error', title: 'Unable to load roster periods', message: err.message, correlationId: err.correlationId, actionLabel: 'Retry', onAction: load })
      );
    }
  };

  await load();
}

export async function renderRosterOverviewPage({ container, params, query, session, navigate, signal }) {
  const periodId = params.periodId;
  let requestedStatus = query?.get('status') || '';
  let slotTypeFilter = '';
  let holidayDateFilter = '';

  const canGenerate = hasPermission('ROSTER.GENERATE');
  const canManualAssign = hasPermission('ROSTER.MANUAL_ASSIGN');
  const canPublish = hasPermission('ROSTER.PUBLISH');
  const canReportUnavail = hasPermission('REPLACEMENT.REQUEST_OWN');
  const canHandover = hasPermission('HANDOVER.CREATE');

  const host = el('div', { className: 'stack' });
  container.appendChild(host);

  const load = async () => {
    clear(host);
    host.appendChild(createSkeleton({ rows: 5, label: 'Loading roster overview…' }));
    try {
      const [roster, runsData] = await Promise.all([
        rosterApi.getRoster(periodId, { status: requestedStatus || undefined, signal }),
        rosterApi.listGenerationRuns(periodId, { page: 0, pageSize: 10, signal }).catch(() => null),
      ]);
      if (signal?.aborted) return;
      clear(host);

      const period = roster?.period;
      const versions = Array.isArray(roster?.versions) ? roster.versions : [];
      const activeVersion = pickActiveVersion(roster, requestedStatus);
      const slots = Array.isArray(roster?.slots) ? roster.slots : [];
      const assignments = Array.isArray(roster?.assignments) ? roster.assignments : [];
      const assignById = new Map(assignments.map((a) => [a.id, a]));
      const isDraft = activeVersion && ['DRAFT', 'REVIEWED'].includes(activeVersion.status);
      const isPublished = activeVersion && activeVersion.status === 'PUBLISHED';

      const statusFilter = createField({
        name: 'status',
        label: 'Roster view state',
        type: 'select',
        value: requestedStatus,
        options: [
          { value: '', label: 'Default / Active view' },
          { value: 'PUBLISHED', label: 'Published' },
          { value: 'DRAFT', label: 'Draft' },
          { value: 'REVIEWED', label: 'Reviewed' },
        ],
        onChange: (e) => {
          requestedStatus = e.target.value;
          load();
        },
      });
      const slotFilterField = createField({
        name: 'slotType',
        label: 'Slot type',
        type: 'select',
        value: slotTypeFilter,
        options: [
          { value: '', label: 'All slots (Primary & Standby)' },
          { value: 'PRIMARY', label: 'Primary only' },
          { value: 'STANDBY', label: 'Standby only' },
        ],
        onChange: (e) => {
          slotTypeFilter = e.target.value;
          load();
        },
      });
      const dateFilterField = createField({
        name: 'holidayDate',
        label: 'Holiday date',
        type: 'date',
        value: holidayDateFilter,
        onChange: (e) => {
          holidayDateFilter = e.target.value;
          load();
        },
      });

      const headerActions = el('div', { className: 'page-header__actions' });
      if (canGenerate) {
        headerActions.appendChild(
          el(
            'a',
            {
              href: `/roster/${periodId}/generate`,
              className: 'btn btn-secondary',
              onClick: (e) => {
                e.preventDefault();
                navigate(`/roster/${periodId}/generate`);
              },
            },
            'Generate draft'
          )
        );
      }
      if (canPublish && isDraft && activeVersion) {
        headerActions.appendChild(
          el(
            'a',
            {
              href: `/roster/${periodId}/versions/${activeVersion.id}/publish`,
              className: 'btn btn-primary',
              onClick: (e) => {
                e.preventDefault();
                navigate(`/roster/${periodId}/versions/${activeVersion.id}/publish`);
              },
            },
            'Review & publish'
          )
        );
      }
      headerActions.appendChild(
        el(
          'a',
          {
            href: `/roster/${periodId}/history`,
            className: 'btn btn-secondary',
            onClick: (e) => {
              e.preventDefault();
              navigate(`/roster/${periodId}/history`);
            },
          },
          'Versions & revisions'
        )
      );

      host.append(
        el(
          'div',
          { className: 'page-header' },
          el(
            'div',
            { className: 'page-header__title-group' },
            el('h1', { id: 'main-heading', tabindex: '-1' }, period ? `${period.periodName} (${period.periodCode})` : `Roster period #${periodId}`),
            period
              ? el(
                  'div',
                  { className: 'cluster' },
                  createStatusBadge(period.status),
                  el('span', { className: 'muted' }, `${formatIsoDate(period.startDate)} – ${formatIsoDate(period.endDate)}`),
                  activeVersion
                    ? el('span', { className: 'muted' }, `Version v${activeVersion.versionNumber ?? activeVersion.id}`)
                    : null
                )
              : null
          ),
          headerActions
        ),
        el('div', { className: 'filter-bar' }, statusFilter, slotFilterField, dateFilterField)
      );

      if (isDraft) {
        host.appendChild(
          createAlert({
            variant: 'draft',
            title: 'Draft — not published',
            message:
              'This draft version is provisional only. Draft assignments do not create official historical Primary workload credits until published.',
          })
        );
      } else if (isPublished) {
        host.appendChild(
          createAlert({
            variant: 'success',
            title: `Published official version v${activeVersion.versionNumber ?? activeVersion.id}`,
            message:
              'Published versions are immutable. Future published Primary slots represent upcoming planned duty (not completed duty); changes require an approved Replacement Request or reasoned Roster Revision.',
          })
        );
      }

      const unfilledCount = slots.filter((s) => s.assignmentId == null).length;
      if (unfilledCount > 0) {
        host.appendChild(
          createAlert({
            variant: 'error',
            title: 'Unresolved staffing gap',
            message: `${unfilledCount} configured roster slot(s) remain unfilled in this version. Publication remains blocked until resolved.`,
          })
        );
      }

      const slotSection = el(
        'section',
        {
          className: `panel roster-surface ${isDraft ? 'roster-surface--draft' : isPublished ? 'roster-surface--published' : ''}`,
        },
        el(
          'div',
          { className: 'panel__header' },
          el('h2', {}, 'Holiday slots and assignments'),
          isDraft
            ? el('span', { className: 'draft-watermark-label' }, 'Draft — not published')
            : activeVersion
              ? createStatusBadge(activeVersion.status)
              : null
        )
      );

      const filteredSlots = slots.filter((slot) => {
        if (slotTypeFilter && slot.slotType !== slotTypeFilter) return false;
        if (holidayDateFilter && slot.holidayDate !== holidayDateFilter) return false;
        return true;
      });

      if (!filteredSlots.length) {
        slotSection.appendChild(
          createEmptyState({
            title: 'No slots or assignments in this view',
            description: canGenerate
              ? 'Generate a draft roster or adjust your status, slot-type, or date filters.'
              : 'No roster data is visible for this period and filter.',
            actionLabel: canGenerate ? 'Generate draft' : '',
            actionHref: canGenerate ? `/roster/${periodId}/generate` : '',
            onAction: canGenerate ? () => navigate(`/roster/${periodId}/generate`) : null,
          })
        );
      } else {
        slotSection.appendChild(
          createDataTable({
            caption: 'Roster slots and assignments',
            columns: [
              {
                key: 'holidayName',
                label: 'Holiday',
                isRowHeader: true,
                render: (slot) =>
                  el(
                    'div',
                    { className: 'stack-sm' },
                    el('strong', {}, slot.holidayName),
                    el('span', { className: 'muted' }, formatIsoDate(slot.holidayDate))
                  ),
              },
              {
                key: 'slotType',
                label: 'Slot',
                render: (slot) =>
                  el(
                    'div',
                    { className: 'cluster' },
                    createStatusBadge(slot.slotType),
                    el('span', { className: 'muted' }, `#${slot.slotNumber}`)
                  ),
              },
              {
                key: 'assignee',
                label: 'Assigned person',
                render: (slot) => {
                  const assignment = slot.assignmentId != null ? assignById.get(slot.assignmentId) : null;
                  if (!assignment) {
                    return createStatusBadge('UNRESOLVED_STAFFING_GAP', 'Unassigned gap');
                  }
                  return assignment.employeeDisplayName || `Employee #${assignment.employeeId}`;
                },
              },
              {
                key: 'origin',
                label: 'Origin & status',
                render: (slot) => {
                  const assignment = slot.assignmentId != null ? assignById.get(slot.assignmentId) : null;
                  if (!assignment) return '—';
                  return el(
                    'div',
                    { className: 'cluster' },
                    createStatusBadge(assignment.origin),
                    createStatusBadge(assignment.status)
                  );
                },
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (slot) => {
                  const assignment = slot.assignmentId != null ? assignById.get(slot.assignmentId) : null;
                  const actions = [];
                  if (isDraft && canManualAssign && activeVersion) {
                    const qs = new URLSearchParams({
                      holidayId: String(slot.holidayId),
                      slotType: slot.slotType,
                      slotNumber: String(slot.slotNumber),
                      ...(assignment ? { assignmentId: String(assignment.id) } : {}),
                    }).toString();
                    actions.push(
                      el(
                        'a',
                        {
                          href: `/roster/${periodId}/versions/${activeVersion.id}/assign?${qs}`,
                          className: 'btn btn-secondary btn-sm',
                          onClick: (e) => {
                            e.preventDefault();
                            navigate(`/roster/${periodId}/versions/${activeVersion.id}/assign?${qs}`);
                          },
                        },
                        assignment ? 'Change assignee' : 'Fill slot'
                      )
                    );
                  }
                  if (
                    isPublished &&
                    assignment &&
                    canReportUnavail &&
                    session.user.employeeId != null &&
                    assignment.employeeId === session.user.employeeId
                  ) {
                    actions.push(
                      el(
                        'a',
                        {
                          href: `/replacements/new?assignmentId=${assignment.id}`,
                          className: 'btn btn-secondary btn-sm',
                          onClick: (e) => {
                            e.preventDefault();
                            navigate(`/replacements/new?assignmentId=${assignment.id}`);
                          },
                        },
                        'Report unavailability'
                      )
                    );
                  }
                  if (isPublished && assignment && canHandover) {
                    actions.push(
                      el(
                        'a',
                        {
                          href: `/handover?assignmentId=${assignment.id}`,
                          className: 'btn btn-ghost btn-sm',
                          onClick: (e) => {
                            e.preventDefault();
                            navigate(`/handover?assignmentId=${assignment.id}`);
                          },
                        },
                        'Handover'
                      )
                    );
                  }
                  return el('div', { className: 'data-table__actions' }, actions.length ? actions : '—');
                },
              },
            ],
            rows: filteredSlots,
          })
        );
      }

      host.appendChild(slotSection);

      // Generation runs & backend FDR-02 fairness explanations (ROS-04)
      const runs = runsData?.items || [];
      const runsPanel = el(
        'section',
        { className: 'panel', 'aria-labelledby': 'gen-runs-h' },
        el('h2', { id: 'gen-runs-h' }, 'Generation runs and backend fairness explanations'),
        el(
          'p',
          { className: 'muted' },
          'Explanations below are reported directly from the backend FDR-02 allocation engine. The frontend never recalculates or ranks fairness.'
        ),
        runs.length
          ? createDataTable({
              caption: 'Generation runs',
              columns: [
                { key: 'runNumber', label: 'Run #', isRowHeader: true, render: (r) => `Run #${r.runNumber ?? r.id}` },
                { key: 'rosterVersionId', label: 'Version ID', render: (r) => `#${r.rosterVersionId}` },
                { key: 'algorithmVersion', label: 'Algorithm / Policy', render: (r) => `${r.algorithmVersion || '—'} / ${r.policyVersion || '—'}` },
                { key: 'status', label: 'Status', render: (r) => createStatusBadge(r.status) },
                { key: 'feasibilitySummary', label: 'Feasibility summary', render: (r) => r.feasibilitySummary || '—' },
              ],
              rows: runs,
            })
          : el('p', { className: 'muted' }, 'No generation runs recorded for this period yet.')
      );
      host.appendChild(runsPanel);

      if (versions.length > 0) {
        host.appendChild(
          el(
            'section',
            { className: 'panel', 'aria-labelledby': 'ver-summary-h' },
            el('h2', { id: 'ver-summary-h' }, 'Version summary'),
            el(
              'ul',
              { className: 'stack-sm' },
              versions.map((v) =>
                el(
                  'li',
                  { className: 'cluster' },
                  el('strong', {}, `Version v${v.versionNumber ?? v.id}`),
                  createStatusBadge(v.status),
                  v.parentVersionId != null ? el('span', { className: 'muted' }, `(Derived from v#${v.parentVersionId})`) : null
                )
              )
            )
          )
        );
      }
    } catch (err) {
      if (isAbortError(err)) return;
      clear(host);
      host.append(
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Roster unavailable'),
        createAlert({ variant: 'error', title: 'Failed to load roster', message: err.message, correlationId: err.correlationId, actionLabel: 'Retry', onAction: load })
      );
    }
  };

  await load();
}

export async function renderGenerateRosterPage({ container, params, navigate, signal }) {
  const periodId = params.periodId;
  const resultHost = el('div', { className: 'stack' });
  const errBox = el('div', { className: 'stack-sm' });
  const pendingProgress = el(
    'div',
    { className: 'panel stack-sm', hidden: true },
    el('label', { for: 'gen-progress-bar' }, 'Running deterministic allocation on server…'),
    el('progress', { id: 'gen-progress-bar', 'aria-label': 'Generating draft roster' })
  );

  const submitBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Generate draft roster');
  const form = el(
    'form',
    { className: 'panel stack generation-form', novalidate: true },
    el('h2', {}, 'Generation parameters'),
    errBox,
    el(
      'div',
      { className: 'form-grid' },
      createField({ name: 'algorithmVersion', label: 'Algorithm version (optional)', maxlength: 40, hint: 'Leave blank to use backend default.' }),
      createField({ name: 'policyVersion', label: 'Policy version (optional)', maxlength: 40, hint: 'Approved FDR-02 policy defaults on server.' })
    ),
    el(
      'div',
      { className: 'cluster' },
      submitBtn,
      el(
        'a',
        {
          href: `/roster/${periodId}`,
          className: 'btn btn-secondary',
          onClick: (e) => {
            e.preventDefault();
            navigate(`/roster/${periodId}`);
          },
        },
        'Back to roster'
      )
    )
  );

  container.append(
    el(
      'div',
      { className: 'page-header' },
      el(
        'div',
        { className: 'page-header__title-group' },
        el('h1', { id: 'main-heading', tabindex: '-1' }, `Generate draft roster · Period #${periodId}`),
        el('p', { className: 'muted' }, 'Idempotent draft generation using chronological FDR-02 fairness comparison.')
      )
    ),
    createAlert({
      variant: 'draft',
      title: 'Creates provisional draft only',
      message:
        'Automatic generation produces a Draft version for review and never publishes automatically or alters official historical workload.',
    }),
    form,
    pendingProgress,
    resultHost
  );

  bindFormValidation(form, {
    signal,
    onSubmitValid: async (fd) => {
      clearServerFieldErrors(form);
      clear(errBox);
      const confirmed = await confirmDialog({
        title: `Generate draft roster for Period #${periodId}?`,
        message: 'Freezes current holidays, staffing counts, eligibility, availability, and published Primary credits into a new draft version.',
        confirmLabel: 'Generate draft',
      });
      if (!confirmed) return;

      const idempotencyKey = generateIdempotencyKey('generate');
      submitBtn.disabled = true;
      pendingProgress.hidden = false;
      try {
        const result = await rosterApi.generateRosterDraft(
          periodId,
          {
            algorithmVersion: String(fd.get('algorithmVersion') || '').trim() || undefined,
            policyVersion: String(fd.get('policyVersion') || '').trim() || undefined,
          },
          idempotencyKey
        );
        clear(resultHost);
        showToast('Draft roster generated.', { variant: 'success' });

        const gaps = Array.isArray(result?.unresolvedGaps) ? result.unresolvedGaps : [];
        const explanations = Array.isArray(result?.explanations) ? result.explanations : [];

        resultHost.append(
          el(
            'section',
            { className: 'panel stack' },
            el(
              'div',
              { className: 'panel__header' },
              el('h2', {}, `Generation Run #${result.generationRunId}`),
              result.rosterVersion ? createStatusBadge(result.rosterVersion.status) : null
            ),
            result.feasibilitySummary
              ? el('p', {}, result.feasibilitySummary)
              : null,
            gaps.length
              ? createAlert({
                  variant: 'error',
                  title: 'Unresolved staffing gaps detected',
                  message: `${gaps.length} holiday staffing shortfall(s) reported below. Publication remains blocked until resolved.`,
                })
              : createAlert({
                  variant: 'success',
                  title: 'Feasible draft generated',
                  message: 'All configured holiday slots have proposed assignments. Review the draft before publishing.',
                  role: 'status',
                }),
            gaps.length
              ? createDataTable({
                  caption: 'Unresolved staffing gaps',
                  columns: [
                    { key: 'holidayId', label: 'Holiday ID', isRowHeader: true, render: (g) => `#${g.holidayId}` },
                    { key: 'requiredPrimaryCount', label: 'Required Primary' },
                    { key: 'assignedPrimaryCount', label: 'Assigned Primary' },
                    { key: 'message', label: 'Details' },
                  ],
                  rows: gaps,
                })
              : null,
            explanations.length
              ? el(
                  'div',
                  { className: 'stack-sm' },
                  el('h3', {}, 'Backend fairness & tie-break explanations'),
                  el('ul', {}, explanations.map((line) => el('li', {}, line)))
                )
              : null,
            el(
              'div',
              { className: 'cluster' },
              el(
                'a',
                {
                  href: `/roster/${periodId}?status=DRAFT`,
                  className: 'btn btn-primary',
                  onClick: (e) => {
                    e.preventDefault();
                    navigate(`/roster/${periodId}?status=DRAFT`);
                  },
                },
                'Inspect generated draft'
              )
            )
          )
        );
      } catch (err) {
        applyServerFieldErrors(form, err.fieldErrors);
        errBox.appendChild(
          createAlert({ variant: 'error', title: 'Generation failed', message: err.message, correlationId: err.correlationId })
        );
      } finally {
        submitBtn.disabled = false;
        pendingProgress.hidden = true;
      }
    },
  });
}

export async function renderManualAssignPage({ container, params, query, navigate, signal }) {
  const { periodId, versionId } = params;
  const holidayId = Number(query?.get('holidayId'));
  const slotType = query?.get('slotType') || 'PRIMARY';
  const slotNumber = Number(query?.get('slotNumber') || 1);
  const assignmentId = query?.get('assignmentId') ? Number(query.get('assignmentId')) : null;

  const host = el('div', { className: 'stack' });
  container.appendChild(host);

  let page = 0;
  const pageSize = 25;

  const load = async () => {
    clear(host);
    host.appendChild(createSkeleton({ rows: 5, label: 'Loading eligible slot candidates…' }));
    try {
      const [roster, candidatesData] = await Promise.all([
        rosterApi.getRoster(periodId, { status: 'DRAFT', signal }).catch(() => rosterApi.getRoster(periodId, { signal })),
        rosterApi.listDraftAssignmentCandidates(versionId, {
          holidayId,
          slotType,
          slotNumber,
          page,
          pageSize,
          signal,
        }),
      ]);
      if (signal?.aborted) return;
      clear(host);

      const targetVersion =
        roster?.versions?.find((v) => String(v.id) === String(versionId)) ||
        pickActiveVersion(roster, 'DRAFT');
      const slot = roster?.slots?.find(
        (s) =>
          s.holidayId === holidayId &&
          s.slotType === slotType &&
          s.slotNumber === slotNumber
      );
      const currentAssignment =
        assignmentId != null
          ? roster?.assignments?.find((a) => a.id === assignmentId)
          : slot?.assignmentId != null
            ? roster?.assignments?.find((a) => a.id === slot.assignmentId)
            : null;

      const candidates = candidatesData?.items || [];
      const errBox = el('div', { id: 'publish-error-box', className: 'stack-sm' });
      const submitBtn = el(
        'button',
        { type: 'submit', className: 'btn btn-primary', disabled: !candidates.length },
        currentAssignment ? 'Save manual reassignment' : 'Assign selected candidate'
      );

      const form = el(
        'form',
        { className: 'panel stack', novalidate: true },
        el('h2', {}, 'Select eligible candidate'),
        errBox,
        candidates.length
          ? createField({
              name: 'employeeId',
              label: 'Eligible and available employee',
              type: 'select',
              required: true,
              hint: 'List reflects point-in-time eligibility, availability, and single-slot-per-holiday checks. It is not a reservation and is not fairness-ranked.',
              options: [
                { value: '', label: 'Select an employee…' },
                ...candidates.map((c) => ({
                  value: String(c.employeeId),
                  label: `${c.displayName} (#${c.employeeId})`,
                })),
              ],
            })
          : createAlert({
              variant: 'warning',
              title: 'No eligible candidates currently available',
              message:
                'No employees pass active-employment, rotation-eligibility, availability, and single-slot-per-holiday checks for this slot.',
            }),
        createField({
          name: 'reason',
          label: 'Audit reason for manual assignment',
          type: 'textarea',
          required: true,
          maxlength: 1000,
          rows: 3,
          hint: 'Required. Persisted with MANUAL origin and actor identity.',
        }),
        el(
          'div',
          { className: 'cluster' },
          submitBtn,
          el(
            'a',
            {
              href: `/roster/${periodId}?status=DRAFT`,
              className: 'btn btn-secondary',
              onClick: (e) => {
                e.preventDefault();
                navigate(`/roster/${periodId}?status=DRAFT`);
              },
            },
            'Back to draft'
          )
        )
      );

      host.append(
        el(
          'div',
          { className: 'page-header' },
          el(
            'div',
            { className: 'page-header__title-group' },
            el(
              'h1',
              { id: 'main-heading', tabindex: '-1' },
              currentAssignment ? 'Edit draft assignment' : 'Fill unassigned draft slot'
            ),
            el(
              'p',
              { className: 'muted' },
              `${slot?.holidayName || `Holiday #${holidayId}`} (${formatIsoDate(slot?.holidayDate)}) · ${slotType} Slot #${slotNumber}`
            )
          )
        ),
        currentAssignment
          ? createAlert({
              variant: 'info',
              title: 'Current draft assignee',
              message: `${currentAssignment.employeeDisplayName || `Employee #${currentAssignment.employeeId}`} (${currentAssignment.origin})`,
            })
          : createAlert({
              variant: 'warning',
              title: 'Currently unfilled draft slot',
              message: 'Assigning a candidate creates a MANUAL proposed assignment subject to server commit-time revalidation.',
            }),
        form,
        createPagination({
          page: candidatesData.page,
          onPageChange: (next) => {
            page = next;
            load();
          },
        })
      );

      bindFormValidation(form, {
        signal,
        onSubmitValid: async (fd) => {
          clearServerFieldErrors(form);
          clear(errBox);
          const employeeId = Number(fd.get('employeeId'));
          const reason = String(fd.get('reason') || '').trim();
          const confirmed = await confirmDialog({
            title: 'Confirm manual draft assignment?',
            message: 'The server will revalidate eligibility, availability, one-slot-per-holiday, and version concurrency at commit.',
            confirmLabel: 'Confirm assignment',
          });
          if (!confirmed) return;

          submitBtn.disabled = true;
          try {
            const ifMatch = resolveIfMatch(targetVersion);
            if (currentAssignment) {
              await rosterApi.updateDraftAssignment(
                versionId,
                currentAssignment.id,
                { employeeId, reason },
                ifMatch
              );
            } else {
              await rosterApi.createDraftAssignment(
                versionId,
                { holidayId, slotType, slotNumber, employeeId, reason },
                ifMatch
              );
            }
            showToast('Draft assignment updated.', { variant: 'success' });
            navigate(`/roster/${periodId}?status=DRAFT`);
          } catch (err) {
            applyServerFieldErrors(form, err.fieldErrors);
            errBox.appendChild(
              createAlert({
                variant: 'error',
                title: err.status === 409 ? 'Stale draft or candidate conflict' : 'Assignment rejected',
                message: err.message,
                correlationId: err.correlationId,
                actionLabel: err.status === 409 ? 'Refresh candidates' : '',
                onAction: err.status === 409 ? load : null,
              })
            );
          } finally {
            submitBtn.disabled = false;
          }
        },
      });
    } catch (err) {
      if (isAbortError(err)) return;
      clear(host);
      host.append(
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Manual assignment unavailable'),
        createAlert({ variant: 'error', title: 'Failed to load candidates', message: err.message, correlationId: err.correlationId, actionLabel: 'Retry', onAction: load })
      );
    }
  };

  await load();
}

export async function renderPublishRosterPage({ container, params, navigate, signal }) {
  const { periodId, versionId } = params;
  const host = el('div', { className: 'stack' });
  container.appendChild(host);

  const load = async () => {
    clear(host);
    host.appendChild(createSkeleton({ rows: 4, label: 'Loading version summary for publication…' }));
    try {
      const roster = await rosterApi.getRoster(periodId, { status: 'DRAFT', signal }).catch(() => rosterApi.getRoster(periodId, { signal }));
      if (signal?.aborted) return;
      clear(host);

      const targetVersion =
        roster?.versions?.find((v) => String(v.id) === String(versionId)) ||
        pickActiveVersion(roster, 'DRAFT');
      const slots = roster?.slots || [];
      const unfilled = slots.filter((s) => s.assignmentId == null);
      const errBox = el('div', { id: 'publish-error-box', className: 'stack-sm' });
      const publishBtn = el('button', { type: 'button', className: 'btn btn-primary' }, 'Publish official roster');

      publishBtn.addEventListener('click', async () => {
        clear(errBox);
        const confirmed = await confirmDialog({
          title: `Publish Roster Version v${targetVersion?.versionNumber ?? versionId}?`,
          message:
            'Publication establishes an immutable official roster version, triggers server-side revalidation, updates official Primary workload credits, and queues notifications.',
          confirmLabel: 'Publish roster',
        });
        if (!confirmed) return;

        publishBtn.disabled = true;
        publishBtn.textContent = 'Publishing…';
        try {
          await rosterApi.publishRosterVersion(
            versionId,
            resolveIfMatch(targetVersion),
            generateIdempotencyKey('publish')
          );
          showToast('Roster version published.', { variant: 'success' });
          navigate(`/roster/${periodId}?status=PUBLISHED`);
        } catch (err) {
          errBox.appendChild(
            createAlert({
              variant: 'error',
              title: err.status === 409 ? 'Version conflict' : 'Publication blocked by validation',
              message: err.message,
              correlationId: err.correlationId,
              actionLabel: err.status === 409 ? 'Reload' : '',
              onAction: err.status === 409 ? load : null,
            })
          );
        } finally {
          publishBtn.disabled = false;
          publishBtn.textContent = 'Publish official roster';
        }
      });

      appendChildren(host, [
        el(
          'div',
          { className: 'page-header' },
          el(
            'div',
            { className: 'page-header__title-group' },
            el('h1', { id: 'main-heading', tabindex: '-1' }, `Publish draft version · ${roster?.period?.periodName || `Period #${periodId}`}`),
            targetVersion ? createStatusBadge(targetVersion.status) : null
          )
        ),
        errBox,
        targetVersion?.parentVersionId != null
          ? createAlert({
              variant: 'warning',
              title: 'Two-person revision control (FDR-09)',
              message:
                'This draft is a revision derived from a published version. The publisher must be a different user account from the actor who initiated the revision.',
            })
          : null,
        unfilled.length > 0
          ? createAlert({
              variant: 'error',
              title: 'Unresolved staffing gaps present',
              message: `${unfilled.length} slot(s) remain unassigned. Server validation blocks publication unless all configured slots are filled.`,
            })
          : createAlert({
              variant: 'info',
              title: 'Coverage summary',
              message: `All ${slots.length} configured slots have proposed assignments. Server will atomically revalidate eligibility, availability, and counts on publish.`,
            }),
        el(
          'section',
          { className: 'panel cluster' },
          publishBtn,
          el(
            'a',
            {
              href: `/roster/${periodId}?status=DRAFT`,
              className: 'btn btn-secondary',
              onClick: (e) => {
                e.preventDefault();
                navigate(`/roster/${periodId}?status=DRAFT`);
              },
            },
            'Return to draft'
          )
        )
      ]);
    } catch (err) {
      if (isAbortError(err)) return;
      clear(host);
      host.append(
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Publish unavailable'),
        createAlert({ variant: 'error', title: 'Load failed', message: err.message, correlationId: err.correlationId })
      );
    }
  };

  await load();
}

export async function renderRosterHistoryPage({ container, params, navigate, signal }) {
  const periodId = params.periodId;
  const canRevise = hasPermission('ROSTER.REVISE');
  const host = el('div', { className: 'stack' });
  container.appendChild(host);

  const load = async () => {
    clear(host);
    host.appendChild(createSkeleton({ rows: 5, label: 'Loading version history…' }));
    try {
      const roster = await rosterApi.getRoster(periodId, { signal });
      if (signal?.aborted) return;
      clear(host);

      const versions = Array.isArray(roster?.versions) ? roster.versions : [];
      const publishedVersions = versions.filter((v) => v.status === 'PUBLISHED');
      const slotHolidays = Array.from(
        new Map((roster?.slots || []).map((s) => [s.holidayId, `${s.holidayName} (${s.holidayDate})`])).entries()
      );

      host.append(
        el(
          'div',
          { className: 'page-header' },
          el(
            'div',
            { className: 'page-header__title-group' },
            el('h1', { id: 'main-heading', tabindex: '-1' }, `Version history & revisions · ${roster?.period?.periodName || `Period #${periodId}`}`),
            el('p', { className: 'muted' }, 'Published versions are immutable. Corrections create reasoned child drafts requiring a separate publisher (FDR-09/10).')
          ),
          el(
            'div',
            { className: 'page-header__actions' },
            el(
              'a',
              {
                href: `/roster/${periodId}`,
                className: 'btn btn-secondary',
                onClick: (e) => {
                  e.preventDefault();
                  navigate(`/roster/${periodId}`);
                },
              },
              'Back to roster'
            )
          )
        ),
        createDataTable({
          caption: 'Roster version lineage',
          columns: [
            { key: 'versionNumber', label: 'Version', isRowHeader: true, render: (v) => `v${v.versionNumber ?? v.id} (ID #${v.id})` },
            { key: 'status', label: 'Status', render: (v) => createStatusBadge(v.status) },
            { key: 'parentVersionId', label: 'Parent version', render: (v) => (v.parentVersionId != null ? `#${v.parentVersionId}` : 'Initial') },
            { key: 'rowVersion', label: 'Row version', render: (v) => String(v.rowVersion ?? 0) },
          ],
          rows: versions,
          emptyNode: el('p', { className: 'muted' }, 'No versions exist yet for this period.'),
        })
      );

      if (canRevise && publishedVersions.length > 0) {
        const errBox = el('div', { id: 'publish-error-box', className: 'stack-sm' });
        const changeRows = [{ changeType: 'ASSIGNMENT' }];
        const changesContainer = el('div', { className: 'stack-sm' });

        const renderChanges = () => {
          clear(changesContainer);
          changeRows.forEach((row, idx) => {
            const dateField = createField({ name: `holidayDate_${idx}`, label: 'New holiday date (for DATE)', type: 'date' });
            const primaryField = createField({ name: `primaryCount_${idx}`, label: 'Primary count (for STAFFING, >=1)', type: 'number', min: 1 });
            const standbyField = createField({ name: `standbyCount_${idx}`, label: 'Standby count (for STAFFING, >=0)', type: 'number', min: 0 });
            const empField = createField({ name: `employeeId_${idx}`, label: 'Employee ID (for ASSIGNMENT)', type: 'number', min: 1 });
            const slotTypeField = createField({
              name: `slotType_${idx}`,
              label: 'Slot type (for ASSIGNMENT)',
              type: 'select',
              options: [
                { value: '', label: '—' },
                { value: 'PRIMARY', label: 'PRIMARY' },
                { value: 'STANDBY', label: 'STANDBY' },
              ],
            });
            const slotNumField = createField({ name: `slotNumber_${idx}`, label: 'Slot number (for ASSIGNMENT)', type: 'number', min: 1 });
            const cancelField = createField({ name: `cancelled_${idx}`, label: 'Mark holiday cancelled (for CANCELLATION)', type: 'checkbox' });

            const syncVisibleFields = (type) => {
              dateField.hidden = type !== 'DATE';
              primaryField.hidden = type !== 'STAFFING';
              standbyField.hidden = type !== 'STAFFING';
              empField.hidden = type !== 'ASSIGNMENT';
              slotTypeField.hidden = type !== 'ASSIGNMENT';
              slotNumField.hidden = type !== 'ASSIGNMENT';
              cancelField.hidden = type !== 'CANCELLATION';
            };
            syncVisibleFields(row.changeType);

            const fieldset = el(
              'fieldset',
              { className: 'field-group' },
              el('legend', {}, `Correction item ${idx + 1}`),
              el(
                'div',
                { className: 'form-grid' },
                createField({
                  name: `holidayId_${idx}`,
                  label: 'Holiday',
                  type: slotHolidays.length ? 'select' : 'number',
                  required: true,
                  options: slotHolidays.map(([id, label]) => ({ value: String(id), label: `${label} (#${id})` })),
                }),
                createField({
                  name: `changeType_${idx}`,
                  label: 'Change type',
                  type: 'select',
                  required: true,
                  value: row.changeType,
                  options: [
                    { value: 'ASSIGNMENT', label: 'Assignment change' },
                    { value: 'DATE', label: 'Holiday date change' },
                    { value: 'STAFFING', label: 'Staffing counts change' },
                    { value: 'CANCELLATION', label: 'Holiday cancellation' },
                  ],
                  onChange: (e) => {
                    changeRows[idx].changeType = e.target.value;
                    syncVisibleFields(e.target.value);
                  },
                }),
                dateField,
                primaryField,
                standbyField,
                empField,
                slotTypeField,
                slotNumField,
                cancelField
              ),
              changeRows.length > 1
                ? el(
                    'button',
                    {
                      type: 'button',
                      className: 'btn btn-ghost btn-sm',
                      onClick: () => {
                        changeRows.splice(idx, 1);
                        renderChanges();
                      },
                    },
                    'Remove item'
                  )
                : null
            );
            changesContainer.appendChild(fieldset);
          });
        };
        renderChanges();

        const submitBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Create reasoned draft revision');
        const reviseForm = el(
          'form',
          { className: 'panel stack', novalidate: true },
          el('h2', {}, 'Create reasoned correction revision (works for open or closed periods)'),
          errBox,
          createField({
            name: 'sourceVersionId',
            label: 'Source published version',
            type: 'select',
            required: true,
            value: String(publishedVersions[publishedVersions.length - 1].id),
            options: publishedVersions.map((v) => ({
              value: String(v.id),
              label: `Version v${v.versionNumber ?? v.id} (ID #${v.id})`,
            })),
          }),
          createField({
            name: 'reason',
            label: 'Revision reason',
            type: 'textarea',
            required: true,
            maxlength: 1000,
            rows: 3,
          }),
          changesContainer,
          el(
            'div',
            { className: 'cluster' },
            el(
              'button',
              {
                type: 'button',
                className: 'btn btn-secondary',
                onClick: () => {
                  changeRows.push({ changeType: 'ASSIGNMENT' });
                  renderChanges();
                },
              },
              'Add change item'
            ),
            submitBtn
          )
        );
        host.appendChild(reviseForm);

        bindFormValidation(reviseForm, {
          signal,
          onSubmitValid: async (fd) => {
            clearServerFieldErrors(reviseForm);
            clear(errBox);
            const srcId = String(fd.get('sourceVersionId'));
            const sourceVersion = publishedVersions.find((v) => String(v.id) === srcId);
            const changes = changeRows.map((_, idx) => {
              const changeType = String(fd.get(`changeType_${idx}`));
              const entry = {
                holidayId: Number(fd.get(`holidayId_${idx}`)),
                changeType,
              };
              const holidayDate = String(fd.get(`holidayDate_${idx}`) || '').trim();
              const pCount = String(fd.get(`primaryCount_${idx}`) || '').trim();
              const sCount = String(fd.get(`standbyCount_${idx}`) || '').trim();
              const empId = String(fd.get(`employeeId_${idx}`) || '').trim();
              const sType = String(fd.get(`slotType_${idx}`) || '').trim();
              const sNum = String(fd.get(`slotNumber_${idx}`) || '').trim();
              const cancelledCb = reviseForm.elements.namedItem(`cancelled_${idx}`);

              if (holidayDate) entry.holidayDate = holidayDate;
              if (pCount) entry.primaryCount = Number(pCount);
              if (sCount) entry.standbyCount = Number(sCount);
              if (empId) entry.employeeId = Number(empId);
              if (sType) entry.slotType = sType;
              if (sNum) entry.slotNumber = Number(sNum);
              if (changeType === 'CANCELLATION') entry.cancelled = Boolean(cancelledCb?.checked ?? true);
              return entry;
            });

            const confirmed = await confirmDialog({
              title: 'Create draft revision from published version?',
              message:
                'This creates a mutable child draft version without changing the current effective published roster. A different user with ROSTER.PUBLISH must validate and publish it.',
              confirmLabel: 'Create revision',
            });
            if (!confirmed) return;

            submitBtn.disabled = true;
            try {
              await rosterApi.createRosterRevision(
                srcId,
                { reason: String(fd.get('reason') || '').trim(), changes },
                resolveIfMatch(sourceVersion),
                generateIdempotencyKey('revise')
              );
              showToast('Draft revision created.', { variant: 'success' });
              navigate(`/roster/${periodId}?status=DRAFT`);
            } catch (err) {
              applyServerFieldErrors(reviseForm, err.fieldErrors);
              errBox.appendChild(
                createAlert({
                  variant: 'error',
                  title: err.status === 409 ? 'Version conflict' : 'Revision creation failed',
                  message: err.message,
                  correlationId: err.correlationId,
                  actionLabel: err.status === 409 ? 'Reload' : '',
                  onAction: err.status === 409 ? load : null,
                })
              );
            } finally {
              submitBtn.disabled = false;
            }
          },
        });
      }
    } catch (err) {
      if (isAbortError(err)) return;
      clear(host);
      host.append(
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Version history unavailable'),
        createAlert({ variant: 'error', title: 'Load failed', message: err.message, correlationId: err.correlationId })
      );
    }
  };

  await load();
}
