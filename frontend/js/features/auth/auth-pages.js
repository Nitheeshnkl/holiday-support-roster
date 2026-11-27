import { el, clear, svgIcon, announceStatus } from '../../utils/dom.js';
import { bindFormValidation, applyServerFieldErrors, clearServerFieldErrors, validatePasswordValue } from '../../utils/validation.js';
import { createField } from '../../components/form-controls.js';
import { createAlert, showToast } from '../../components/alert.js';
import { confirmDialog } from '../../components/dialog.js';
import * as sessionApi from '../../api/session.js';
import { setSession, consumePendingReturnTo } from '../../state/session-store.js';

function renderAuthCard(container, { title, subtitle, children, navigate }) {
  clear(container);
  const card = el(
    'section',
    { className: 'auth-card', 'aria-labelledby': 'main-heading' },
    el(
      'div',
      { className: 'auth-card__brand' },
      svgIcon('calendar', { size: 22 }),
      el('span', {}, 'Holiday Support Roster')
    ),
    el('h1', { id: 'main-heading', tabindex: '-1' }, title),
    subtitle ? el('p', { className: 'muted' }, subtitle) : null,
    children
  );
  container.appendChild(el('main', { id: 'main-content', className: 'auth-layout' }, card));

  // Optional clean link binding inside auth layout
  container.querySelectorAll('a[data-route]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });
}

export function renderLoginPage({ container, navigate, onAuthenticated, reasonMessage = '', signal }) {
  const errorBox = el('div', { className: 'stack-sm' });
  if (reasonMessage) {
    errorBox.appendChild(
      createAlert({ variant: 'info', title: 'Session notice', message: reasonMessage, role: 'status' })
    );
  }

  const submitBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Sign in');

  const form = el(
    'form',
    { className: 'stack', novalidate: true },
    errorBox,
    createField({
      name: 'username',
      label: 'Username or work email',
      type: 'text',
      required: true,
      maxlength: 255,
      autocomplete: 'username',
      autocorrect: 'off',
      autocapitalize: 'none',
      spellcheck: 'false',
    }),
    createField({
      name: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      autocomplete: 'current-password',
    }),
    submitBtn,
    el(
      'div',
      { className: 'cluster' },
      el('a', { href: '/forgot-password', dataset: { route: 'true' } }, 'Forgot password?'),
      el('a', { href: '/activate', dataset: { route: 'true' } }, 'Activate invited account')
    )
  );

  renderAuthCard(container, {
    title: 'Sign in',
    subtitle: 'Access your holiday support roster, availability, and requests.',
    children: form,
    navigate,
  });

  bindFormValidation(form, {
    signal,
    onSubmitValid: async (formData) => {
      clearServerFieldErrors(form);
      clear(errorBox);
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in…';
      try {
        const session = await sessionApi.login({
          username: String(formData.get('username') || '').trim(),
          password: String(formData.get('password') || ''),
        });
        setSession(session);
        await onAuthenticated?.(session);
        const returnTo = consumePendingReturnTo();
        navigate(returnTo && returnTo !== '/login' ? returnTo : '/', { replace: true });
      } catch (err) {
        if (err.status === 422 && applyServerFieldErrors(form, err.fieldErrors)) {
          errorBox.appendChild(
            createAlert({
              variant: 'error',
              title: 'Check your input',
              message: err.message,
              correlationId: err.correlationId,
            })
          );
        } else {
          // Generic credential failure without account enumeration
          errorBox.appendChild(
            createAlert({
              variant: 'error',
              title: 'Sign in failed',
              message:
                err.status === 401
                  ? 'Invalid credentials or locked account. Check your details and try again.'
                  : err.message,
              correlationId: err.correlationId,
            })
          );
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign in';
      }
    },
  });
}

export function renderForgotPasswordPage({ container, navigate, signal }) {
  const feedbackBox = el('div', { className: 'stack-sm' });
  const submitBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Send reset request');

  const form = el(
    'form',
    { className: 'stack', novalidate: true },
    feedbackBox,
    createField({
      name: 'email',
      label: 'Work email address',
      type: 'email',
      required: true,
      maxlength: 254,
      autocomplete: 'email',
      autocorrect: 'off',
      autocapitalize: 'none',
      spellcheck: 'false',
      hint: 'Single-use reset tokens expire after 30 minutes.',
    }),
    submitBtn,
    el(
      'div',
      { className: 'cluster' },
      el('a', { href: '/login', dataset: { route: 'true' } }, 'Back to sign in'),
      el('a', { href: '/reset-password', dataset: { route: 'true' } }, 'I have a reset token')
    )
  );

  renderAuthCard(container, {
    title: 'Request password reset',
    subtitle: 'Enter your work email address to request a single-use password reset link.',
    children: form,
    navigate,
  });

  bindFormValidation(form, {
    signal,
    onSubmitValid: async (formData) => {
      clearServerFieldErrors(form);
      clear(feedbackBox);
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';
      try {
        await sessionApi.requestPasswordReset({
          email: String(formData.get('email') || '').trim(),
        });
        feedbackBox.appendChild(
          createAlert({
            variant: 'success',
            title: 'Request accepted',
            message:
              'If an eligible account matches that email address, a password reset link has been queued for delivery.',
            role: 'status',
          })
        );
        announceStatus('Password reset request processed.');
        form.reset();
      } catch (err) {
        feedbackBox.appendChild(
          createAlert({
            variant: 'error',
            title: 'Unable to submit request',
            message: err.message,
            correlationId: err.correlationId,
          })
        );
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send reset request';
      }
    },
  });
}

function consumeTokenFromQuery(query, routePath) {
  const token = query?.get('token') || '';
  if (token) {
    window.history.replaceState({}, '', routePath);
  }
  return token;
}

export function renderResetPasswordPage({ container, navigate, query, signal }) {
  const initialToken = consumeTokenFromQuery(query, '/reset-password');
  const feedbackBox = el('div', { className: 'stack-sm' });
  const submitBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Reset password');

  const form = el(
    'form',
    { className: 'stack', novalidate: true },
    feedbackBox,
    createField({
      name: 'token',
      label: 'Reset token',
      type: 'text',
      value: initialToken,
      required: true,
      autocorrect: 'off',
      autocapitalize: 'none',
      spellcheck: 'false',
      hint: 'Paste the single-use reset token from your reset email (expires after 30 minutes).',
    }),
    createField({
      name: 'newPassword',
      label: 'New password',
      type: 'password',
      required: true,
      minlength: 12,
      autocomplete: 'new-password',
      hint: 'At least 12 characters and no more than 72 UTF-8 bytes.',
    }),
    createField({
      name: 'confirmPassword',
      label: 'Confirm new password',
      type: 'password',
      required: true,
      autocomplete: 'new-password',
    }),
    submitBtn,
    el('a', { href: '/login', dataset: { route: 'true' } }, 'Return to sign in')
  );

  renderAuthCard(container, {
    title: 'Set a new password',
    subtitle: 'Consumes your single-use token and revokes all prior active sessions.',
    children: form,
    navigate,
  });

  bindFormValidation(form, {
    signal,
    customValidators: {
      newPassword: (val) => validatePasswordValue(val),
      confirmPassword: (val, f) =>
        val !== f.elements.namedItem('newPassword').value ? 'Passwords do not match.' : '',
    },
    onSubmitValid: async (formData) => {
      clearServerFieldErrors(form);
      clear(feedbackBox);
      submitBtn.disabled = true;
      submitBtn.textContent = 'Resetting password…';
      try {
        await sessionApi.resetPassword({
          token: String(formData.get('token') || '').trim(),
          newPassword: String(formData.get('newPassword') || ''),
        });
        form.reset();
        feedbackBox.appendChild(
          createAlert({
            variant: 'success',
            title: 'Password reset complete',
            message: 'Your password has been updated and prior sessions revoked. You may now sign in.',
            role: 'status',
          })
        );
      } catch (err) {
        applyServerFieldErrors(form, err.fieldErrors);
        feedbackBox.appendChild(
          createAlert({
            variant: 'error',
            title: 'Unable to reset password',
            message: err.message,
            correlationId: err.correlationId,
          })
        );
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset password';
      }
    },
  });
}

export function renderActivateAccountPage({ container, navigate, query, signal }) {
  const initialToken = consumeTokenFromQuery(query, '/activate');
  const feedbackBox = el('div', { className: 'stack-sm' });
  const submitBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Activate account');

  const form = el(
    'form',
    { className: 'stack', novalidate: true },
    feedbackBox,
    createField({
      name: 'token',
      label: 'Invitation token',
      type: 'text',
      value: initialToken,
      required: true,
      autocorrect: 'off',
      autocapitalize: 'none',
      spellcheck: 'false',
      hint: 'Single-use invitation tokens expire after 24 hours.',
    }),
    createField({
      name: 'newPassword',
      label: 'Choose password',
      type: 'password',
      required: true,
      minlength: 12,
      autocomplete: 'new-password',
      hint: 'At least 12 characters and no more than 72 UTF-8 bytes. No arbitrary character rules apply.',
    }),
    createField({
      name: 'confirmPassword',
      label: 'Confirm password',
      type: 'password',
      required: true,
      autocomplete: 'new-password',
    }),
    submitBtn,
    el('a', { href: '/login', dataset: { route: 'true' } }, 'Return to sign in')
  );

  renderAuthCard(container, {
    title: 'Activate account',
    subtitle: 'Set your initial password using the invitation sent by your administrator.',
    children: form,
    navigate,
  });

  bindFormValidation(form, {
    signal,
    customValidators: {
      newPassword: (val) => validatePasswordValue(val),
      confirmPassword: (val, f) =>
        val !== f.elements.namedItem('newPassword').value ? 'Passwords do not match.' : '',
    },
    onSubmitValid: async (formData) => {
      clearServerFieldErrors(form);
      clear(feedbackBox);
      submitBtn.disabled = true;
      submitBtn.textContent = 'Activating…';
      try {
        await sessionApi.activateAccount({
          token: String(formData.get('token') || '').trim(),
          newPassword: String(formData.get('newPassword') || ''),
        });
        form.reset();
        feedbackBox.appendChild(
          createAlert({
            variant: 'success',
            title: 'Account activated',
            message: 'Your initial password is set. Sign in with your username or work email.',
            role: 'status',
          })
        );
      } catch (err) {
        applyServerFieldErrors(form, err.fieldErrors);
        feedbackBox.appendChild(
          createAlert({
            variant: 'error',
            title: 'Activation failed',
            message: err.message,
            correlationId: err.correlationId,
          })
        );
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Activate account';
      }
    },
  });
}

export function renderAccountSecurityPage({ container, session, signal }) {
  const user = session.user;
  const feedbackBox = el('div', { className: 'stack-sm' });
  const submitBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Change password');

  const form = el(
    'form',
    { className: 'stack', novalidate: true },
    feedbackBox,
    createField({
      name: 'currentPassword',
      label: 'Current password',
      type: 'password',
      required: true,
      autocomplete: 'current-password',
    }),
    createField({
      name: 'newPassword',
      label: 'New password',
      type: 'password',
      required: true,
      minlength: 12,
      autocomplete: 'new-password',
      hint: '12 or more characters and at most 72 UTF-8 bytes. Rotates your session and revokes other active sessions.',
    }),
    createField({
      name: 'confirmPassword',
      label: 'Confirm new password',
      type: 'password',
      required: true,
      autocomplete: 'new-password',
    }),
    el('div', { className: 'cluster' }, submitBtn)
  );

  const profilePanel = el(
    'section',
    { className: 'panel', 'aria-labelledby': 'account-profile-heading' },
    el('h2', { id: 'account-profile-heading' }, 'Signed-in session'),
    el(
      'dl',
      { className: 'kv-grid' },
      el('div', { className: 'kv-item' }, el('dt', {}, 'Display name'), el('dd', {}, user.displayName || '—')),
      el(
        'div',
        { className: 'kv-item' },
        el('dt', {}, 'Employee ID'),
        el('dd', {}, user.employeeId != null ? String(user.employeeId) : 'Unlinked')
      ),
      el(
        'div',
        { className: 'kv-item' },
        el('dt', {}, 'Effective roles'),
        el('dd', {}, Array.isArray(user.roles) && user.roles.length ? user.roles.join(', ') : 'None')
      ),
      el(
        'div',
        { className: 'kv-item' },
        el('dt', {}, 'Scopes'),
        el('dd', {}, Array.isArray(user.scopes) && user.scopes.length ? user.scopes.join(', ') : 'Default')
      )
    ),
    el(
      'details',
      {},
      el('summary', {}, 'Effective permissions granted by session'),
      el(
        'p',
        { className: 'muted mono' },
        Array.isArray(user.permissions) && user.permissions.length
          ? user.permissions.join(', ')
          : 'No explicit permissions returned.'
      )
    )
  );

  const passwordPanel = el(
    'section',
    { className: 'panel', 'aria-labelledby': 'account-password-heading' },
    el('h2', { id: 'account-password-heading' }, 'Change password'),
    form
  );

  container.append(
    el('div', { className: 'page-header' }, el('h1', { id: 'main-heading', tabindex: '-1' }, 'Account and security')),
    profilePanel,
    passwordPanel
  );

  bindFormValidation(form, {
    signal,
    customValidators: {
      newPassword: (val) => validatePasswordValue(val),
      confirmPassword: (val, f) =>
        val !== f.elements.namedItem('newPassword').value ? 'Passwords do not match.' : '',
    },
    onSubmitValid: async (formData) => {
      clearServerFieldErrors(form);
      clear(feedbackBox);
      const confirmed = await confirmDialog({
        title: 'Confirm password change',
        message: 'Changing your password rotates your session identifier and signs out all other active sessions.',
        confirmLabel: 'Change password',
      });
      if (!confirmed) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating…';
      try {
        await sessionApi.changePassword({
          currentPassword: String(formData.get('currentPassword') || ''),
          newPassword: String(formData.get('newPassword') || ''),
        });
        form.reset();
        const refreshed = await sessionApi.getCurrentSession();
        setSession(refreshed);
        feedbackBox.appendChild(
          createAlert({
            variant: 'success',
            title: 'Password changed',
            message: 'Your password was updated and other active sessions were revoked.',
            role: 'status',
          })
        );
        showToast('Password updated.', { variant: 'success' });
      } catch (err) {
        applyServerFieldErrors(form, err.fieldErrors);
        feedbackBox.appendChild(
          createAlert({
            variant: 'error',
            title: 'Password change failed',
            message: err.message,
            correlationId: err.correlationId,
          })
        );
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Change password';
      }
    },
  });
}

export function renderSessionExpiredPage({ container, navigate }) {
  renderAuthCard(container, {
    title: 'Session expired',
    subtitle: 'Your session is no longer active or has been signed out. In-memory session data has been cleared.',
    children: el(
      'div',
      { className: 'stack' },
      createAlert({
        variant: 'info',
        title: 'Authentication required',
        message: 'Sign in again to continue managing holiday rosters.',
        role: 'status',
      }),
      el(
        'a',
        { href: '/login', className: 'btn btn-primary', dataset: { route: 'true' } },
        'Sign in'
      )
    ),
    navigate,
  });
}

export function renderStatusNoticePage({ container, navigate, mode = 'unauthorized', isAuthenticated = false }) {
  const isNotFound = mode === 'unavailable';
  const title = isNotFound ? 'Page or resource unavailable' : 'Access denied';
  const message = isNotFound
    ? 'The requested page or record is unavailable or not visible to your account.'
    : 'Your account does not currently have permission to view this page.';

  const content = el(
    'div',
    { className: 'stack' },
    el('h1', { id: 'main-heading', tabindex: '-1' }, title),
    createAlert({
      variant: isNotFound ? 'warning' : 'error',
      title,
      message,
      role: isNotFound ? 'status' : 'alert',
    }),
    el(
      'div',
      { className: 'cluster' },
      el(
        'a',
        {
          href: isAuthenticated ? '/' : '/login',
          className: 'btn btn-primary',
          onClick: (e) => {
            e.preventDefault();
            navigate(isAuthenticated ? '/' : '/login');
          },
        },
        isAuthenticated ? 'Return to Overview' : 'Go to Sign in'
      )
    )
  );

  if (isAuthenticated) {
    container.appendChild(content);
  } else {
    clear(container);
    container.appendChild(
      el(
        'main',
        { id: 'main-content', className: 'auth-layout' },
        el('section', { className: 'auth-card', 'aria-labelledby': 'main-heading' }, content)
      )
    );
  }
}
