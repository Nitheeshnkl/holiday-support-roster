import { el, svgIcon } from '../utils/dom.js';

let controlSeq = 0;

/**
 * Build an accessible labeled form control following Modern Web Guidance:
 * - <label for> before inputs (after checkbox/radio)
 * - hint placed above input so autocomplete/keyboards don't obscure it
 * - error container linked via data-error (added to aria-describedby only when invalid)
 */
export function createField({
  id = '',
  name,
  label,
  type = 'text',
  value = '',
  checked = false,
  required = false,
  hint = '',
  placeholder = '',
  autocomplete = '',
  inputmode = '',
  autocorrect = '',
  autocapitalize = '',
  spellcheck = '',
  min = '',
  max = '',
  minlength = '',
  maxlength = '',
  pattern = '',
  step = '',
  readonly = false,
  disabled = false,
  fullWidth = false,
  rows = 4,
  options = [],
  onChange = null,
} = {}) {
  controlSeq += 1;
  const fieldId = id || `field-${name || 'ctrl'}-${controlSeq}`;
  const hintId = hint ? `${fieldId}-hint` : '';
  const errorId = `${fieldId}-error`;

  if (type === 'checkbox') {
    const input = el('input', {
      type: 'checkbox',
      id: fieldId,
      name,
      checked,
      required,
      disabled,
      dataset: { error: errorId },
      'aria-invalid': 'false',
      'aria-describedby': hintId || undefined,
      onChange,
    });

    const row = el(
      'div',
      { className: 'field__checkbox-row' },
      input,
      el(
        'label',
        { for: fieldId, className: 'field__label' },
        label,
        required ? el('span', { className: 'field__required', 'aria-hidden': 'true' }, ' *') : null
      )
    );

    return el(
      'div',
      { className: fullWidth ? 'field field--full' : 'field' },
      hint ? el('span', { id: hintId, className: 'field__hint' }, hint) : null,
      row,
      el('div', { id: errorId, className: 'field__error' })
    );
  }

  let control;
  if (type === 'select') {
    control = el(
      'select',
      {
        id: fieldId,
        name,
        className: 'field__select',
        required,
        disabled,
        autocomplete: autocomplete || undefined,
        dataset: { error: errorId },
        'aria-invalid': 'false',
        'aria-describedby': hintId || undefined,
        onChange,
      },
      options.map((opt) => {
        const optEl = el(
          'option',
          {
            value: opt.value ?? '',
            disabled: opt.disabled || undefined,
          },
          opt.label
        );
        if (String(opt.value ?? '') === String(value ?? '')) {
          optEl.selected = true;
        }
        return optEl;
      })
    );
  } else if (type === 'textarea') {
    control = el('textarea', {
      id: fieldId,
      name,
      className: 'field__textarea',
      rows,
      required,
      readonly,
      disabled,
      placeholder: placeholder || undefined,
      maxlength: maxlength !== '' ? maxlength : undefined,
      dataset: { error: errorId },
      'aria-invalid': 'false',
      'aria-describedby': hintId || undefined,
    });
    control.value = value ?? '';
  } else {
    control = el('input', {
      type,
      id: fieldId,
      name,
      className: 'field__input',
      value: value ?? '',
      required,
      readonly,
      disabled,
      placeholder: placeholder || undefined,
      autocomplete: autocomplete || undefined,
      inputmode: inputmode || undefined,
      autocorrect: autocorrect || undefined,
      autocapitalize: autocapitalize || undefined,
      spellcheck: spellcheck !== '' ? spellcheck : undefined,
      min: min !== '' ? min : undefined,
      max: max !== '' ? max : undefined,
      minlength: minlength !== '' ? minlength : undefined,
      maxlength: maxlength !== '' ? maxlength : undefined,
      pattern: pattern || undefined,
      step: step !== '' ? step : undefined,
      dataset: { error: errorId },
      'aria-invalid': 'false',
      'aria-describedby': hintId || undefined,
      onChange,
    });
  }

  let controlWrapper = control;
  let warningSpan = null;
  if (type === 'password') {
    const warnId = `${fieldId}-toggle-warn`;
    warningSpan = el(
      'span',
      { id: warnId, className: 'visually-hidden' },
      'Warning: this will display your password on the screen.'
    );
    const toggleBtn = el(
      'button',
      {
        type: 'button',
        className: 'btn btn-secondary',
        'aria-pressed': 'false',
        'aria-label': 'Show password',
        'aria-describedby': warnId,
      },
      svgIcon('eye', { size: 18 }),
      el('span', {}, 'Show')
    );
    toggleBtn.addEventListener('click', () => {
      const shown = control.type === 'text';
      control.type = shown ? 'password' : 'text';
      toggleBtn.setAttribute('aria-pressed', shown ? 'false' : 'true');
      toggleBtn.setAttribute('aria-label', shown ? 'Show password' : 'Hide password');
      toggleBtn.replaceChildren(
        svgIcon(shown ? 'eye' : 'eyeOff', { size: 18 }),
        el('span', {}, shown ? 'Show' : 'Hide')
      );
    });
    controlWrapper = el('div', { className: 'password-input-row' }, control, toggleBtn);
  }

  return el(
    'div',
    { className: fullWidth ? 'field field--full' : 'field' },
    el(
      'label',
      { for: fieldId, className: 'field__label' },
      label,
      required ? el('span', { className: 'field__required', 'aria-hidden': 'true' }, ' *') : null
    ),
    hint ? el('span', { id: hintId, className: 'field__hint' }, hint) : null,
    warningSpan,
    controlWrapper,
    el('div', { id: errorId, className: 'field__error' })
  );
}
