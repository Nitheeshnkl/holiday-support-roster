import { apiRequest, requireIfMatch } from './client.js';

export function listReplacementRequests({ status, page = 0, pageSize = 25, signal } = {}) {
  return apiRequest('/replacement-requests', {
    method: 'GET',
    query: { status, page, pageSize },
    signal,
  });
}

export function createReplacementRequest(input, idempotencyKey) {
  return apiRequest('/replacement-requests', {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
}

export function listReplacementCandidates(requestId, { page = 0, pageSize = 25, signal } = {}) {
  return apiRequest(`/replacement-requests/${encodeURIComponent(requestId)}/candidates`, {
    method: 'GET',
    query: { page, pageSize },
    signal,
  });
}

export function decideReplacement(requestId, input, ifMatch, idempotencyKey) {
  return apiRequest(`/replacement-requests/${encodeURIComponent(requestId)}/decision`, {
    method: 'POST',
    body: input,
    ifMatch: requireIfMatch(ifMatch),
    idempotencyKey,
  });
}

export function activateStandby(input) {
  return apiRequest('/standby-activations', {
    method: 'POST',
    body: input,
  });
}
