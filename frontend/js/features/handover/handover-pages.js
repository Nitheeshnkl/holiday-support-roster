import { el, clear, appendChildren } from '../../utils/dom.js';
import { formatDateTimeUtc } from '../../utils/date.js';
import { bindFormValidation, applyServerFieldErrors, clearServerFieldErrors } from '../../utils/validation.js';
import { formatEnumLabel } from '../../utils/format.js';
import { createField } from '../../components/form-controls.js';
import { createAlert, createEmptyState, createSkeleton, showToast } from '../../components/alert.js';
import { createDataTable } from '../../components/data-table.js';
import { createPagination } from '../../components/pagination.js';
import { createStatusBadge } from '../../components/status-badge.js';
import { hasPermission } from '../../state/session-store.js';
import * as handoverApi from '../../api/handover.js';
import { isAbortError } from '../../api/errors.js';

export async function renderHandoverListPage({ container, query, navigate, signal }) {
  const canCreate = hasPermission('HANDOVER.CREATE');
  let assignmentId = query?.get('assignmentId') || '';
  const initialSupersedes = query?.get('supersedesHandoverReportId') || '';
  let page = 0;
  let pageSize = 25;

  const listHost = el('div', { className: 'stack' });
  const formHost = el('div', { className: 'stack' });

  const filterForm = el(
    'form',
    { className: 'filter-bar', method: 'GET' },
    createField({
      name: 'assignmentId',
      label: 'Filter by assignment ID (optional)',
      type: 'number',
      min: 1,
      value: assignmentId,
    }),
    el('button', { type: 'submit', className: 'btn btn-primary' }, 'Filter')
  );

  filterForm.addEventListener(
    'submit',
    (e) => {
      e.preventDefault();
      assignmentId = String(new FormData(filterForm).get('assignmentId') || '').trim();
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
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Operational handovers'),
        el('p', { className: 'muted' }, 'Informational, immutable assignment-linked reports and linked addenda (FDR-08).')
      )
    ),
    createAlert({
      variant: 'info',
      title: 'Informational only',
      message:
        'Handover reports do not transfer assignment responsibility, manage tickets, or require receiver acknowledgement. Submitted reports are immutable; corrections create a linked addendum.',
    }),
    formHost,
    el('search', {}, filterForm),
    listHost
  );

  if (canCreate) {
    const errBox = el('div', { className: 'stack-sm' });
    const itemsContainer = el('div', { className: 'stack-sm' });
    const draftItems = [
      { itemType: 'NOTE', title: '', content: '' },
    ];

    const renderDraftItems = () => {
      clear(itemsContainer);
      draftItems.forEach((item, index) => {
        const card = el(
          'fieldset',
          { className: 'field-group' },
          el('legend', {}, `Handover item ${index + 1}`),
          el(
            'div',
            { className: 'form-grid' },
            createField({
              name: `itemType_${index}`,
              label: 'Item type',
              type: 'select',
              value: item.itemType,
              required: true,
              options: [
                { value: 'NOTE', label: 'Note' },
                { value: 'CONTACT', label: 'Contact' },
                { value: 'REFERENCE', label: 'Reference' },
                { value: 'ACTION_REQUIRED', label: 'Action required' },
              ],
              onChange: (e) => {
                draftItems[index].itemType = e.target.value;
              },
            }),
            createField({
              name: `itemTitle_${index}`,
              label: 'Item title',
              value: item.title,
              required: true,
              maxlength: 160,
              onChange: (e) => {
                draftItems[index].title = e.target.value;
              },
            }),
            createField({
              name: `itemContent_${index}`,
              label: 'Details',
              type: 'textarea',
              value: item.content,
              required: true,
              maxlength: 4000,
              rows: 2,
              fullWidth: true,
              onChange: (e) => {
                draftItems[index].content = e.target.value;
              },
            })
          ),
          draftItems.length > 1
            ? el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-ghost btn-sm',
                  onClick: () => {
                    draftItems.splice(index, 1);
                    renderDraftItems();
                  },
                },
                'Remove item'
              )
            : null
        );
        itemsContainer.appendChild(card);
      });
    };

    renderDraftItems();

    const submitBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Submit handover report');
    const createForm = el(
      'form',
      { className: 'panel stack', novalidate: true },
      el('h2', {}, initialSupersedes ? `Create corrective addendum (supersedes #${initialSupersedes})` : 'Create handover report'),
      errBox,
      el(
        'div',
        { className: 'form-grid' },
        createField({
          name: 'assignmentId',
          label: 'Assignment ID',
          type: 'number',
          min: 1,
          value: assignmentId,
          required: true,
        }),
        createField({
          name: 'supersedesHandoverReportId',
          label: 'Supersedes handover report ID (for addendum only)',
          type: 'number',
          min: 1,
          value: initialSupersedes,
        }),
        createField({
          name: 'summary',
          label: 'Operational summary',
          type: 'textarea',
          required: true,
          maxlength: 1000,
          rows: 3,
          fullWidth: true,
        })
      ),
      itemsContainer,
      el(
        'div',
        { className: 'cluster' },
        el(
          'button',
          {
            type: 'button',
            className: 'btn btn-secondary',
            onClick: () => {
              draftItems.push({ itemType: 'NOTE', title: '', content: '' });
              renderDraftItems();
            },
          },
          'Add handover item'
        ),
        submitBtn
      )
    );
    formHost.appendChild(createForm);

    bindFormValidation(createForm, {
      signal,
      onSubmitValid: async (fd) => {
        clearServerFieldErrors(createForm);
        clear(errBox);
        const supRaw = String(fd.get('supersedesHandoverReportId') || '').trim();
        const itemsPayload = draftItems.map((_, idx) => ({
          itemType: String(fd.get(`itemType_${idx}`) || 'NOTE'),
          title: String(fd.get(`itemTitle_${idx}`) || '').trim(),
          content: String(fd.get(`itemContent_${idx}`) || '').trim(),
        }));

        submitBtn.disabled = true;
        try {
          const created = await handoverApi.createHandoverReport({
            assignmentId: Number(fd.get('assignmentId')),
            supersedesHandoverReportId: supRaw ? Number(supRaw) : null,
            summary: String(fd.get('summary') || '').trim(),
            items: itemsPayload,
          });
          showToast('Handover report submitted.', { variant: 'success' });
          navigate(`/handover/${created.id}`);
        } catch (err) {
          applyServerFieldErrors(createForm, err.fieldErrors);
          errBox.appendChild(
            createAlert({ variant: 'error', title: 'Submission failed', message: err.message, correlationId: err.correlationId })
          );
        } finally {
          submitBtn.disabled = false;
        }
      },
    });
  }

  const load = async () => {
    clear(listHost);
    listHost.appendChild(createSkeleton({ rows: 4, label: 'Loading handover reports…' }));
    try {
      const data = await handoverApi.listHandoverReports({
        assignmentId: assignmentId ? Number(assignmentId) : undefined,
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
            title: 'No handover reports visible',
            description: 'No operational handover reports match your filter.',
          })
        );
        return;
      }

      listHost.appendChild(
        createDataTable({
          caption: 'Handover reports',
          columns: [
            {
              key: 'id',
              label: 'Report',
              isRowHeader: true,
              render: (h) =>
                el(
                  'a',
                  {
                    href: `/handover/${h.id}`,
                    onClick: (e) => {
                      e.preventDefault();
                      navigate(`/handover/${h.id}`);
                    },
                  },
                  `Handover #${h.id}`
                ),
            },
            { key: 'assignmentId', label: 'Assignment ID', render: (h) => `#${h.assignmentId}` },
            {
              key: 'authoredByDisplayName',
              label: 'Author',
              render: (h) => h.authoredByDisplayName || `Account #${h.authoredByUserAccountId}`,
            },
            { key: 'summary', label: 'Summary' },
            { key: 'status', label: 'Status', render: (h) => createStatusBadge(h.status) },
            { key: 'createdAtUtc', label: 'Created', render: (h) => formatDateTimeUtc(h.createdAtUtc) },
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
        createAlert({ variant: 'error', title: 'Unable to load handover reports', message: err.message, correlationId: err.correlationId })
      );
    }
  };

  await load();
}

export async function renderHandoverDetailPage({ container, params, navigate, signal }) {
  const canCreate = hasPermission('HANDOVER.CREATE');
  const host = el('div', { className: 'stack' });
  host.appendChild(createSkeleton({ rows: 5, label: 'Loading handover report…' }));
  container.appendChild(host);

  try {
    const report = await handoverApi.getHandoverReport(params.handoverId, { signal });
    if (signal?.aborted) return;
    clear(host);

    appendChildren(host, [
      el(
        'div',
        { className: 'page-header' },
        el(
          'div',
          { className: 'page-header__title-group' },
          el('h1', { id: 'main-heading', tabindex: '-1' }, `Handover report #${report.id}`),
          el(
            'div',
            { className: 'cluster' },
            createStatusBadge(report.status),
            el('span', { className: 'muted' }, `Assignment #${report.assignmentId}`),
            el(
              'span',
              { className: 'muted' },
              `Author: ${report.authoredByDisplayName || `Account #${report.authoredByUserAccountId}`}`
            )
          )
        ),
        canCreate
          ? el(
              'div',
              { className: 'page-header__actions' },
              el(
                'a',
                {
                  href: `/handover?assignmentId=${report.assignmentId}&supersedesHandoverReportId=${report.id}`,
                  className: 'btn btn-secondary',
                  onClick: (e) => {
                    e.preventDefault();
                    navigate(`/handover?assignmentId=${report.assignmentId}&supersedesHandoverReportId=${report.id}`);
                  },
                },
                'Create corrective addendum'
              )
            )
          : null
      ),
      report.supersedesHandoverReportId != null
        ? createAlert({
            variant: 'info',
            title: 'Addendum lineage',
            message: `This report is a linked correction/addendum superseding Handover #${report.supersedesHandoverReportId}.`,
            actionLabel: `View #${report.supersedesHandoverReportId}`,
            onAction: () => navigate(`/handover/${report.supersedesHandoverReportId}`),
          })
        : null,
      el(
        'section',
        { className: 'panel' },
        el('h2', {}, 'Summary'),
        el('p', {}, report.summary),
        el(
          'dl',
          { className: 'kv-grid' },
          el('div', { className: 'kv-item' }, el('dt', {}, 'Created'), el('dd', {}, formatDateTimeUtc(report.createdAtUtc))),
          el('div', { className: 'kv-item' }, el('dt', {}, 'Submitted'), el('dd', {}, formatDateTimeUtc(report.submittedAtUtc)))
        )
      ),
      el(
        'section',
        { className: 'panel' },
        el('h2', {}, 'Handover items'),
        Array.isArray(report.items) && report.items.length
          ? el(
              'div',
              { className: 'stack' },
              report.items.map((item) =>
                el(
                  'article',
                  { className: 'handover-item-card' },
                  el(
                    'div',
                    { className: 'cluster' },
                    el('span', { className: 'badge' }, formatEnumLabel(item.itemType)),
                    el('h3', {}, item.title)
                  ),
                  el('p', {}, item.content)
                )
              )
            )
          : el('p', { className: 'muted' }, 'No structured items recorded.')
      )
    ]);
  } catch (err) {
    if (isAbortError(err)) return;
    clear(host);
    host.append(
      el('h1', { id: 'main-heading', tabindex: '-1' }, 'Handover unavailable'),
      createAlert({ variant: 'error', title: 'Unable to load handover', message: err.message, correlationId: err.correlationId })
    );
  }
}
