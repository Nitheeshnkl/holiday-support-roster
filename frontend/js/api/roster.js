import { apiRequest, requireIfMatch } from './client.js';

export function listRosterPeriods({ page = 0, pageSize = 25, signal } = {}) {
  return apiRequest('/roster-periods', {
    method: 'GET',
    query: { page, pageSize },
    signal,
  });
}

export function createRosterPeriod(input) {
  return apiRequest('/roster-periods', {
    method: 'POST',
    body: input,
  });
}

export function generateRosterDraft(periodId, input, idempotencyKey) {
  const hasPayload = input && Object.keys(input).some((k) => input[k]);
  return apiRequest(`/roster-periods/${encodeURIComponent(periodId)}/generate`, {
    method: 'POST',
    body: hasPayload ? input : undefined,
    idempotencyKey,
  });
}

export function getRoster(periodId, { status, signal } = {}) {
  return apiRequest(`/roster-periods/${encodeURIComponent(periodId)}/roster`, {
    method: 'GET',
    query: { status },
    signal,
  });
}

export function listGenerationRuns(periodId, { page = 0, pageSize = 25, signal } = {}) {
  return apiRequest(`/roster-periods/${encodeURIComponent(periodId)}/generation-runs`, {
    method: 'GET',
    query: { page, pageSize },
    signal,
  });
}

export function updateDraftAssignment(versionId, assignmentId, input, ifMatch) {
  return apiRequest(
    `/roster-versions/${encodeURIComponent(versionId)}/assignments/${encodeURIComponent(assignmentId)}`,
    {
      method: 'PATCH',
      body: input,
      ifMatch: requireIfMatch(ifMatch),
    }
  );
}

export function listDraftAssignmentCandidates(
  versionId,
  { holidayId, slotType, slotNumber, page = 0, pageSize = 25, signal }
) {
  return apiRequest(`/roster-versions/${encodeURIComponent(versionId)}/assignment-candidates`, {
    method: 'GET',
    query: { holidayId, slotType, slotNumber, page, pageSize },
    signal,
  });
}

export function createDraftAssignment(versionId, input, ifMatch) {
  return apiRequest(`/roster-versions/${encodeURIComponent(versionId)}/assignments`, {
    method: 'POST',
    body: input,
    ifMatch: requireIfMatch(ifMatch),
  });
}

export function publishRosterVersion(versionId, ifMatch, idempotencyKey) {
  return apiRequest(`/roster-versions/${encodeURIComponent(versionId)}/publish`, {
    method: 'POST',
    ifMatch: requireIfMatch(ifMatch),
    idempotencyKey,
  });
}

export function createRosterRevision(versionId, input, ifMatch, idempotencyKey) {
  return apiRequest(`/roster-versions/${encodeURIComponent(versionId)}/revisions`, {
    method: 'POST',
    body: input,
    ifMatch: requireIfMatch(ifMatch),
    idempotencyKey,
  });
}
