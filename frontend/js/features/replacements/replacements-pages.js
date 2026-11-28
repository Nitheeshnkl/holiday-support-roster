import { el, clear } from '../../utils/dom.js';
import { formatIsoDate, formatDateTimeUtc } from '../../utils/date.js';
import { bindFormValidation, applyServerFieldErrors, clearServerFieldErrors } from '../../utils/validation.js';
import { generateIdempotencyKey } from '../../utils/format.js';
import { createField } from '../../components/form-controls.js';
import { createAlert, createEmptyState, createSkeleton, showToast } from '../../components/alert.js';
import { createDataTable } from '../../components/data-table.js';
import { createPagination } from '../../components/pagination.js';
import { createStatusBadge } from '../../components/status-badge.js';
import { confirmDialog } from '../../components/dialog.js';
import {
  canApproveReplacements,
  hasPermission,
  isRecusedFromReplacement,
} from '../../state/session-store.js';
import { resolveIfMatch } from '../../api/client.js';
import * as replacementsApi from '../../api/replacements.js';
import * as rosterApi from '../../api/roster.js';
import { isAbortError } from '../../api/errors.js';

export async function renderReplacementListPage({ container, navigate, signal }) {
  let status = '';
  let page = 0;
  let pageSize = 25;
  const canRequestOwn = hasPermission('REPLACEMENT.REQUEST_OWN');

  const listHost = el('div', { className: 'stack' });
  const filterForm = el(
    'form',
    { className: 'filter-bar', method: 'GET' },
    createField({
      name: 'status',
      label: 'Request status',
      type: 'select',
      value: status,
      options: [
        { value: '', label: 'All statuses' },
        { value: 'SUBMITTED', label: 'Submitted' },
        { value: 'AWAITING_MANAGER_DECISION', label: 'Awaiting Manager decision' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'REJECTED', label: 'Rejected' },
        { value: 'UNRESOLVED_STAFFING_GAP', label: 'Unresolved staffing gap' },
        { value: 'CANCELLED', label: 'Cancelled' },
      ],
    }),
    el('button', { type: 'submit', className: 'btn btn-primary' }, 'Filter')
  );

  filterForm.addEventListener(
    'submit',
    (e) => {
      e.preventDefault();
      status = String(new FormData(filterForm).get('status') || '');
      page = 0;
      load();
    },
    { signal }
  );

  container.append(
    el(
      'div',
      { className: 'page-header' },
      el(
        'div',
        { className: 'page-header__title-group' },
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Replacement requests'),
        el('p', { className: 'muted' }, 'One-way replacement workflow with mandatory Manager approval (FDR-03).')
      ),
      canRequestOwn
        ? el(
            'div',
            { className: 'page-header__actions' },
            el(
              'a',
              {
                href: '/replacements/new',
                className: 'btn btn-primary',
                onClick: (e) => {
                  e.preventDefault();
                  navigate('/replacements/new');
                },
              },
              'Report unavailability'
            )
          )
        : null
    ),
    el('search', {}, filterForm),
    listHost
  );

  const load = async () => {
    clear(listHost);
    listHost.appendChild(createSkeleton({ rows: 4, label: 'Loading replacement requests…' }));
    try {
      const data = await replacementsApi.listReplacementRequests({
        status: status || undefined,
        page,
        pageSize,
        signal,
      });
      if (signal?.aborted) return;

      clear(listHost);
      const items = data?.items || [];
      if (!items.length) {
        listHost.appendChild(
          createEmptyState({
            title: 'No replacement requests in this scope',
            description: 'Requests appear here when an employee reports unavailability against a published assignment.',
            actionLabel: canRequestOwn ? 'Report unavailability' : '',
            actionHref: canRequestOwn ? '/replacements/new' : '',
            onAction: canRequestOwn ? () => navigate('/replacements/new') : null,
          })
        );
        return;
      }

      listHost.appendChild(
        createDataTable({
          caption: 'Replacement requests',
          columns: [
            {
              key: 'requestCode',
              label: 'Request',
              isRowHeader: true,
              render: (r) =>
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
            },
            {
              key: 'requestedForDisplayName',
              label: 'Assigned employee',
              render: (r) => r.requestedForDisplayName || `Employee #${r.requestedForEmployeeId}`,
            },
            {
              key: 'holidayDate',
              label: 'Holiday / Slot',
              render: (r) => `${formatIsoDate(r.holidayDate)} · ${r.slotType || 'PRIMARY'} #${r.slotNumber ?? 1}`,
            },
            { key: 'requestReason', label: 'Reason' },
            {
              key: 'status',
              label: 'Status',
              render: (r) =>
                el(
                  'div',
                  { className: 'cluster' },
                  createStatusBadge(r.status),
                  r.staffingGap ? createStatusBadge('UNRESOLVED_STAFFING_GAP') : null
                ),
            },
            { key: 'submittedAtUtc', label: 'Submitted', render: (r) => formatDateTimeUtc(r.submittedAtUtc) },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) =>
                el(
                  'a',
                  {
                    href: `/replacements/${r.id}`,
                    className: 'btn btn-secondary btn-sm',
                    onClick: (e) => {
                      e.preventDefault();
                      navigate(`/replacements/${r.id}`);
                    },
                  },
                  'Inspect'
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
        createAlert({ variant: 'error', title: 'Unable to load replacement requests', message: err.message, correlationId: err.correlationId, actionLabel: 'Retry', onAction: load })
      );
    }
  };

  await load();
}

export async function renderCreateReplacementPage({ container, query, session, navigate, signal }) {
  const initialAssignmentId = query?.get('assignmentId') || '';
  const errBox = el('div', { className: 'stack-sm' });
  const submitBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Submit unavailability request');

  const assignmentIdField = createField({
    name: 'originalAssignmentId',
    label: 'Published assignment ID',
    type: 'number',
    min: 1,
    value: initialAssignmentId,
    required: true,
    hint: 'Select an assignment below (when available) or enter the published assignment ID.',
  });

  const pickerHost = el('div', { className: 'stack-sm' });

  const form = el(
    'form',
    { className: 'panel stack', novalidate: true },
    errBox,
    pickerHost,
    assignmentIdField,
    createField({
      name: 'reason',
      label: 'Reason for unavailability',
      type: 'textarea',
      required: true,
      maxlength: 1000,
      rows: 4,
    }),
    el(
      'div',
      { className: 'cluster' },
      submitBtn,
      el(
        'a',
        {
          href: '/replacements',
          className: 'btn btn-secondary',
          onClick: (e) => {
            e.preventDefault();
            navigate('/replacements');
          },
        },
        'Cancel'
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
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Report unavailability / request replacement'),
        el('p', { className: 'muted' }, 'One-way substitution request; never swaps dates automatically.')
      )
    ),
    createAlert({
      variant: 'warning',
      title: 'Original assignment remains in effect pending Manager approval',
      message:
        'Submitting this request creates an Awaiting Manager Decision item and notifies authorized approvers. Your published assignment does NOT change until an unconflicted Manager approves a replacement.',
    }),
    form
  );

  if (hasPermission('ROSTER.READ') && session?.user?.employeeId != null) {
    rosterApi
      .listRosterPeriods({ page: 0, pageSize: 5, signal })
      .then(async (periods) => {
        if (signal?.aborted) return;
        const rosters = await Promise.all(
          (periods?.items || []).slice(0, 3).map((p) =>
            rosterApi.getRoster(p.id, { status: 'PUBLISHED', signal }).catch(() => null)
          )
        );
        if (signal?.aborted) return;
        const ownPublished = [];
        for (const r of rosters) {
          for (const a of r?.assignments || []) {
            if (a.employeeId === session.user.employeeId && ['PUBLISHED', 'CURRENT'].includes(a.status)) {
              ownPublished.push(a);
            }
          }
        }
        if (ownPublished.length) {
          pickerHost.appendChild(
            createField({
              name: 'publishedAssignmentPicker',
              label: 'Your current published assignments',
              type: 'select',
              value: initialAssignmentId,
              options: [
                { value: '', label: 'Select an assignment…' },
                ...ownPublished.map((a) => ({
                  value: String(a.id),
                  label: `${a.holidayName || `Holiday #${a.holidayId}`} (${formatIsoDate(a.holidayDate)}) · ${a.slotType} #${a.slotNumber} (ID #${a.id})`,
                })),
              ],
              onChange: (e) => {
                const input = form.elements.namedItem('originalAssignmentId');
                if (input && e.target.value) input.value = e.target.value;
              },
            })
          );
        }
      })
      .catch(() => {});
  }

  bindFormValidation(form, {
    signal,
    onSubmitValid: async (fd) => {
      clearServerFieldErrors(form);
      clear(errBox);
      const confirmed = await confirmDialog({
        title: 'Submit unavailability request?',
        message: 'Your current published assignment stays active until an authorized Manager approves a valid replacement.',
        confirmLabel: 'Submit request',
      });
      if (!confirmed) return;

      submitBtn.disabled = true;
      try {
        const created = await replacementsApi.createReplacementRequest(
          {
            originalAssignmentId: Number(fd.get('originalAssignmentId')),
            reason: String(fd.get('reason') || '').trim(),
          },
          generateIdempotencyKey('rep-req')
        );
        showToast('Replacement request submitted; awaiting Manager decision.', {
          variant: 'success',
        });
        navigate(`/replacements/${created.id}`);
      } catch (err) {
        applyServerFieldErrors(form, err.fieldErrors);
        errBox.appendChild(
          createAlert({ variant: 'error', title: 'Submission failed', message: err.message, correlationId: err.correlationId })
        );
      } finally {
        submitBtn.disabled = false;
      }
    },
  });
}

export async function renderReplacementDetailPage({ container, params, session, signal }) {
  const requestId = params.requestId;
  const host = el('div', { className: 'stack' });
  container.appendChild(host);

  const load = async () => {
    clear(host);
    host.appendChild(createSkeleton({ rows: 5, label: 'Loading replacement request…' }));
    try {
      const list = await replacementsApi.listReplacementRequests({ page: 0, pageSize: 100, signal });
      if (signal?.aborted) return;
      const req = (list?.items || []).find((item) => String(item.id) === String(requestId));

      if (!req) {
        clear(host);
        host.append(
          el('h1', { id: 'main-heading', tabindex: '-1' }, 'Replacement request unavailable'),
          createAlert({
            variant: 'warning',
            title: 'Request not found',
            message: 'The replacement request could not be found or is outside your permitted scope.',
          })
        );
        return;
      }

      const isPending = ['SUBMITTED', 'AWAITING_MANAGER_DECISION'].includes(req.status);
      const hasApprovePerm = canApproveReplacements();
      let candidatesData = null;
      let candidateErr = null;

      if (hasApprovePerm && isPending) {
        try {
          candidatesData = await replacementsApi.listReplacementCandidates(req.id, {
            page: 0,
            pageSize: 100,
            signal,
          });
        } catch (err) {
          if (isAbortError(err)) return;
          candidateErr = err;
        }
      }
      if (signal?.aborted) return;
      clear(host);

      const candidates = candidatesData?.items || [];
      const recused = isRecusedFromReplacement(req, candidates);

      host.append(
        el(
          'div',
          { className: 'page-header' },
          el(
            'div',
            { className: 'page-header__title-group' },
            el('h1', { id: 'main-heading', tabindex: '-1' }, req.requestCode || `Replacement Request #${req.id}`),
            el(
              'div',
              { className: 'cluster' },
              createStatusBadge(req.status),
              req.staffingGap ? createStatusBadge('UNRESOLVED_STAFFING_GAP') : null
            )
          )
        )
      );

      if (req.staffingGap || req.status === 'UNRESOLVED_STAFFING_GAP') {
        host.appendChild(
          createAlert({
            variant: 'error',
            title: 'Unresolved staffing gap',
            message:
              'No eligible and available replacement candidate was found. The original assignment remains preserved and escalated.',
          })
        );
      }

      host.appendChild(
        el(
          'section',
          { className: 'panel', 'aria-labelledby': 'rep-summary-h' },
          el('h2', { id: 'rep-summary-h' }, 'Request summary'),
          el(
            'dl',
            { className: 'kv-grid' },
            el(
              'div',
              { className: 'kv-item' },
              el('dt', {}, 'Assigned employee'),
              el('dd', {}, req.requestedForDisplayName || `Employee #${req.requestedForEmployeeId}`)
            ),
            el(
              'div',
              { className: 'kv-item' },
              el('dt', {}, 'Requester'),
              el('dd', {}, req.requesterDisplayName || (req.requesterUserAccountId != null ? `Account #${req.requesterUserAccountId}` : '—'))
            ),
            el(
              'div',
              { className: 'kv-item' },
              el('dt', {}, 'Holiday & slot'),
              el('dd', {}, `${formatIsoDate(req.holidayDate)} · ${req.slotType || 'PRIMARY'} Slot #${req.slotNumber ?? 1}`)
            ),
            el('div', { className: 'kv-item' }, el('dt', {}, 'Original assignment ID'), el('dd', {}, `#${req.originalAssignmentId}`)),
            el('div', { className: 'kv-item' }, el('dt', {}, 'Submitted'), el('dd', {}, formatDateTimeUtc(req.submittedAtUtc))),
            el('div', { className: 'kv-item' }, el('dt', {}, 'Resolved'), el('dd', {}, formatDateTimeUtc(req.resolvedAtUtc))),
            el(
              'div',
              { className: 'kv-item' },
              el('dt', {}, 'Suggested standby assignment'),
              el('dd', {}, req.suggestedStandbyAssignmentId != null ? `#${req.suggestedStandbyAssignmentId}` : 'None')
            ),
            el(
              'div',
              { className: 'kv-item' },
              el('dt', {}, 'Selected replacement'),
              el(
                'dd',
                {},
                req.selectedReplacementDisplayName ||
                  (req.selectedReplacementEmployeeId != null ? `Employee #${req.selectedReplacementEmployeeId}` : 'Pending / None')
              )
            )
          ),
          el('p', {}, el('strong', {}, 'Request reason: '), req.requestReason)
        )
      );

      // Candidate review and Manager approval workflow (REP-03)
      if (isPending) {
        if (!hasApprovePerm) {
          host.appendChild(
            createAlert({
              variant: 'info',
              title: 'Awaiting scoped Manager decision',
              message:
                'Replacement approval requires an explicit active scoped REPLACEMENT.APPROVE grant. Your original assignment remains in effect until a Manager decides.',
            })
          );
        } else if (recused) {
          host.appendChild(
            createAlert({
              variant: 'warning',
              title: 'Recusal applied (FDR-03)',
              message:
                'Decision controls are hidden because you are a participant (requester, affected assignee, or listed candidate) on this replacement request. Another unconflicted approver must decide.',
            })
          );
        } else if (candidateErr) {
          host.appendChild(
            createAlert({
              variant: 'error',
              title: 'Unable to load replacement candidates',
              message: candidateErr.message,
              correlationId: candidateErr.correlationId,
            })
          );
        } else {
          // Sort Standby first, matching contract guarantee
          const sortedCandidates = [...candidates].sort(
            (a, b) => Number(Boolean(b.suggestedStandby)) - Number(Boolean(a.suggestedStandby))
          );
          const selectableCandidates = sortedCandidates.filter((c) => c.eligible && c.available);

          const decisionPanel = el('section', { className: 'panel stack replacement-decision', 'aria-labelledby': 'rep-decide-h' });
          decisionPanel.appendChild(el('h2', { id: 'rep-decide-h' }, 'Candidate review and Manager decision'));

          if (!selectableCandidates.length) {
            decisionPanel.appendChild(
              createAlert({
                variant: 'error',
                title: 'Unresolved staffing gap — no eligible candidate',
                message:
                  'None of the evaluated employees currently pass both eligibility and availability checks. Approving a replacement is unavailable until an eligible candidate exists; you may still reject with a reason or allow escalation.',
              })
            );
          }

          if (sortedCandidates.length) {
            decisionPanel.appendChild(
              createDataTable({
                caption: 'Evaluated replacement candidates (designated Standby listed first)',
                columns: [
                  {
                    key: 'displayName',
                    label: 'Candidate',
                    isRowHeader: true,
                    render: (c) =>
                      el(
                        'div',
                        { className: 'cluster' },
                        el('strong', {}, `${c.displayName} (#${c.employeeId})`),
                        c.suggestedStandby ? createStatusBadge('STANDBY', 'Suggested Standby (First)') : null
                      ),
                  },
                  { key: 'eligible', label: 'Eligible', render: (c) => (c.eligible ? 'Yes' : 'No') },
                  { key: 'available', label: 'Available', render: (c) => (c.available ? 'Yes' : 'No') },
                  { key: 'exclusionReason', label: 'Exclusion note', render: (c) => c.exclusionReason || '—' },
                ],
                rows: sortedCandidates,
              })
            );
          }

          const errBox = el('div', { className: 'stack-sm' });
          const candidateSelectWrapper = createField({
            name: 'replacementEmployeeId',
            label: 'Select eligible replacement employee (required for Approval)',
            type: 'select',
            required: selectableCandidates.length > 0,
            options: [
              { value: '', label: 'Select candidate…' },
              ...selectableCandidates.map((c) => ({
                value: String(c.employeeId),
                label: `${c.displayName}${c.suggestedStandby ? ' (Designated Standby)' : ''}`,
              })),
            ],
          });

          const decisionSelect = createField({
            name: 'decision',
            label: 'Decision',
            type: 'select',
            required: true,
            value: selectableCandidates.length ? 'APPROVED' : 'REJECTED',
            options: [
              ...(selectableCandidates.length ? [{ value: 'APPROVED', label: 'Approve replacement' }] : []),
              { value: 'REJECTED', label: 'Reject request (retain original assignment)' },
            ],
            onChange: (e) => {
              const isApprove = e.target.value === 'APPROVED';
              candidateSelectWrapper.hidden = !isApprove;
              const sel = candidateSelectWrapper.querySelector('select');
              if (sel) sel.required = isApprove;
            },
          });
          if (!selectableCandidates.length) candidateSelectWrapper.hidden = true;

          const submitBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Submit Manager decision');
          const decideForm = el(
            'form',
            { className: 'stack', novalidate: true },
            errBox,
            decisionSelect,
            candidateSelectWrapper,
            createField({
              name: 'reason',
              label: 'Decision reason',
              type: 'textarea',
              required: true,
              maxlength: 1000,
              rows: 3,
            }),
            el('div', { className: 'cluster' }, submitBtn)
          );
          decisionPanel.appendChild(decideForm);
          host.appendChild(decisionPanel);

          bindFormValidation(decideForm, {
            signal,
            onSubmitValid: async (fd) => {
              clearServerFieldErrors(decideForm);
              clear(errBox);
              const decision = String(fd.get('decision'));
              const empIdRaw = String(fd.get('replacementEmployeeId') || '').trim();
              if (decision === 'APPROVED' && !empIdRaw) {
                errBox.appendChild(
                  createAlert({ variant: 'error', title: 'Candidate required', message: 'Choose an eligible and available replacement candidate.' })
                );
                return;
              }

              const confirmed = await confirmDialog({
                title: decision === 'APPROVED' ? 'Confirm replacement approval?' : 'Confirm replacement rejection?',
                message:
                  decision === 'APPROVED'
                    ? 'The server will atomically revalidate your approval grant, scope, recusal, candidate availability, and version, then transfer the effective slot credit.'
                    : 'Rejecting retains the original assignment unchanged and records the decision in audit history.',
                confirmLabel: decision === 'APPROVED' ? 'Approve replacement' : 'Reject request',
                confirmVariant: decision === 'REJECTED' ? 'danger' : 'primary',
              });
              if (!confirmed) return;

              submitBtn.disabled = true;
              try {
                await replacementsApi.decideReplacement(
                  req.id,
                  {
                    decision,
                    replacementEmployeeId: decision === 'APPROVED' ? Number(empIdRaw) : null,
                    reason: String(fd.get('reason') || '').trim(),
                  },
                  resolveIfMatch(req),
                  generateIdempotencyKey('rep-decide')
                );
                showToast(`Replacement request ${decision.toLowerCase()}.`, { variant: 'success' });
                await load();
              } catch (err) {
                applyServerFieldErrors(decideForm, err.fieldErrors);
                errBox.appendChild(
                  createAlert({
                    variant: 'error',
                    title: err.status === 409 ? 'Concurrent update or stale state' : 'Decision failed',
                    message: err.message,
                    correlationId: err.correlationId,
                    actionLabel: err.status === 409 ? 'Reload request' : '',
                    onAction: err.status === 409 ? load : null,
                  })
                );
              } finally {
                submitBtn.disabled = false;
              }
            },
          });
        }
      }

      // Decision history table
      const decisions = Array.isArray(req.decisions) ? req.decisions : [];
      host.appendChild(
        el(
          'section',
          { className: 'panel', 'aria-labelledby': 'rep-hist-h' },
          el('h2', { id: 'rep-hist-h' }, 'Decision history'),
          decisions.length
            ? createDataTable({
                caption: 'Recorded replacement decisions',
                columns: [
                  { key: 'decision', label: 'Decision', isRowHeader: true, render: (d) => createStatusBadge(d.decision) },
                  {
                    key: 'approverDisplayName',
                    label: 'Approver',
                    render: (d) => d.approverDisplayName || `Account #${d.approverUserAccountId}`,
                  },
                  {
                    key: 'selectedReplacementDisplayName',
                    label: 'Selected replacement',
                    render: (d) =>
                      d.selectedReplacementDisplayName ||
                      (d.selectedReplacementEmployeeId != null ? `Employee #${d.selectedReplacementEmployeeId}` : '—'),
                  },
                  { key: 'decisionReason', label: 'Reason' },
                  { key: 'validationResult', label: 'Validation result' },
                  { key: 'decidedAtUtc', label: 'Decided at', render: (d) => formatDateTimeUtc(d.decidedAtUtc) },
                ],
                rows: decisions,
              })
            : el('p', { className: 'muted' }, 'No Manager decisions recorded yet.')
        )
      );
    } catch (err) {
      if (isAbortError(err)) return;
      clear(host);
      host.append(
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Replacement request unavailable'),
        createAlert({ variant: 'error', title: 'Load failed', message: err.message, correlationId: err.correlationId, actionLabel: 'Retry', onAction: load })
      );
    }
  };

  await load();
}
