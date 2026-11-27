import { apiRequest, requireIfMatch } from './client.js';

export function listAvailability({ employeeId, fromDate, toDate, page = 0, pageSize = 25, signal } = {}) {
  return apiRequest('/availability', {
    method: 'GET',
    query: { employeeId, fromDate, toDate, page, pageSize },
    signal,
  });
}

export function createAvailability(input) {
  return apiRequest('/availability', {
    method: 'POST',
    body: input,
  });
}

export function updateAvailability(availabilityId, input, ifMatch) {
  return apiRequest(`/availability/${encodeURIComponent(availabilityId)}`, {
    method: 'PATCH',
    body: input,
    ifMatch: requireIfMatch(ifMatch),
  });
}

export function withdrawAvailability(availabilityId, ifMatch) {
  return apiRequest(`/availability/${encodeURIComponent(availabilityId)}/withdraw`, {
    method: 'POST',
    ifMatch: requireIfMatch(ifMatch),
  });
}
