import { apiRequest } from './client.js';

export function listAuditEvents({ page = 0, pageSize = 25, fromDate, toDate, signal } = {}) {
  return apiRequest('/audit-events', {
    method: 'GET',
    query: { page, pageSize, fromDate, toDate },
    signal,
  });
}
