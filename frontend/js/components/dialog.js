import { el, svgIcon } from '../utils/dom.js';

let dialogSeq = 0;

/**
 * Open a native modal <dialog> for consequential confirmations.
 * Relies on browser top-layer modality, Esc handling, inert background, and focus restoration.
 */
export function confirmDialog({
  title,
  message = '',
  detailsNode = null,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  focusCancel = true,
} = {}) {
  dialogSeq += 1;
  const titleId = `confirm-dialog-title-${dialogSeq}`;

  return new Promise((resolve) => {
    const cancelBtn = el(
      'button',
      {
        type: 'submit',
        value: 'cancel',
        className: 'btn btn-secondary',
      },
      cancelLabel
    );
    if (focusCancel) cancelBtn.setAttribute('autofocus', '');

    const confirmBtn = el(
      'button',
      {
        type: 'submit',
        value: 'confirm',
        className: `btn btn-${confirmVariant === 'danger' ? 'danger' : 'primary'}`,
      },
      confirmLabel
    );
    if (!focusCancel) confirmBtn.setAttribute('autofocus', '');

    const dialog = el(
      'dialog',
      {
        className: 'app-dialog',
        'aria-labelledby': titleId,
      },
      el(
        'div',
        { className: 'app-dialog__inner' },
        el(
          'div',
          { className: 'app-dialog__header' },
          el('h2', { id: titleId, className: 'app-dialog__title' }, title)
        ),
        message ? el('p', {}, message) : null,
        detailsNode || null,
        el(
          'form',
          { method: 'dialog', className: 'app-dialog__footer' },
          cancelBtn,
          confirmBtn
        )
      )
    );

    dialog.addEventListener('close', () => {
      const confirmed = dialog.returnValue === 'confirm';
      dialog.returnValue = '';
      dialog.remove();
      resolve(confirmed);
    });

    document.body.appendChild(dialog);
    dialog.showModal();
  });
}

/**
 * Open a native modal <dialog> hosting custom content or workflows (e.g., onboarding guide).
 */
export function openModal({
  title,
  bodyNode,
  mobileSheet = true,
  closeLabel = 'Close',
  onClose = null,
} = {}) {
  dialogSeq += 1;
  const titleId = `modal-dialog-title-${dialogSeq}`;

  const closeBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-ghost btn-sm',
      'aria-label': closeLabel,
      onClick: () => dialog.close('close'),
    },
    svgIcon('close', { size: 18 }),
    el('span', {}, closeLabel)
  );

  const dialog = el(
    'dialog',
    {
      className: mobileSheet ? 'app-dialog app-dialog--sheet-mobile' : 'app-dialog',
      'aria-labelledby': titleId,
    },
    el(
      'div',
      { className: 'app-dialog__inner' },
      el(
        'div',
        { className: 'app-dialog__header' },
        el('h2', { id: titleId, className: 'app-dialog__title' }, title),
        closeBtn
      ),
      bodyNode
    )
  );

  dialog.addEventListener('close', () => {
    dialog.returnValue = '';
    dialog.remove();
    if (typeof onClose === 'function') onClose();
  });

  document.body.appendChild(dialog);
  dialog.showModal();
  return dialog;
}
