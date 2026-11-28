import { el, clear } from '../../utils/dom.js';
import { formatIsoDate, formatDateTimeUtc } from '../../utils/date.js';
import { bindFormValidation, applyServerFieldErrors, clearServerFieldErrors } from '../../utils/validation.js';
import { createField } from '../../components/form-controls.js';
import { createAlert, createEmptyState, createSkeleton, showToast } from '../../components/alert.js';
import { createDataTable } from '../../components/data-table.js';
import { createStatusBadge } from '../../components/status-badge.js';
import { confirmDialog } from '../../components/dialog.js';
import { hasPermission } from '../../state/session-store.js';
import * as rosterApi from '../../api/roster.js';
import * as replacementsApi from '../../api/replacements.js';
import { isAbortError } from '../../api/errors.js';

export async function renderStandbyPage({ container, navigate, signal }) {
  const canReadRoster = hasPermission('ROSTER.READ');
  const canActivate = hasPermission('STANDBY.ACTIVATE');

  const listHost = el('div', { className: 'stack' });
  const formHost = el('div', { className: 'stack' });
  let filterFromDate = '';
  let filterToDate = '';
  let allStandbyRows = [];

  const filterForm = el(
    'form',
    { className: 'filter-bar', method: 'GET' },
    createField({ name: 'fromDate', label: 'Holiday from', type: 'date' }),
    createField({ name: 'toDate', label: 'Holiday to', type: 'date' }),
    el('button', { type: 'submit', className: 'btn btn-primary' }, 'Filter')
  );

  container.append(
    el(
      'div',
      { className: 'page-header' },
      el(
        'div',
        { className: 'page-header__title-group' },
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Standby and activation'),
        el('p', { className: 'muted' }, 'Backup Standby designations and approved replacement activation logging (STB-01).')
      )
    ),
    createAlert({
      variant: 'info',
      title: 'Standby semantics (FDR-01 / FDR-03)',
      message:
        'Standby is a backup designation only and earns zero Primary workload credit. Recording a Standby activation requires an already-approved replacement decision for the same Primary slot and never creates a duty-completion or performance claim.',
    }),
    formHost,
    canReadRoster ? el('search', {}, filterForm) : null,
    listHost
  );

  let standbyFormRef = null;

  if (canActivate) {
    const errBox = el('div', { className: 'stack-sm' });
    const resultHost = el('div', { className: 'stack-sm' });
    const submitBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Record standby activation');

    const form = el(
      'form',
      { className: 'panel stack', novalidate: true },
      el('h2', {}, 'Record standby activation'),
      errBox,
      el(
        'div',
        { className: 'form-grid' },
        createField({ name: 'standbyAssignmentId', label: 'Standby assignment ID', type: 'number', min: 1, required: true }),
        createField({ name: 'primaryAssignmentId', label: 'Primary assignment ID', type: 'number', min: 1, required: true }),
        createField({
          name: 'reason',
          label: 'Activation reason',
          type: 'textarea',
          required: true,
          maxlength: 1000,
          rows: 2,
          fullWidth: true,
        })
      ),
      el('div', { className: 'cluster' }, submitBtn),
      resultHost
    );
    formHost.appendChild(form);
    standbyFormRef = form;

    bindFormValidation(form, {
      signal,
      onSubmitValid: async (fd) => {
        clearServerFieldErrors(form);
        clear(errBox);
        const confirmed = await confirmDialog({
          title: 'Record Standby activation?',
          message:
            'Requires an already-approved replacement decision for this Primary slot. Records activation history only; does not change assignment credit or assert duty completion.',
          confirmLabel: 'Record activation',
        });
        if (!confirmed) return;

        submitBtn.disabled = true;
        try {
          const activation = await replacementsApi.activateStandby({
            standbyAssignmentId: Number(fd.get('standbyAssignmentId')),
            primaryAssignmentId: Number(fd.get('primaryAssignmentId')),
            reason: String(fd.get('reason') || '').trim(),
          });
          form.reset();
          showToast('Standby activation recorded.', { variant: 'success' });
          clear(resultHost);
          resultHost.appendChild(
            createAlert({
              variant: 'success',
              title: `Activation #${activation.id} recorded`,
              message: `Activated at ${formatDateTimeUtc(activation.activatedAtUtc)} · Status: ${activation.status}`,
              role: 'status',
            })
          );
        } catch (err) {
          applyServerFieldErrors(form, err.fieldErrors);
          errBox.appendChild(
            createAlert({ variant: 'error', title: 'Activation failed', message: err.message, correlationId: err.correlationId })
          );
        } finally {
          submitBtn.disabled = false;
        }
      },
    });
  }

  const renderStandbyRows = () => {
    clear(listHost);
    const filtered = allStandbyRows.filter((row) => {
      if (filterFromDate && String(row.holidayDate || '') < filterFromDate) return false;
      if (filterToDate && String(row.holidayDate || '') > filterToDate) return false;
      return true;
    });

    if (!filtered.length) {
      listHost.appendChild(
        createEmptyState({
          title: 'No published Standby assignments found',
          description: filterFromDate || filterToDate
            ? 'No Standby designations match your selected date range.'
            : 'Published Standby designations from recent periods appear here.',
          actionLabel: 'Browse rosters',
          actionHref: '/roster',
          onAction: () => navigate('/roster'),
        })
      );
      return;
    }

    const columns = [
      { key: 'id', label: 'Assignment ID', isRowHeader: true, render: (a) => `#${a.id}` },
      { key: 'holidayName', label: 'Holiday', render: (a) => `${a.holidayName || `Holiday #${a.holidayId}`} (${formatIsoDate(a.holidayDate)})` },
      { key: 'employeeDisplayName', label: 'Standby person', render: (a) => a.employeeDisplayName || `Employee #${a.employeeId}` },
      { key: 'slotNumber', label: 'Standby slot', render: (a) => `Standby #${a.slotNumber}` },
      { key: 'status', label: 'Status', render: (a) => createStatusBadge(a.status) },
    ];
    if (canActivate) {
      columns.push({
        key: 'actions',
        label: 'Actions',
        render: (a) =>
          el(
            'button',
            {
              type: 'button',
              className: 'btn btn-secondary btn-sm',
              onClick: () => {
                const input = standbyFormRef?.elements?.namedItem('standbyAssignmentId');
                if (input) {
                  input.value = String(a.id);
                  input.focus();
                }
              },
            },
            'Use for activation'
          ),
      });
    }

    listHost.appendChild(
      createDataTable({
        caption: 'Published Standby designations',
        columns,
        rows: filtered,
      })
    );
  };

  if (canReadRoster) {
    filterForm.addEventListener(
      'submit',
      (e) => {
        e.preventDefault();
        const fd = new FormData(filterForm);
        filterFromDate = String(fd.get('fromDate') || '');
        filterToDate = String(fd.get('toDate') || '');
        renderStandbyRows();
      },
      { signal }
    );

    listHost.appendChild(createSkeleton({ rows: 4, label: 'Loading standby designations…' }));
    try {
      const periods = await rosterApi.listRosterPeriods({ page: 0, pageSize: 10, signal });
      if (signal?.aborted) return;
      const items = periods?.items || [];
      const rosters = await Promise.all(
        items.slice(0, 3).map((p) => rosterApi.getRoster(p.id, { status: 'PUBLISHED', signal }).catch(() => null))
      );
      if (signal?.aborted) return;

      allStandbyRows = [];
      for (const roster of rosters) {
        if (!roster) continue;
        const assignList = Array.isArray(roster.assignments) ? roster.assignments : [];
        for (const a of assignList) {
          if (a.slotType === 'STANDBY') {
            allStandbyRows.push({ ...a, periodName: roster.period?.periodName || `Period #${roster.period?.id}`, periodId: roster.period?.id });
          }
        }
      }

      renderStandbyRows();
    } catch (err) {
      if (isAbortError(err)) return;
      clear(listHost);
      listHost.appendChild(
        createAlert({ variant: 'error', title: 'Unable to load standby assignments', message: err.message, correlationId: err.correlationId })
      );
    }
  }
}
