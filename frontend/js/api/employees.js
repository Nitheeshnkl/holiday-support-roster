import { apiRequest, requireIfMatch } from './client.js';

export function listEmployees({ page = 0, pageSize = 25, active, signal } = {}) {
  return apiRequest('/employees', {
    method: 'GET',
    query: { page, pageSize, active },
    signal,
  });
}

export function createEmployee(input) {
  return apiRequest('/employees', {
    method: 'POST',
    body: input,
  });
}

export function getEmployee(employeeId, { signal } = {}) {
  return apiRequest(`/employees/${encodeURIComponent(employeeId)}`, {
    method: 'GET',
    signal,
  });
}

export function updateEmployee(employeeId, input, ifMatch) {
  return apiRequest(`/employees/${encodeURIComponent(employeeId)}`, {
    method: 'PATCH',
    body: input,
    ifMatch: requireIfMatch(ifMatch),
  });
}

export function inviteEmployeeAccount(employeeId, idempotencyKey) {
  return apiRequest(`/employees/${encodeURIComponent(employeeId)}/invitations`, {
    method: 'POST',
    idempotencyKey,
  });
}

export function setEmployeeAccountStatus(employeeId, input, ifMatch) {
  return apiRequest(`/employees/${encodeURIComponent(employeeId)}/account-status`, {
    method: 'PUT',
    body: input,
    ifMatch: requireIfMatch(ifMatch),
  });
}

export function listTeams({ page = 0, pageSize = 25, signal } = {}) {
  return apiRequest('/teams', {
    method: 'GET',
    query: { page, pageSize },
    signal,
  });
}

export function createTeam(input) {
  return apiRequest('/teams', {
    method: 'POST',
    body: input,
  });
}

export function listEmployeeTeamMemberships(employeeId, { page = 0, pageSize = 25, signal } = {}) {
  return apiRequest(`/employees/${encodeURIComponent(employeeId)}/team-memberships`, {
    method: 'GET',
    query: { page, pageSize },
    signal,
  });
}

export function createEmployeeTeamMembership(employeeId, input) {
  return apiRequest(`/employees/${encodeURIComponent(employeeId)}/team-memberships`, {
    method: 'POST',
    body: input,
  });
}

export function listVisibleRoles({ page = 0, pageSize = 25, signal } = {}) {
  return apiRequest('/authorization/roles', {
    method: 'GET',
    query: { page, pageSize },
    signal,
  });
}

export function listEmployeeRoleAssignments(employeeId, { page = 0, pageSize = 25, signal } = {}) {
  return apiRequest(`/employees/${encodeURIComponent(employeeId)}/role-assignments`, {
    method: 'GET',
    query: { page, pageSize },
    signal,
  });
}

export function createEmployeeRoleAssignment(employeeId, input) {
  return apiRequest(`/employees/${encodeURIComponent(employeeId)}/role-assignments`, {
    method: 'POST',
    body: input,
  });
}

export function listApprovalGrants({ page = 0, pageSize = 25, signal } = {}) {
  return apiRequest('/authorization/approval-grants', {
    method: 'GET',
    query: { page, pageSize },
    signal,
  });
}

export function createApprovalGrant(input) {
  return apiRequest('/authorization/approval-grants', {
    method: 'POST',
    body: input,
  });
}

export function revokeApprovalGrant(grantId, ifMatch) {
  return apiRequest(`/authorization/approval-grants/${encodeURIComponent(grantId)}/revoke`, {
    method: 'POST',
    ifMatch: requireIfMatch(ifMatch),
  });
}


export function listTeamLeadAssignments(teamId, { page = 0, pageSize = 25, signal } = {}) {
  return apiRequest(`/teams/${encodeURIComponent(teamId)}/team-lead-assignments`, {
    method: 'GET', query: { page, pageSize }, signal,
  });
}

export function assignTeamLead(teamId, input, ifMatch) {
  return apiRequest(`/teams/${encodeURIComponent(teamId)}/team-lead-assignments`, {
    method: 'POST', body: input, ifMatch: requireIfMatch(ifMatch),
  });
}

export function replaceTeamLead(teamId, assignmentId, input, ifMatch) {
  return apiRequest(`/teams/${encodeURIComponent(teamId)}/team-lead-assignments/${encodeURIComponent(assignmentId)}/replacement`, {
    method: 'POST', body: input, ifMatch: requireIfMatch(ifMatch),
  });
}

export function terminateTeamLeadAssignment(teamId, assignmentId, input, ifMatch) {
  return apiRequest(`/teams/${encodeURIComponent(teamId)}/team-lead-assignments/${encodeURIComponent(assignmentId)}/terminate`, {
    method: 'POST', body: input, ifMatch: requireIfMatch(ifMatch),
  });
}

export function correctTeamLeadAssignmentHistory(teamId, assignmentId, input, ifMatch) {
  return apiRequest(`/teams/${encodeURIComponent(teamId)}/team-lead-assignments/${encodeURIComponent(assignmentId)}`, {
    method: 'PATCH', body: input, ifMatch: requireIfMatch(ifMatch),
  });
}
