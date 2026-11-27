import { el, svgIcon, announceStatus } from '../utils/dom.js';

export function createAlert({
  variant = 'info',
  title = '',
  message = '',
  correlationId = null,
  actionLabel = '',
  onAction = null,
  role = undefined,
} = {}) {
  const effectiveRole = role ?? (variant === 'error' ? 'alert' : undefined);
  const iconName =
    variant === 'error'
      ? 'alert'
      : variant === 'success'
        ? 'check'
        : variant === 'warning' || variant === 'draft'
          ? 'alert'
          : 'info';

  const bodyChildren = [];
  if (title) {
    bodyChildren.push(el('div', { className: 'alert__title' }, title));
  }
  if (message) {
    bodyChildren.push(el('p', {}, message));
  }
  if (correlationId) {
    bodyChildren.push(
      el('p', { className: 'muted mono' }, `Reference ID: ${correlationId}`)
    );
  }
  if (actionLabel && typeof onAction === 'function') {
    bodyChildren.push(
      el(
        'div',
        { className: 'cluster' },
        el(
          'button',
          {
            type: 'button',
            className: 'btn btn-secondary btn-sm',
            onClick: onAction,
          },
          actionLabel
        )
      )
    );
  }

  return el(
    'div',
    {
      className: `alert alert--${variant}`,
      role: effectiveRole,
    },
    svgIcon(iconName, { size: 20 }),
    el('div', { className: 'alert__body' }, bodyChildren)
  );
}

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
    { className: 'panel skeleton-group', 'aria-busy': 'true' },
    el('span', { className: 'visually-hidden' }, label),
    lines
  );
}

export function createEmptyState({
  title,
  description,
  actionLabel = '',
  actionHref = '',
  onAction = null,
} = {}) {
  let actionNode = null;
  if (actionLabel && actionHref) {
    actionNode = el('a', { href: actionHref, className: 'btn btn-primary' }, actionLabel);
  } else if (actionLabel && typeof onAction === 'function') {
    actionNode = el(
      'button',
      { type: 'button', className: 'btn btn-primary', onClick: onAction },
      actionLabel
    );
  }

  return el(
    'div',
    { className: 'empty-state' },
    el('h2', {}, title),
    description ? el('p', { className: 'muted' }, description) : null,
    actionNode
  );
}

export function showToast(message, { variant = 'info', durationMs = 5000 } = {}) {
  const region = document.getElementById('toast-region');
  if (!region) return;

  // Do not interrupt when a modal dialog is open; still announce politely
  const openModal = document.querySelector('dialog[open]');
  if (openModal) {
    announceStatus(message);
    return;
  }

  let timerId = null;
  const closeToast = () => {
    if (timerId) window.clearTimeout(timerId);
    toast.remove();
  };

  const closeBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-ghost btn-sm',
      'aria-label': 'Dismiss notification',
      onClick: closeToast,
    },
    svgIcon('close', { size: 16 })
  );

  const toast = el(
    'div',
    { className: `toast toast--${variant}`, role: 'status' },
    el('span', {}, message),
    closeBtn
  );

  region.appendChild(toast);
  announceStatus(message);

  if (durationMs > 0) {
    const scheduleClose = () => {
      timerId = window.setTimeout(() => {
        if (toast.contains(document.activeElement)) {
          scheduleClose();
          return;
        }
        toast.remove();
      }, durationMs);
    };
    scheduleClose();
  }
}
