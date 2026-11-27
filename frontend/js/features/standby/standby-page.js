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
    listHost
  );

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

  if (canReadRoster) {
    listHost.appendChild(createSkeleton({ rows: 4, label: 'Loading standby designations…' }));
    try {
      const periods = await rosterApi.listRosterPeriods({ page: 0, pageSize: 10, signal });
      if (signal?.aborted) return;
      const items = periods?.items || [];
      const rosters = await Promise.all(
        items.slice(0, 3).map((p) => rosterApi.getRoster(p.id, { status: 'PUBLISHED', signal }).catch(() => null))
      );
      if (signal?.aborted) return;
      clear(listHost);

      const standbyRows = [];
      for (const roster of rosters) {
        if (!roster) continue;
        const assignList = Array.isArray(roster.assignments) ? roster.assignments : [];
        for (const a of assignList) {
          if (a.slotType === 'STANDBY') {
            standbyRows.push({ ...a, periodName: roster.period?.periodName || `Period #${roster.period?.id}`, periodId: roster.period?.id });
          }
        }
      }

      if (!standbyRows.length) {
        listHost.appendChild(
          createEmptyState({
            title: 'No published Standby assignments found',
            description: 'Published Standby designations from recent periods appear here.',
            actionLabel: 'Browse rosters',
            actionHref: '/roster',
            onAction: () => navigate('/roster'),
          })
        );
      } else {
        listHost.appendChild(
          createDataTable({
            caption: 'Published Standby designations',
            columns: [
              { key: 'id', label: 'Assignment ID', isRowHeader: true, render: (a) => `#${a.id}` },
              { key: 'holidayName', label: 'Holiday', render: (a) => `${a.holidayName || `Holiday #${a.holidayId}`} (${formatIsoDate(a.holidayDate)})` },
              { key: 'employeeDisplayName', label: 'Standby person', render: (a) => a.employeeDisplayName || `Employee #${a.employeeId}` },
              { key: 'slotNumber', label: 'Standby slot', render: (a) => `Standby #${a.slotNumber}` },
              { key: 'status', label: 'Status', render: (a) => createStatusBadge(a.status) },
            ],
            rows: standbyRows,
          })
        );
      }
    } catch (err) {
      if (isAbortError(err)) return;
      clear(listHost);
      listHost.appendChild(
        createAlert({ variant: 'error', title: 'Unable to load standby assignments', message: err.message, correlationId: err.correlationId })
      );
    }
  }
}
