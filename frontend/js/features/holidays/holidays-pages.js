import { el, clear } from '../../utils/dom.js';
import { formatIsoDate, formatDateTimeUtc, formatMonthHeading, toDateTimeLocalValue, fromDateTimeLocalValue } from '../../utils/date.js';
import { bindFormValidation, applyServerFieldErrors, clearServerFieldErrors } from '../../utils/validation.js';
import { createField } from '../../components/form-controls.js';
import { createAlert, createEmptyState, createSkeleton, showToast } from '../../components/alert.js';
import { createDataTable } from '../../components/data-table.js';
import { createPagination } from '../../components/pagination.js';
import { createStatusBadge } from '../../components/status-badge.js';
import { hasPermission } from '../../state/session-store.js';
import { resolveIfMatch } from '../../api/client.js';
import * as holidaysApi from '../../api/holidays.js';
import { isAbortError } from '../../api/errors.js';

export async function renderHolidaysPage({ container, navigate, signal }) {
  let fromDate = '';
  let toDate = '';
  let page = 0;
  let pageSize = 25;
  let viewMode = 'list';

  const canManage = hasPermission('CALENDAR.MANAGE');
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

  const listBtn = el('button', { type: 'button', role: 'tab', className: 'tab-btn', 'aria-selected': 'true' }, 'List view');
  const calBtn = el('button', { type: 'button', role: 'tab', className: 'tab-btn', 'aria-selected': 'false' }, 'Month schedule');

  listBtn.addEventListener('click', () => {
    viewMode = 'list';
    listBtn.setAttribute('aria-selected', 'true');
    calBtn.setAttribute('aria-selected', 'false');
    load();
  });
  calBtn.addEventListener('click', () => {
    viewMode = 'calendar';
    calBtn.setAttribute('aria-selected', 'true');
    listBtn.setAttribute('aria-selected', 'false');
    load();
  });

  container.append(
    el(
      'div',
      { className: 'page-header' },
      el(
        'div',
        { className: 'page-header__title-group' },
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Holidays'),
        el('p', { className: 'muted' }, 'Date-ordered holiday calendar and explicit per-holiday Primary and Standby staffing counts.')
      ),
      canManage
        ? el(
            'div',
            { className: 'page-header__actions' },
            el(
              'a',
              {
                href: '/holidays/new',
                className: 'btn btn-primary',
                onClick: (e) => {
                  e.preventDefault();
                  navigate('/holidays/new');
                },
              },
              'Configure holiday'
            )
          )
        : null
    ),
    el('search', {}, filterForm),
    el('div', { className: 'tablist', role: 'tablist', 'aria-label': 'Holiday view mode' }, listBtn, calBtn),
    listHost
  );

  let latestData = null;

  const renderData = (data) => {
    clear(listHost);
    const items = [...(data?.items || [])].sort((a, b) =>
      String(a.holidayDate).localeCompare(String(b.holidayDate))
    );

    if (!items.length) {
      listHost.appendChild(
        createEmptyState({
          title: 'No holidays in this date range',
          description: canManage
            ? 'Configure a holiday with explicit Primary (>=1) and Standby (>=0) counts before generating a roster.'
            : 'No holidays match your current filter.',
          actionLabel: canManage ? 'Configure holiday' : '',
          actionHref: canManage ? '/holidays/new' : '',
          onAction: canManage ? () => navigate('/holidays/new') : null,
        })
      );
      return;
    }

    if (viewMode === 'calendar') {
      const grouped = new Map();
      for (const h of items) {
        const heading = formatMonthHeading(h.holidayDate);
        if (!grouped.has(heading)) grouped.set(heading, []);
        grouped.get(heading).push(h);
      }

      for (const [monthLabel, monthItems] of grouped.entries()) {
        listHost.appendChild(
          el(
            'section',
            { className: 'month-group', 'aria-label': monthLabel },
            el('h2', {}, monthLabel),
            el(
              'div',
              { className: 'month-group__grid' },
              monthItems.map((h) =>
                el(
                  'article',
                  { className: 'holiday-card' },
                  el('span', { className: 'muted' }, formatIsoDate(h.holidayDate)),
                  el(
                    'h3',
                    {},
                    el(
                      'a',
                      {
                        href: `/holidays/${h.id}`,
                        onClick: (e) => {
                          e.preventDefault();
                          navigate(`/holidays/${h.id}`);
                        },
                      },
                      h.name
                    )
                  ),
                  el('div', { className: 'cluster' }, createStatusBadge(h.status || 'ACTIVE')),
                  el('p', { className: 'muted' }, `Primary required: ${h.primaryCount} · Standby required: ${h.standbyCount}`)
                )
              )
            )
          )
        );
      }
    } else {
      listHost.appendChild(
        createDataTable({
          caption: 'Configured holidays',
          columns: [
            {
              key: 'name',
              label: 'Holiday',
              isRowHeader: true,
              render: (h) =>
                el(
                  'a',
                  {
                    href: `/holidays/${h.id}`,
                    onClick: (e) => {
                      e.preventDefault();
                      navigate(`/holidays/${h.id}`);
                    },
                  },
                  h.name
                ),
            },
            { key: 'holidayDate', label: 'Date', render: (h) => formatIsoDate(h.holidayDate) },
            { key: 'primaryCount', label: 'Primary count' },
            { key: 'standbyCount', label: 'Standby count' },
            {
              key: 'dutyWindowStart',
              label: 'Duty window (UTC)',
              render: (h) =>
                h.dutyWindowStart || h.dutyWindowEnd
                  ? `${formatDateTimeUtc(h.dutyWindowStart)} – ${formatDateTimeUtc(h.dutyWindowEnd)}`
                  : 'Default full day',
            },
            { key: 'status', label: 'Status', render: (h) => createStatusBadge(h.status || 'ACTIVE') },
            {
              key: 'actions',
              label: 'Actions',
              render: (h) =>
                el(
                  'a',
                  {
                    href: `/holidays/${h.id}`,
                    className: 'btn btn-secondary btn-sm',
                    onClick: (e) => {
                      e.preventDefault();
                      navigate(`/holidays/${h.id}`);
                    },
                  },
                  canManage ? 'Inspect / Edit' : 'Inspect'
                ),
            },
          ],
          rows: items,
        })
      );
    }

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
  };

  const load = async () => {
    if (latestData && viewMode) {
      // If toggling view mode without filter/page change, reuse unless stale
    }
    clear(listHost);
    listHost.appendChild(createSkeleton({ rows: 5, label: 'Loading holidays…' }));
    try {
      const data = await holidaysApi.listHolidays({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        pageSize,
        signal,
      });
      if (signal?.aborted) return;
      latestData = data;
      renderData(data);
    } catch (err) {
      if (isAbortError(err)) return;
      clear(listHost);
      listHost.appendChild(
        createAlert({
          variant: 'error',
          title: 'Failed to load holidays',
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

export async function renderHolidayDetailPage({ container, params, navigate, signal }) {
  const isNew = !params?.holidayId;
  const canManage = hasPermission('CALENDAR.MANAGE');
  const host = el('div', { className: 'stack' });
  container.appendChild(host);

  let existing = null;
  if (!isNew) {
    host.appendChild(createSkeleton({ rows: 4, label: 'Loading holiday…' }));
    try {
      const list = await holidaysApi.listHolidays({ page: 0, pageSize: 100, signal });
      if (signal?.aborted) return;
      existing = (list?.items || []).find((h) => String(h.id) === String(params.holidayId));
      clear(host);
      if (!existing) {
        host.append(
          el('h1', { id: 'main-heading', tabindex: '-1' }, 'Holiday unavailable'),
          createAlert({
            variant: 'warning',
            title: 'Holiday not found in current page',
            message: 'The holiday could not be located or is not visible.',
          })
        );
        return;
      }
    } catch (err) {
      if (isAbortError(err)) return;
      clear(host);
      host.append(
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Holiday unavailable'),
        createAlert({ variant: 'error', title: 'Load failed', message: err.message, correlationId: err.correlationId })
      );
      return;
    }
  }

  const header = el(
    'div',
    { className: 'page-header' },
    el(
      'div',
      { className: 'page-header__title-group' },
      el(
        'h1',
        { id: 'main-heading', tabindex: '-1' },
        isNew ? 'Configure new holiday' : existing.name
      ),
      existing ? el('div', { className: 'cluster' }, createStatusBadge(existing.status || 'ACTIVE')) : null
    )
  );

  const policyAlert = createAlert({
    variant: 'info',
    title: 'Explicit staffing & post-publication rule (FDR-04 / FDR-10)',
    message:
      'Primary count (>= 1) and Standby count (>= 0) must be explicitly specified with no hardcoded defaults. Direct edits apply only before a published roster references this holiday; after publication, date, staffing, or cancellation changes require a reasoned Roster Revision.',
  });

  if (!canManage && !isNew) {
    host.append(
      header,
      policyAlert,
      el(
        'section',
        { className: 'panel' },
        el(
          'dl',
          { className: 'kv-grid' },
          el('div', { className: 'kv-item' }, el('dt', {}, 'Date'), el('dd', {}, formatIsoDate(existing.holidayDate))),
          el('div', { className: 'kv-item' }, el('dt', {}, 'Primary required'), el('dd', {}, String(existing.primaryCount))),
          el('div', { className: 'kv-item' }, el('dt', {}, 'Standby required'), el('dd', {}, String(existing.standbyCount))),
          el('div', { className: 'kv-item' }, el('dt', {}, 'Duty window start'), el('dd', {}, formatDateTimeUtc(existing.dutyWindowStart))),
          el('div', { className: 'kv-item' }, el('dt', {}, 'Duty window end'), el('dd', {}, formatDateTimeUtc(existing.dutyWindowEnd)))
        )
      )
    );
    return;
  }

  const errorBox = el('div', { className: 'stack-sm' });
  const submitBtn = el(
    'button',
    { type: 'submit', className: 'btn btn-primary' },
    isNew ? 'Create holiday' : 'Save pre-publication changes'
  );

  // IMPORTANT (FDR-04): Do NOT set default values for primaryCount / standbyCount on creation
  const form = el(
    'form',
    { className: 'panel stack', novalidate: true },
    errorBox,
    el(
      'div',
      { className: 'form-grid' },
      createField({
        name: 'name',
        label: 'Holiday name',
        value: existing?.name || '',
        required: true,
        maxlength: 160,
      }),
      createField({
        name: 'holidayDate',
        label: 'Holiday date',
        type: 'date',
        value: existing?.holidayDate || '',
        required: true,
      })
    ),
    el(
      'fieldset',
      { className: 'field-group' },
      el('legend', {}, 'Explicit staffing counts'),
      el(
        'div',
        { className: 'form-grid' },
        createField({
          name: 'primaryCount',
          label: 'Primary count',
          type: 'number',
          min: 1,
          step: 1,
          value: existing?.primaryCount != null ? String(existing.primaryCount) : '',
          required: true,
          hint: 'Required >= 1. No default is inferred.',
        }),
        createField({
          name: 'standbyCount',
          label: 'Standby count',
          type: 'number',
          min: 0,
          step: 1,
          value: existing?.standbyCount != null ? String(existing.standbyCount) : '',
          required: true,
          hint: 'Explicit count >= 0 (enter 0 if no backup standby is needed).',
        })
      )
    ),
    el(
      'fieldset',
      { className: 'field-group' },
      el('legend', {}, 'Optional duty window (UTC)'),
      el(
        'div',
        { className: 'form-grid' },
        createField({
          name: 'dutyWindowStart',
          label: 'Duty window start (UTC)',
          type: 'datetime-local',
          value: toDateTimeLocalValue(existing?.dutyWindowStart),
        }),
        createField({
          name: 'dutyWindowEnd',
          label: 'Duty window end (UTC)',
          type: 'datetime-local',
          value: toDateTimeLocalValue(existing?.dutyWindowEnd),
        })
      )
    ),
    el(
      'div',
      { className: 'cluster' },
      submitBtn,
      el(
        'a',
        {
          href: '/holidays',
          className: 'btn btn-secondary',
          onClick: (e) => {
            e.preventDefault();
            navigate('/holidays');
          },
        },
        'Back to holidays'
      ),
      !isNew
        ? el(
            'a',
            {
              href: '/roster',
              className: 'btn btn-ghost',
              onClick: (e) => {
                e.preventDefault();
                navigate('/roster');
              },
            },
            'Post-publish changes via Roster Revision'
          )
        : null
    )
  );

  host.append(header, policyAlert, form);

  bindFormValidation(form, {
    signal,
    customValidators: {
      dutyWindowEnd: (val, f) => {
        const start = f.elements.namedItem('dutyWindowStart').value;
        if (!val || !start) return '';
        return val <= start ? 'Duty window end must be after start.' : '';
      },
    },
    onSubmitValid: async (fd) => {
      clearServerFieldErrors(form);
      clear(errorBox);
      const payload = {
        name: String(fd.get('name') || '').trim(),
        holidayDate: String(fd.get('holidayDate') || ''),
        primaryCount: Number(fd.get('primaryCount')),
        standbyCount: Number(fd.get('standbyCount')),
        dutyWindowStart: fromDateTimeLocalValue(fd.get('dutyWindowStart')),
        dutyWindowEnd: fromDateTimeLocalValue(fd.get('dutyWindowEnd')),
      };

      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving…';
      try {
        const saved = isNew
          ? await holidaysApi.createHoliday(payload)
          : await holidaysApi.updateHoliday(existing.id, payload, resolveIfMatch(existing));
        showToast(isNew ? 'Holiday created.' : 'Holiday updated.', { variant: 'success' });
        navigate(`/holidays/${saved.id}`);
      } catch (err) {
        applyServerFieldErrors(form, err.fieldErrors);
        errorBox.appendChild(
          createAlert({
            variant: 'error',
            title:
              err.status === 409
                ? 'Holiday cannot be directly edited (conflict or published reference)'
                : 'Holiday validation failed',
            message: err.message,
            correlationId: err.correlationId,
            actionLabel: err.status === 409 ? 'Reload' : '',
            onAction: err.status === 409 ? () => navigate(`/holidays/${existing.id}`) : null,
          })
        );
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isNew ? 'Create holiday' : 'Save pre-publication changes';
      }
    },
  });
}
