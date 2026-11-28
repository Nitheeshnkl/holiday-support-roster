import { el } from '../utils/dom.js';
import { formatPageSummary } from '../utils/format.js';

export function createPagination({ page, onPageChange, onPageSizeChange } = {}) {
  if (!page) return null;
  const pageNumber = Number(page.number ?? 0);
  const pageSize = Number(page.size ?? 25);
  const totalPages = Math.max(1, Number(page.totalPages ?? 1));
  const totalElements = Number(page.totalElements ?? 0);

  const sizeSelect =
    typeof onPageSizeChange === 'function'
      ? el(
          'label',
          { className: 'cluster' },
          el('span', { className: 'muted' }, 'Page size'),
          el(
            'select',
            {
              className: 'field__select pagination__select',
              'aria-label': 'Items per page',
              onChange: (e) => onPageSizeChange(Number(e.target.value)),
            },
            [10, 25, 50, 100].map((size) => {
              const opt = el('option', { value: size }, String(size));
              if (size === pageSize) opt.selected = true;
              return opt;
            })
          )
        )
      : null;

  const prevBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-secondary btn-sm',
      disabled: pageNumber <= 0,
      onClick: () => onPageChange(pageNumber - 1),
    },
    'Previous'
  );

  const nextBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-secondary btn-sm',
      disabled: pageNumber + 1 >= totalPages || totalElements === 0,
      onClick: () => onPageChange(pageNumber + 1),
    },
    'Next'
  );

  return el(
    'nav',
    { className: 'pagination', 'aria-label': 'Pagination' },
    el('span', { className: 'muted' }, formatPageSummary(page)),
    el(
      'div',
      { className: 'pagination__controls' },
      sizeSelect,
      prevBtn,
      el('span', { className: 'muted' }, `Page ${pageNumber + 1} of ${totalPages}`),
      nextBtn
    )
  );
}
