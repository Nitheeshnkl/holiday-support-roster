import { isValidIsoDate, compareIsoDates } from './date.js';
import { utf8ByteLength } from './format.js';

/**
 * Validate password bounds per FDR-13 and OpenAPI PasswordValue:
 * at least 12 characters and no more than 72 UTF-8 bytes; no arbitrary composition rule.
 */
export function validatePasswordValue(password) {
  const value = String(password ?? '');
  if (value.length < 12) {
    return 'Password must be at least 12 characters.';
  }
  if (utf8ByteLength(value) > 72) {
    return 'Password must not exceed 72 UTF-8 bytes.';
  }
  return '';
}

export function validateDateRange(startDate, endDate, { allowOpenEnd = false } = {}) {
  if (!isValidIsoDate(startDate)) {
    return { field: 'start', message: 'Enter a valid start date (YYYY-MM-DD).' };
  }
  if (!endDate && allowOpenEnd) {
    return null;
  }
  if (!isValidIsoDate(endDate)) {
    return { field: 'end', message: 'Enter a valid end date (YYYY-MM-DD).' };
  }
  if (compareIsoDates(startDate, endDate) > 0) {
    return { field: 'end', message: 'End date must be on or after start date.' };
  }
  return null;
}

/**
 * Sync aria-invalid, aria-describedby, and fallback classes after user interaction,
 * following Modern Web Guidance (validate-input-after-interaction + accessible-error-announcement).
 */
export function bindFormValidation(form, { customValidators = {}, onSubmitValid, signal } = {}) {
  const dirtyState = new WeakMap();
  const supportsUserInvalid = typeof CSS !== 'undefined' && CSS.supports?.('selector(:user-invalid)');

  const linkError = (control, shown) => {
    const errorId = control.dataset?.error;
    if (!errorId) return;
    const ids = (control.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter((id) => id && id !== errorId);
    if (shown) ids.push(errorId);
    if (ids.length) control.setAttribute('aria-describedby', ids.join(' '));
    else control.removeAttribute('aria-describedby');
  };

  const getErrorEl = (control) => {
    const errorId = control.dataset?.error;
    return errorId ? document.getElementById(errorId) : null;
  };

  const runCustomValidator = (control) => {
    if (!control.setCustomValidity) return;
    const validator = customValidators[control.name];
    if (typeof validator === 'function') {
      const msg = validator(control.value, form);
      control.setCustomValidity(msg || '');
    } else {
      control.setCustomValidity('');
    }
  };

  const applyControlState = (control, showFeedback) => {
    if (!control.matches?.('input, select, textarea')) return;
    runCustomValidator(control);
    const valid = control.validity.valid;
    const errorEl = getErrorEl(control);

    if (showFeedback && !valid) {
      if (!supportsUserInvalid) {
        control.classList.add('user-invalid-fallback');
      }
      control.setAttribute('aria-invalid', 'true');
      linkError(control, true);
      if (errorEl) {
        errorEl.textContent = control.validationMessage || 'Please check this value.';
        errorEl.classList.add('field__error--visible');
      }
    } else if (valid) {
      control.classList.remove('user-invalid-fallback');
      control.setAttribute('aria-invalid', 'false');
      linkError(control, false);
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('field__error--visible');
      }
    }
  };

  for (const control of form.querySelectorAll('input, select, textarea')) {
    if (!control.hasAttribute('aria-invalid')) {
      control.setAttribute('aria-invalid', 'false');
    }
  }

  form.addEventListener(
    'input',
    (e) => {
      const control = e.target;
      if (!control.matches?.('input, select, textarea')) return;
      const state = dirtyState.get(control) || { interacted: false, blurred: false };
      state.interacted = true;
      dirtyState.set(control, state);
      runCustomValidator(control);
      // Clear error immediately while typing once valid; never nag prematurely
      if (control.validity.valid) {
        applyControlState(control, false);
      }
    },
    { signal }
  );

  form.addEventListener(
    'blur',
    (e) => {
      const control = e.target;
      if (!control.matches?.('input, select, textarea')) return;
      const state = dirtyState.get(control) || { interacted: false, blurred: false };
      state.blurred = true;
      dirtyState.set(control, state);
      if (state.interacted) {
        applyControlState(control, true);
      }
    },
    { capture: true, signal }
  );

  form.addEventListener(
    'change',
    (e) => {
      const control = e.target;
      if (!control.matches?.('select, input[type="checkbox"], input[type="radio"], input[type="date"], input[type="datetime-local"]')) return;
      const state = dirtyState.get(control) || { interacted: false, blurred: false };
      state.interacted = true;
      state.blurred = true;
      dirtyState.set(control, state);
      applyControlState(control, true);
    },
    { signal }
  );

  form.addEventListener(
    'submit',
    async (e) => {
      e.preventDefault();
      let firstInvalid = null;
      for (const control of form.elements) {
        if (!control.matches?.('input, select, textarea')) continue;
        dirtyState.set(control, { interacted: true, blurred: true });
        applyControlState(control, true);
        if (!control.validity.valid && !firstInvalid) {
          firstInvalid = control;
        }
      }
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      if (typeof onSubmitValid === 'function') {
        await onSubmitValid(new FormData(form), form);
      }
    },
    { signal }
  );
}

/**
 * Apply backend 422 fieldErrors directly to matching named form controls.
 */
export function applyServerFieldErrors(form, fieldErrors = []) {
  if (!form || !Array.isArray(fieldErrors) || !fieldErrors.length) return false;
  let firstControl = null;

  for (const item of fieldErrors) {
    const fieldName = item?.field;
    if (!fieldName) continue;
    const control = form.elements.namedItem(fieldName);
    if (!control || !(control instanceof Element)) continue;

    control.setAttribute('aria-invalid', 'true');
    control.classList.add('user-invalid-fallback');
    const errorId = control.dataset?.error;
    if (errorId) {
      const errorEl = document.getElementById(errorId);
      if (errorEl) {
        errorEl.textContent = item.message || item.code || 'Invalid value.';
        errorEl.classList.add('field__error--visible');
      }
      const ids = (control.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter((id) => id && id !== errorId);
      ids.push(errorId);
      control.setAttribute('aria-describedby', ids.join(' '));
    }
    if (!firstControl) firstControl = control;
  }

  if (firstControl && typeof firstControl.focus === 'function') {
    firstControl.focus();
    return true;
  }
  return false;
}

export function clearServerFieldErrors(form) {
  if (!form) return;
  for (const control of form.elements) {
    if (!control.matches?.('input, select, textarea')) continue;
    control.classList.remove('user-invalid-fallback');
    control.setAttribute('aria-invalid', 'false');
    const errorId = control.dataset?.error;
    if (errorId) {
      const errorEl = document.getElementById(errorId);
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('field__error--visible');
      }
      const ids = (control.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter((id) => id && id !== errorId);
      if (ids.length) control.setAttribute('aria-describedby', ids.join(' '));
      else control.removeAttribute('aria-describedby');
    }
  }
}

/**
 * Track unsaved form changes and warn before browser unload.
 */
export function attachDirtyGuard(form, { signal } = {}) {
  let dirty = false;
  const markDirty = () => {
    dirty = true;
  };
  form.addEventListener('input', markDirty, { signal });
  form.addEventListener('change', markDirty, { signal });
  window.addEventListener(
    'beforeunload',
    (e) => {
      if (dirty) {
        e.preventDefault();
      }
    },
    { signal }
  );
  return {
    isDirty: () => dirty,
    resetDirty: () => {
      dirty = false;
    },
  };
}
