/**
 * In-memory session store. Never persists credentials, CSRF tokens,
 * or sensitive operational records to localStorage or sessionStorage.
 */
const state = {
  session: null,
  csrfToken: null,
  unreadCount: null,
  statusChecked: false,
  pendingReturnTo: null,
};

const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    listener(getSnapshot());
  }
}

export function subscribeSession(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return {
    session: state.session,
    csrfToken: state.csrfToken,
    user: state.session?.user ?? null,
    onboarding: state.session?.onboarding ?? null,
    unreadCount: state.unreadCount,
    statusChecked: state.statusChecked,
  };
}

export function setSession(session) {
  state.session = session ?? null;
  if (session?.csrfToken) state.csrfToken = session.csrfToken;
  state.statusChecked = true;
  if (!state.session) {
    state.unreadCount = null;
  }
  notify();
}

export function clearSession() {
  state.session = null;
  state.csrfToken = null;
  state.unreadCount = null;
  state.statusChecked = true;
  notify();
}

export function updateOnboardingState(onboarding) {
  if (!state.session) return;
  state.session = {
    ...state.session,
    onboarding,
  };
  notify();
}

export function setUnreadCount(count) {
  state.unreadCount = typeof count === 'number' ? count : null;
  notify();
}

export function setPendingReturnTo(path) {
  if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')) {
    state.pendingReturnTo = path;
  } else {
    state.pendingReturnTo = null;
  }
}

export function consumePendingReturnTo() {
  const next = state.pendingReturnTo;
  state.pendingReturnTo = null;
  return next;
}

export function setCsrfToken(token) {
  state.csrfToken = typeof token === 'string' && token ? token : null;
  if (state.session && state.csrfToken) state.session = { ...state.session, csrfToken: state.csrfToken };
}

export function getCsrfToken() {
  return state.csrfToken;
}

export function getCurrentUser() {
  return state.session?.user ?? null;
}

export function isAuthenticated() {
  return Boolean(state.session?.user);
}

export function hasPermission(permissionCode) {
  const perms = state.session?.user?.permissions;
  return Array.isArray(perms) && perms.includes(permissionCode);
}

export function hasAnyPermission(permissionCodes = []) {
  return permissionCodes.some((code) => hasPermission(code));
}

export function hasScope(scopeCode, resourceId = null) {
  const scopes = state.session?.user?.scopes;
  if (!Array.isArray(scopes)) return false;
  if (scopes.includes('ORG')) return true;
  if (scopeCode === 'OWN') return scopes.includes('OWN');
  if (scopeCode === 'TEAM') return resourceId == null ? scopes.some((scope) => scope === 'TEAM' || String(scope).startsWith('TEAM:')) : scopes.some((scope) => scope === 'TEAM' || scope === `TEAM:${resourceId}`);
  return scopes.includes(scopeCode);
}

export function hasRole(roleCode) {
  const roles = state.session?.user?.roles;
  return Array.isArray(roles) && roles.includes(roleCode);
}

export function canApproveReplacements() {
  return hasPermission('REPLACEMENT.APPROVE');
}

/**
 * Presentation-layer recusal check (FDR-03).
 * Backend enforces authority, scope, and recusal authoritatively.
 */
export function isRecusedFromReplacement(request, candidates = []) {
  const user = state.session?.user;
  if (!user || !request) return true;
  if (user.id != null && request.requesterUserAccountId === user.id) return true;
  if (user.employeeId != null && request.requestedForEmployeeId === user.employeeId) return true;
  if (
    user.employeeId != null &&
    Array.isArray(candidates) &&
    candidates.some((candidate) => candidate.employeeId === user.employeeId)
  ) {
    return true;
  }
  return false;
}
