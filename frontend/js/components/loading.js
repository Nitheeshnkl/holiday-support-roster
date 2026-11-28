import { el } from '../utils/dom.js';

export function createSkeleton({ rows = 4, label = 'Loading content…' } = {}) {
  const lines = [el('div', { className: 'skeleton-line skeleton-line--title', 'aria-hidden': 'true' })];
  for (let i = 0; i < rows; i += 1) {
    lines.push(
      el('div', {
        className: i % 2 === 1 ? 'skeleton-line skeleton-line--short' : 'skeleton-line',
        'aria-hidden': 'true',
      })
    );
  }
  return el(
    'div',
    { className: 'panel skeleton skeleton-group', 'aria-busy': 'true' },
    el('span', { className: 'visually-hidden' }, label),
    lines
  );
}

export function createSkeletonCards({ count = 2, label = 'Loading cards…' } = {}) {
  const cards = [];
  for (let i = 0; i < count; i += 1) {
    cards.push(
      el(
        'div',
        { className: 'skeleton-card col-span-6', 'aria-hidden': 'true' },
        el('div', { className: 'skeleton-line skeleton-line--title' }),
        el('div', { className: 'skeleton-line' }),
        el('div', { className: 'skeleton-line skeleton-line--short' })
      )
    );
  }
  return el(
    'div',
    { className: 'grid-12', 'aria-busy': 'true' },
    el('span', { className: 'visually-hidden' }, label),
    cards
  );
}

export function createSkeletonTable({ rows = 5, cols = 4, label = 'Loading table…' } = {}) {
  const tableRows = [];
  for (let r = 0; r < rows; r += 1) {
    const cells = [];
    for (let c = 0; c < cols; c += 1) {
      cells.push(el('div', { className: c === cols - 1 ? 'skeleton-line skeleton-line--short' : 'skeleton-line' }));
    }
    tableRows.push(el('div', { className: 'skeleton-table__row', 'aria-hidden': 'true' }, cells));
  }
  return el(
    'div',
    { className: 'skeleton-table', 'aria-busy': 'true' },
    el('span', { className: 'visually-hidden' }, label),
    tableRows
  );
}
