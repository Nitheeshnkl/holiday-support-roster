import { el } from '../utils/dom.js';

let tableSeq = 0;

/**
 * Render an accessible responsive data table that collapses into labeled cards
 * inside narrow containers via @container (width < 40rem).
 */
export function createDataTable({
  caption,
  columns = [],
  rows = [],
  emptyNode = null,
  rowClassName = null,
} = {}) {
  if (!rows.length && emptyNode) {
    return emptyNode;
  }

  tableSeq += 1;
  const captionId = `table-caption-${tableSeq}`;

  const headerRow = el(
    'tr',
    {},
    columns.map((col) => el('th', { scope: 'col' }, col.label))
  );

  const bodyRows = rows.map((row, rowIndex) => {
    const cells = columns.map((col, colIndex) => {
      const content =
        typeof col.render === 'function' ? col.render(row, rowIndex) : row?.[col.key] ?? '—';
      if (col.isRowHeader || (colIndex === 0 && !columns.some((c) => c.isRowHeader))) {
        return el('th', { scope: 'row', dataset: { label: col.label } }, content);
      }
      return el('td', { dataset: { label: col.label } }, content);
    });
    const extraClass = typeof rowClassName === 'function' ? rowClassName(row) : '';
    return el('tr', { className: extraClass || undefined }, cells);
  });

  return el(
    'div',
    {
      className: 'table-wrapper',
      tabindex: '0',
      role: 'region',
      'aria-labelledby': captionId,
    },
    el(
      'table',
      { className: 'data-table' },
      el('caption', { id: captionId }, caption),
      el('thead', {}, headerRow),
      el('tbody', {}, bodyRows)
    )
  );
}
