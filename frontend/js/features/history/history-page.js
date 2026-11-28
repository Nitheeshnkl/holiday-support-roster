import { el, clear } from '../../utils/dom.js';
import { formatEnumLabel, buildFieldLabel } from '../../utils/format.js';
import { createField } from '../../components/form-controls.js';
import { createAlert, createEmptyState, createSkeleton } from '../../components/alert.js';
import { createDataTable } from '../../components/data-table.js';
import { createPagination } from '../../components/pagination.js';
import { hasPermission, hasScope } from '../../state/session-store.js';
import * as historyApi from '../../api/history.js';
import { isAbortError } from '../../api/errors.js';

const DIMENSIONS = [
  {
    value: 'EFFECTIVE_PUBLISHED_PRIMARY_CREDIT',
    label: 'Effective published Primary credits',
    description:
      'Authoritative fairness workload: one credit per currently effective published Primary slot. Approved replacements transfer this credit.',
  },
  {
    value: 'FUTURE_PUBLISHED_PRIMARY',
    label: 'Future published Primary assignments',
    description: 'Upcoming published Primary holiday responsibilities (planning view, kept distinct).',
  },
  {
    value: 'STANDBY_ASSIGNMENT',
    label: 'Standby assignments',
    description: 'Backup standby designations. Standby designation adds zero Primary workload credit.',
  },
  {
    value: 'STANDBY_ACTIVATION',
    label: 'Standby activations',
    description: 'Operational standby activation events. Activation alone never adds Primary credit or asserts duty completion.',
  },
  {
    value: 'DRAFT_ASSIGNMENT',
    label: 'Draft assignments',
    description: 'Provisional unpublished draft slots. Drafts never alter official historical workload.',
  },
  {
    value: 'REPLACED_ASSIGNMENT',
    label: 'Replaced assignments',
    description: 'Historical assignments transferred to another assignee after Manager approval.',
  },
  {
    value: 'CANCELLED_ASSIGNMENT',
    label: 'Cancelled assignments',
    description: 'Assignments or holiday slots cancelled via reasoned roster revision.',
  },
];

export async function renderDutyHistoryPage({ container, session, signal }) {
  const canQueryOtherEmployees = hasPermission('DUTY.REPORT.READ') && (hasScope('ORG') || hasScope('TEAM'));
  let dimension = 'EFFECTIVE_PUBLISHED_PRIMARY_CREDIT';
  let employeeId = canQueryOtherEmployees ? '' : String(session.user.employeeId || '');
  let fromDate = '';
  let toDate = '';
  let page = 0;
  let pageSize = 25;

  const listHost = el('div', { className: 'stack' });

  const filterForm = el(
    'form',
    { className: 'filter-bar', method: 'GET' },
    createField({
      name: 'dimension',
      label: 'Workload / history dimension',
      type: 'select',
      value: dimension,
      required: true,
      options: DIMENSIONS.map((d) => ({ value: d.value, label: d.label })),
    }),
    canQueryOtherEmployees
      ? createField({
          name: 'employeeId',
          label: 'Employee ID (optional)',
          type: 'number',
          min: 1,
          value: employeeId,
        })
      : null,
    createField({ name: 'fromDate', label: 'From date', type: 'date' }),
    createField({ name: 'toDate', label: 'To date', type: 'date' }),
    el('button', { type: 'submit', className: 'btn btn-primary' }, 'Inspect dimension')
  );

  filterForm.addEventListener(
    'submit',
    (e) => {
      e.preventDefault();
      const fd = new FormData(filterForm);
      dimension = String(fd.get('dimension') || 'EFFECTIVE_PUBLISHED_PRIMARY_CREDIT');
      if (canQueryOtherEmployees) {
        employeeId = String(fd.get('employeeId') || '').trim();
      }
      fromDate = String(fd.get('fromDate') || '');
      toDate = String(fd.get('toDate') || '');
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
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Workload and assignment history'),
        el('p', { className: 'muted' }, 'Seven separate assignment dimensions (FDR-01). No duty completion or combined total is calculated.')
      )
    ),
    el('search', {}, filterForm),
    listHost
  );

  const load = async () => {
    clear(listHost);
    const meta = DIMENSIONS.find((d) => d.value === dimension) || DIMENSIONS[0];
    listHost.appendChild(createSkeleton({ rows: 4, label: `Loading ${meta.label}…` }));

    try {
      const data = await historyApi.getDutyHistory({
        dimension,
        employeeId: employeeId ? Number(employeeId) : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        pageSize,
        signal,
      });
      if (signal?.aborted) return;

      clear(listHost);
      listHost.appendChild(
        createAlert({
          variant: 'info',
          title: meta.label,
          message: meta.description,
        })
      );

      const items = data?.items || [];
      if (!items.length) {
        listHost.appendChild(
          createEmptyState({
            title: `No records in ${meta.label}`,
            description: 'No entries match your selected dimension and filter criteria.',
          })
        );
        return;
      }

      const keySet = new Set();
      items.forEach((row) => Object.keys(row || {}).forEach((k) => keySet.add(k)));
      const columns = Array.from(keySet).map((key, idx) => ({
        key,
        label: buildFieldLabel(key),
        isRowHeader: idx === 0,
        render: (row) => (row[key] == null ? '—' : String(row[key])),
      }));

      listHost.appendChild(
        createDataTable({
          caption: `${formatEnumLabel(data.dimension || dimension)} (${items.length} on page)`,
          columns,
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
        createAlert({
          variant: 'error',
          title: 'Failed to load duty history',
          message: err.message,
          correlationId: err.correlationId,
          actionLabel: 'Retry',
          onAction: load,
        })
      );
    }
  };

  await load();
}
