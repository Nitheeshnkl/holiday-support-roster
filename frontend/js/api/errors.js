export class ApiError extends Error {
  constructor({ status, code, message, fieldErrors = [], correlationId = null, timestamp = null }) {
    super(message || 'Request failed.');
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'REQUEST_FAILED';
    this.fieldErrors = Array.isArray(fieldErrors) ? fieldErrors : [];
    this.correlationId = correlationId || null;
    this.timestamp = timestamp || null;
  }
}

const DEFAULT_STATUS_MESSAGES = {
  400: 'The request could not be processed. Check your input and try again.',
  401: 'Your session has expired or you are not signed in.',
  403: 'You do not have permission to access this resource or perform this action.',
  404: 'The requested item was not found or is not available to your account.',
  409: 'This record was updated elsewhere or is in a conflicting state. Reload the latest data and review before retrying.',
  422: 'Please review the highlighted validation errors and try again.',
  429: 'Too many requests. Please wait a moment before trying again.',
  500: 'An unexpected server error occurred. Please retry or contact support with the reference ID.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
};

/**
 * Normalize backend Error DTO ({ code, message, fieldErrors, correlationId, timestamp })
 * without exposing raw HTML, stack traces, or internal details.
 */
export function normalizeApiError(status, payload) {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const rawMessage = typeof safePayload.message === 'string' ? safePayload.message.trim() : '';
  const message =
    rawMessage && rawMessage.length <= 500 && !rawMessage.includes('<')
      ? rawMessage
      : DEFAULT_STATUS_MESSAGES[status] || 'Unable to complete request. Please try again.';

  const fieldErrors = Array.isArray(safePayload.fieldErrors)
    ? safePayload.fieldErrors
        .filter((f) => f && typeof f.field === 'string')
        .map((f) => ({
          field: f.field,
          code: typeof f.code === 'string' ? f.code : 'INVALID',
          message: typeof f.message === 'string' ? f.message : 'Invalid value.',
        }))
    : [];

  return new ApiError({
    status,
    code: typeof safePayload.code === 'string' ? safePayload.code : `HTTP_${status}`,
    message,
    fieldErrors,
    correlationId: typeof safePayload.correlationId === 'string' ? safePayload.correlationId : null,
    timestamp: typeof safePayload.timestamp === 'string' ? safePayload.timestamp : null,
  });
}

export function isAbortError(error) {
  return Boolean(error && (error.name === 'AbortError' || error.code === 20));
}
