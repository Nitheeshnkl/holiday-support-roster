import { el, clear } from '../../utils/dom.js';
import { formatIsoDate } from '../../utils/date.js';
import { bindFormValidation, applyServerFieldErrors, clearServerFieldErrors, validateDateRange } from '../../utils/validation.js';
import { createField } from '../../components/form-controls.js';
import { createAlert, createEmptyState, createSkeleton, showToast } from '../../components/alert.js';
import { createDataTable } from '../../components/data-table.js';
import { createPagination } from '../../components/pagination.js';
import { createStatusBadge } from '../../components/status-badge.js';
import { confirmDialog } from '../../components/dialog.js';
import { hasAnyPermission } from '../../state/session-store.js';
import { resolveIfMatch } from '../../api/client.js';
import * as availabilityApi from '../../api/availability.js';
import { isAbortError } from '../../api/errors.js';

export async function renderAvailabilityPage({ container, navigate, signal }) {
  const canReadOthers = hasAnyPermission(['AVAILABILITY.READ', 'AVAILABILITY.MANAGE_ON_BEHALF']);
  const canSubmit = hasAnyPermission(['AVAILABILITY.MANAGE_OWN', 'AVAILABILITY.MANAGE_ON_BEHALF']);

  let filterEmployeeId = '';
  let fromDate = '';
  let toDate = '';
  let page = 0;
  let pageSize = 25;

  const listHost = el('div', { className: 'stack' });
  const formHost = el('div', { className: 'stack' });

  const filterForm = el(
    'form',
    { className: 'filter-bar', method: 'GET' },
    canReadOthers
      ? createField({ name: 'employeeId', label: 'Employee ID (optional)', type: 'number', min: 1 })
      : null,
    createField({ name: 'fromDate', label: 'From date', type: 'date' }),
    createField({ name: 'toDate', label: 'To date', type: 'date' }),
    el('button', { type: 'submit', className: 'btn btn-primary' }, 'Filter')
  );

  filterForm.addEventListener(
    'submit',
    (e) => {
      e.preventDefault();
      const fd = new FormData(filterForm);
      filterEmployeeId = String(fd.get('employeeId') || '').trim();
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
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'My availability'),
        el('p', { className: 'muted' }, 'Declare availability or unavailability for upcoming holiday dates.')
      ),
      el(
        'div',
        { className: 'page-header__actions' },
        el(
          'a',
          {
            href: '/replacements/new',
            className: 'btn btn-secondary',
            onClick: (e) => {
              e.preventDefault();
              navigate('/replacements/new');
            },
          },
          'Report published assignment unavailability'
        )
      )
    ),
    createAlert({
      variant: 'info',
      title: 'Immediate effect on future planning (FDR-05)',
      message:
        'Availability submissions take effect immediately for future roster generation and draft validation without an approval queue. They never change an existing published assignment; if you already hold a published assignment, submit an assignment-specific replacement request instead.',
    }),
    formHost,
    el('search', {}, filterForm),
    listHost
  );

  if (canSubmit) {
    const errBox = el('div', { className: 'stack-sm' });
    const submitBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Submit availability');
    const createForm = el(
      'form',
      { className: 'panel stack', novalidate: true },
      el('h2', {}, 'Submit availability or unavailability'),
      errBox,
      el(
        'div',
        { className: 'form-grid' },
        createField({
          name: 'availabilityType',
          label: 'Declaration type',
          type: 'select',
          required: true,
          value: 'UNAVAILABLE',
          options: [
            { value: 'UNAVAILABLE', label: 'Unavailable' },
            { value: 'AVAILABLE', label: 'Available' },
          ],
        }),
        createField({ name: 'reasonCode', label: 'Reason code (optional)', maxlength: 40 }),
        createField({ name: 'startDate', label: 'Start date', type: 'date', required: true }),
        createField({ name: 'endDate', label: 'End date', type: 'date', required: true }),
        createField({ name: 'note', label: 'Note (optional)', type: 'textarea', maxlength: 500, rows: 2, fullWidth: true })
      ),
      el('div', { className: 'cluster' }, submitBtn)
    );
    formHost.appendChild(createForm);

    bindFormValidation(createForm, {
      signal,
      customValidators: {
        endDate: (val, f) => {
          const err = validateDateRange(f.elements.namedItem('startDate').value, val);
          return err ? err.message : '';
        },
      },
      onSubmitValid: async (fd) => {
        clearServerFieldErrors(createForm);
        clear(errBox);
        submitBtn.disabled = true;
        try {
          await availabilityApi.createAvailability({
            availabilityType: String(fd.get('availabilityType')),
            startDate: String(fd.get('startDate')),
            endDate: String(fd.get('endDate')),
            reasonCode: String(fd.get('reasonCode') || '').trim() || null,
            note: String(fd.get('note') || '').trim() || null,
          });
          createForm.reset();
          showToast('Availability recorded and effective immediately.', { variant: 'success' });
          await load();
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
    listHost.appendChild(createSkeleton({ rows: 4, label: 'Loading availability records…' }));
    try {
      const data = await availabilityApi.listAvailability({
        employeeId: filterEmployeeId ? Number(filterEmployeeId) : undefined,
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
            title: 'No availability records found',
            description: 'Submit a declaration above or widen your date range filter.',
          })
        );
        return;
      }

      listHost.appendChild(
        createDataTable({
          caption: 'Availability declarations and history',
          columns: [
            {
              key: 'availabilityType',
              label: 'Declaration',
              isRowHeader: true,
              render: (r) => createStatusBadge(r.availabilityType),
            },
            {
              key: 'startDate',
              label: 'Date range',
              render: (r) => `${formatIsoDate(r.startDate)} – ${formatIsoDate(r.endDate)}`,
            },
            { key: 'employeeId', label: 'Employee ID', render: (r) => `#${r.employeeId}` },
            { key: 'reasonCode', label: 'Reason code', render: (r) => r.reasonCode || '—' },
            { key: 'note', label: 'Note', render: (r) => r.note || '—' },
            { key: 'status', label: 'Record state', render: (r) => createStatusBadge(r.status) },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) =>
                el(
                  'a',
                  {
                    href: `/availability/${r.id}`,
                    className: 'btn btn-secondary btn-sm',
                    onClick: (e) => {
                      e.preventDefault();
                      navigate(`/availability/${r.id}`);
                    },
                  },
                  'Manage'
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
        createAlert({
          variant: 'error',
          title: 'Failed to load availability',
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

export async function renderAvailabilityDetailPage({ container, params, navigate, signal }) {
  const host = el('div', { className: 'stack' });
  host.appendChild(createSkeleton({ rows: 4, label: 'Loading availability record…' }));
  container.appendChild(host);

  const load = async () => {
    try {
      const list = await availabilityApi.listAvailability({ page: 0, pageSize: 100, signal });
      if (signal?.aborted) return;
      const record = (list?.items || []).find(
        (item) => String(item.id) === String(params.availabilityId)
      );
      clear(host);

      if (!record) {
        host.append(
          el('h1', { id: 'main-heading', tabindex: '-1' }, 'Availability record unavailable'),
          createAlert({
            variant: 'warning',
            title: 'Record not found',
            message: 'This availability record was not found in your scoped list.',
          })
        );
        return;
      }

      const errorBox = el('div', { className: 'stack-sm' });
      const isEditable = record.status === 'ACTIVE';

      const form = el(
        'form',
        { className: 'panel stack', novalidate: true },
        el('h2', {}, 'Update declaration'),
        errorBox,
        el(
          'div',
          { className: 'form-grid' },
          createField({
            name: 'availabilityType',
            label: 'Declaration type',
            type: 'select',
            value: record.availabilityType,
            required: true,
            disabled: !isEditable,
            options: [
              { value: 'UNAVAILABLE', label: 'Unavailable' },
              { value: 'AVAILABLE', label: 'Available' },
            ],
          }),
          createField({
            name: 'reasonCode',
            label: 'Reason code',
            value: record.reasonCode || '',
            maxlength: 40,
            disabled: !isEditable,
          }),
          createField({
            name: 'startDate',
            label: 'Start date',
            type: 'date',
            value: record.startDate,
            required: true,
            disabled: !isEditable,
          }),
          createField({
            name: 'endDate',
            label: 'End date',
            type: 'date',
            value: record.endDate,
            required: true,
            disabled: !isEditable,
          }),
          createField({
            name: 'note',
            label: 'Note',
            type: 'textarea',
            value: record.note || '',
            maxlength: 500,
            rows: 3,
            disabled: !isEditable,
            fullWidth: true,
          })
        ),
        el(
          'div',
          { className: 'cluster' },
          isEditable
            ? el('button', { type: 'submit', className: 'btn btn-primary' }, 'Save update')
            : null,
          isEditable
            ? el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-danger',
                  onClick: async () => {
                    const confirmed = await confirmDialog({
                      title: 'Withdraw availability declaration?',
                      message:
                        'Withdrawal restores prospective availability for future generation/draft validation only. Any existing published assignment remains unchanged unless replaced via a Manager-approved replacement request.',
                      confirmLabel: 'Withdraw declaration',
                      confirmVariant: 'danger',
                    });
                    if (!confirmed) return;
                    clear(errorBox);
                    try {
                      await availabilityApi.withdrawAvailability(
                        record.id,
                        resolveIfMatch(record)
                      );
                      showToast('Availability declaration withdrawn.', { variant: 'success' });
                      navigate('/availability');
                    } catch (err) {
                      errorBox.appendChild(
                        createAlert({
                          variant: 'error',
                          title: err.status === 409 ? 'Stale availability record' : 'Withdrawal failed',
                          message: err.message,
                          correlationId: err.correlationId,
                          actionLabel: err.status === 409 ? 'Reload' : '',
                          onAction: err.status === 409 ? load : null,
                        })
                      );
                    }
                  },
                },
                'Withdraw declaration'
              )
            : null,
          el(
            'a',
            {
              href: '/availability',
              className: 'btn btn-secondary',
              onClick: (e) => {
                e.preventDefault();
                navigate('/availability');
              },
            },
            'Back to availability'
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
            el('h1', { id: 'main-heading', tabindex: '-1' }, `Availability #${record.id}`),
            el(
              'div',
              { className: 'cluster' },
              createStatusBadge(record.availabilityType),
              createStatusBadge(record.status)
            )
          )
        ),
        createAlert({
          variant: 'info',
          title: 'Published assignments are protected',
          message:
            'Updating or withdrawing this record invalidates stale drafts and affects future generation/validation, never an already published assignment. If you have a conflict on a published holiday, submit a replacement request.',
          actionLabel: 'Report assignment unavailability',
          onAction: () => navigate('/replacements/new'),
        }),
        form
      );

      if (isEditable) {
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
            clear(errorBox);
            try {
              await availabilityApi.updateAvailability(
                record.id,
                {
                  availabilityType: String(fd.get('availabilityType')),
                  startDate: String(fd.get('startDate')),
                  endDate: String(fd.get('endDate')),
                  reasonCode: String(fd.get('reasonCode') || '').trim() || null,
                  note: String(fd.get('note') || '').trim() || null,
                },
                resolveIfMatch(record)
              );
              showToast('Availability updated.', { variant: 'success' });
              await load();
            } catch (err) {
              applyServerFieldErrors(form, err.fieldErrors);
              errorBox.appendChild(
                createAlert({
                  variant: 'error',
                  title: err.status === 409 ? 'Stale availability record' : 'Update failed',
                  message: err.message,
                  correlationId: err.correlationId,
                  actionLabel: err.status === 409 ? 'Reload' : '',
                  onAction: err.status === 409 ? load : null,
                })
              );
            }
          },
        });
      }
    } catch (err) {
      if (isAbortError(err)) return;
      clear(host);
      host.append(
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Availability unavailable'),
        createAlert({ variant: 'error', title: 'Load failed', message: err.message, correlationId: err.correlationId })
      );
    }
  };

  await load();
}
