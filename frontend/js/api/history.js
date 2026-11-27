import { apiRequest } from './client.js';

export function getDutyHistory({ employeeId, fromDate, toDate, dimension, page = 0, pageSize = 25, signal }) {
  return apiRequest('/duty-history', {
    method: 'GET',
    query: { employeeId, fromDate, toDate, dimension, page, pageSize },
    signal,
  });
}
