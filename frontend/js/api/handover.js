import { apiRequest } from './client.js';

export function listHandoverReports({ assignmentId, page = 0, pageSize = 25, signal } = {}) {
  return apiRequest('/handover-reports', {
    method: 'GET',
    query: { assignmentId, page, pageSize },
    signal,
  });
}

export function createHandoverReport(input) {
  return apiRequest('/handover-reports', {
    method: 'POST',
    body: input,
  });
}

export function getHandoverReport(handoverId, { signal } = {}) {
  return apiRequest(`/handover-reports/${encodeURIComponent(handoverId)}`, {
    method: 'GET',
    signal,
  });
}
