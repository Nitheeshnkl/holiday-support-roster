import { apiRequest, requireIfMatch } from './client.js';

export function listHolidays({ fromDate, toDate, page = 0, pageSize = 25, signal } = {}) {
  return apiRequest('/holidays', {
    method: 'GET',
    query: { fromDate, toDate, page, pageSize },
    signal,
  });
}

export function createHoliday(input) {
  return apiRequest('/holidays', {
    method: 'POST',
    body: input,
  });
}

export function updateHoliday(holidayId, input, ifMatch) {
  return apiRequest(`/holidays/${encodeURIComponent(holidayId)}`, {
    method: 'PATCH',
    body: input,
    ifMatch: requireIfMatch(ifMatch),
  });
}
