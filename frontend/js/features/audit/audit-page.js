import { el, clear } from '../../utils/dom.js';
import { formatDateTimeUtc } from '../../utils/date.js';
import { createAlert, createEmptyState, createSkeleton } from '../../components/alert.js';
import { createField } from '../../components/form-controls.js';
import { createDataTable } from '../../components/data-table.js';
import { createPagination } from '../../components/pagination.js';
import { createStatusBadge } from '../../components/status-badge.js';
import * as auditApi from '../../api/audit.js';
import { isAbortError } from '../../api/errors.js';

export async function renderAuditPage({ container, signal }) {
  let fromDate = '';
  let toDate = '';
  let page = 0;
  let pageSize = 25;

  const listHost = el('div', { className: 'stack' });

  const filterForm = el(
    'form',
    { className: 'filter-bar', method: 'GET' },
    createField({ name: 'fromDate', label: 'From date', type: 'date' }),
    createField({ name: 'toDate', label: 'To date', type: 'date' }),
    el('button', { type: 'submit', className: 'btn btn-primary' }, 'Filter')
  );

  filterForm.addEventListener(
    'submit',
    (e) => {
      e.preventDefault();
      const fd = new FormData(filterForm);
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
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Audit events'),
        el('p', { className: 'muted' }, 'Read-only, append-only organizational audit history.')
      )
    ),
    el('search', {}, filterForm),
    listHost
  );

  const load = async () => {
    clear(listHost);
    listHost.appendChild(createSkeleton({ rows: 5, label: 'Loading audit events…' }));
    try {
      const data = await auditApi.listAuditEvents({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
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
            title: 'No audit events match this filter',
            description: 'Adjust the date range or clear filters to review recorded operational events.',
          })
        );
        return;
      }

      listHost.appendChild(
        createDataTable({
          caption: 'Append-only audit trail',
          columns: [
            {
              key: 'occurredAtUtc',
              label: 'Timestamp',
              isRowHeader: true,
              render: (ev) => formatDateTimeUtc(ev.occurredAtUtc),
            },
            {
              key: 'actorDisplayName',
              label: 'Actor',
              render: (ev) =>
                `${ev.actorDisplayName || (ev.actorUserAccountId != null ? `Account #${ev.actorUserAccountId}` : 'System')} (${ev.actorType || 'SYSTEM'})`,
            },
            {
              key: 'action',
              label: 'Action',
              render: (ev) => createStatusBadge(ev.action),
            },
            {
              key: 'targetType',
              label: 'Target',
              render: (ev) =>
                ev.targetId != null ? `${ev.targetType} #${ev.targetId}` : ev.targetType || '—',
            },
            { key: 'reason', label: 'Reason', render: (ev) => ev.reason || '—' },
            {
              key: 'beforeReference',
              label: 'Before / After',
              render: (ev) =>
                el(
                  'div',
                  { className: 'stack-sm mono' },
                  ev.beforeReference ? el('span', {}, `Before: ${ev.beforeReference}`) : null,
                  ev.afterReference ? el('span', {}, `After: ${ev.afterReference}`) : null,
                  !ev.beforeReference && !ev.afterReference ? '—' : null
                ),
            },
            {
              key: 'correlationId',
              label: 'Correlation ID',
              render: (ev) => el('span', { className: 'mono' }, ev.correlationId || '—'),
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
        createAlert({
          variant: 'error',
          title: 'Failed to load audit events',
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
