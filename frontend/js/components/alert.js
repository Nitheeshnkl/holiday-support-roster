import { el, svgIcon, announceStatus } from '../utils/dom.js';
import { createSkeleton } from './loading.js';

export { createSkeleton };

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

export function createEmptyState({
  title,
  description,
  icon = 'info',
  actionLabel = '',
  actionHref = '',
  onAction = null,
  secondaryActionLabel = '',
  secondaryActionHref = '',
  onSecondaryAction = null,
} = {}) {
  const actions = [];
  if (actionLabel && actionHref && typeof onAction === 'function') {
    actions.push(
      el(
        'a',
        {
          href: actionHref,
          className: 'btn btn-primary',
          onClick: (e) => {
            e.preventDefault();
            onAction();
          },
        },
        actionLabel
      )
    );
  } else if (actionLabel && actionHref) {
    actions.push(el('a', { href: actionHref, className: 'btn btn-primary' }, actionLabel));
  } else if (actionLabel && typeof onAction === 'function') {
    actions.push(
      el(
        'button',
        { type: 'button', className: 'btn btn-primary', onClick: onAction },
        actionLabel
      )
    );
  }

  if (secondaryActionLabel && secondaryActionHref && typeof onSecondaryAction === 'function') {
    actions.push(
      el(
        'a',
        {
          href: secondaryActionHref,
          className: 'btn btn-secondary',
          onClick: (e) => {
            e.preventDefault();
            onSecondaryAction();
          },
        },
        secondaryActionLabel
      )
    );
  } else if (secondaryActionLabel && typeof onSecondaryAction === 'function') {
    actions.push(
      el(
        'button',
        { type: 'button', className: 'btn btn-secondary', onClick: onSecondaryAction },
        secondaryActionLabel
      )
    );
  }

  return el(
    'div',
    { className: 'empty-state' },
    icon ? el('div', { className: 'empty-state__icon', 'aria-hidden': 'true' }, svgIcon(icon, { size: 20 })) : null,
    el('h2', {}, title),
    description ? el('p', { className: 'muted' }, description) : null,
    actions.length ? el('div', { className: 'empty-state__actions' }, actions) : null
  );
}

export function showToast(message, { variant = 'info', durationMs = 5000 } = {}) {
  const region = document.getElementById('toast-region');
  if (!region) return;

  // Do not interrupt when a modal dialog is open; still announce politely
  const openModalEl = document.querySelector('dialog[open]');
  if (openModalEl) {
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

  const iconName = variant === 'success' ? 'check' : variant === 'error' ? 'alert' : 'info';

  const toast = el(
    'div',
    { className: `toast toast--${variant}`, role: 'status' },
    el('div', { className: 'toast__content' }, svgIcon(iconName, { size: 18 }), el('span', {}, message)),
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
