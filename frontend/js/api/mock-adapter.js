/**
 * Development-only in-memory mock API adapter implementing OpenAPI v3.0.0 (/api/v2).
 * Isolated behind config.mockMode === true; never persists credentials or data
 * to localStorage/sessionStorage and is blocked on non-local hostnames.
 */

const ALL_ADMIN_PERMISSIONS = [
  'ORG.USER.READ',
  'ORG.USER.MANAGE',
  'ORG.TEAM.MANAGE',
  'ORG.TEAM_LEAD.MANAGE',
  'ORG.MEMBERSHIP.MANAGE',
  'ORG.ROLE.MANAGE',
  'ORG.AUTHORITY.MANAGE',
  'ACCOUNT.INVITE',
  'ACCOUNT.STATUS.MANAGE',
  'CALENDAR.READ',
  'CALENDAR.MANAGE',
  'AVAILABILITY.READ',
  'AVAILABILITY.MANAGE_OWN',
  'AVAILABILITY.MANAGE_ON_BEHALF',
  'ROSTER.READ',
  'ROSTER.GENERATE',
  'ROSTER.MANUAL_ASSIGN',
  'ROSTER.PUBLISH',
  'ROSTER.REVISE',
  'REPLACEMENT.READ',
  'REPLACEMENT.REQUEST_OWN',
  'STANDBY.ACTIVATE',
  'DUTY.REPORT.READ',
  'HANDOVER.READ',
  'HANDOVER.CREATE',
  'NOTIFICATION.READ',
  'HELP.READ',
  'HELP.MANAGE',
  'AUDIT.READ',
];

const TEAM_LEAD_PERMISSIONS = [
  'ORG.USER.READ',
  'CALENDAR.READ',
  'AVAILABILITY.READ',
  'AVAILABILITY.MANAGE_OWN',
  'ROSTER.READ',
  'REPLACEMENT.READ',
  'REPLACEMENT.REQUEST_OWN',
  'DUTY.REPORT.READ',
  'HANDOVER.READ',
  'HANDOVER.CREATE',
  'NOTIFICATION.READ',
  'HELP.READ',
];

const MEMBER_PERMISSIONS = [
  'ORG.USER.READ',
  'CALENDAR.READ',
  'AVAILABILITY.MANAGE_OWN',
  'ROSTER.READ',
  'REPLACEMENT.READ',
  'REPLACEMENT.REQUEST_OWN',
  'DUTY.REPORT.READ',
  'HANDOVER.READ',
  'HANDOVER.CREATE',
  'NOTIFICATION.READ',
  'HELP.READ',
];

const APPROVER_PERMISSIONS = [
  ...MEMBER_PERMISSIONS,
  'REPLACEMENT.APPROVE',
  'STANDBY.ACTIVATE',
];

const AUDITOR_PERMISSIONS = [
  'ORG.USER.READ',
  'CALENDAR.READ',
  'ROSTER.READ',
  'REPLACEMENT.READ',
  'DUTY.REPORT.READ',
  'HANDOVER.READ',
  'NOTIFICATION.READ',
  'HELP.READ',
  'AUDIT.READ',
];

export const MOCK_DEMO_ACCOUNTS = Object.freeze([
  { username: 'admin@company.local', password: 'AdminRoster#2026', roleLabel: 'ADMIN (ORG scope)' },
  { username: 'lead@company.local', password: 'TeamLead#2026', roleLabel: 'TEAM_LEAD (TEAM:1 scope)' },
  { username: 'member@company.local', password: 'MemberRoster#2026', roleLabel: 'MEMBER (OWN scope)' },
  { username: 'approver@company.local', password: 'Approver#2026', roleLabel: 'Approver (REPLACEMENT.APPROVE)' },
  { username: 'auditor@company.local', password: 'Auditor#2026', roleLabel: 'Auditor (AUDIT.READ)' },
]);

function clone(value) {
  return structuredClone(value);
}

function createInitialState() {
  return {
    seq: 1000,
    csrfToken: 'mock-csrf-0001',
    currentUserAccountId: null,
    delayMs: 0,
    forcedError: null,
    idempotencyCache: new Map(),
    accounts: [
      {
        id: 1,
        username: 'admin@company.local',
        password: 'AdminRoster#2026',
        employeeId: 101,
        displayName: 'Asha Rao',
        roles: ['ADMIN'],
        permissions: [...ALL_ADMIN_PERMISSIONS],
        scopes: ['ORG', 'OWN'],
        active: true,
      },
      {
        id: 2,
        username: 'lead@company.local',
        password: 'TeamLead#2026',
        employeeId: 102,
        displayName: 'Liam Chen',
        roles: ['TEAM_LEAD'],
        permissions: [...TEAM_LEAD_PERMISSIONS],
        scopes: ['TEAM:1', 'OWN'],
        active: true,
      },
      {
        id: 3,
        username: 'member@company.local',
        password: 'MemberRoster#2026',
        employeeId: 103,
        displayName: 'Maya Patel',
        roles: ['MEMBER'],
        permissions: [...MEMBER_PERMISSIONS],
        scopes: ['OWN'],
        active: true,
      },
      {
        id: 4,
        username: 'approver@company.local',
        password: 'Approver#2026',
        employeeId: 104,
        displayName: 'Noah Brooks',
        roles: ['MEMBER'],
        permissions: [...APPROVER_PERMISSIONS],
        scopes: ['ORG', 'OWN'],
        active: true,
      },
      {
        id: 5,
        username: 'auditor@company.local',
        password: 'Auditor#2026',
        employeeId: 105,
        displayName: 'Elena Vance',
        roles: ['MEMBER'],
        permissions: [...AUDITOR_PERMISSIONS],
        scopes: ['ORG', 'OWN'],
        active: true,
      },
    ],
    roles: [
      { id: 1, code: 'ADMIN', name: 'Administrator' },
      { id: 2, code: 'TEAM_LEAD', name: 'Team Lead' },
      { id: 3, code: 'MEMBER', name: 'Member' },
    ],
    teams: [
      { id: 1, code: 'CORE-OPS', name: 'Core Operations', active: true },
      { id: 2, code: 'PAYMENTS', name: 'Payments Platform', active: true },
    ],
    teamLeadCollections: {
      1: { etag: '"tl-col-1-v1"' },
      2: { etag: '"tl-col-2-v1"' },
    },
    teamLeadAssignments: [
      {
        id: 11,
        teamId: 1,
        employeeId: 102,
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        assignedByUserAccountId: 1,
        rowVersion: 1,
      },
    ],
    employees: [
      {
        id: 101,
        employeeCode: 'EMP-101',
        firstName: 'Asha',
        lastName: 'Rao',
        displayName: 'Asha Rao',
        workEmail: 'admin@company.local',
        active: true,
        employmentStartDate: '2023-03-01',
        employmentEndDate: null,
        rotationEligibleFrom: '2024-01-01',
        rotationEligibleTo: null,
        rowVersion: 1,
      },
      {
        id: 102,
        employeeCode: 'EMP-102',
        firstName: 'Liam',
        lastName: 'Chen',
        displayName: 'Liam Chen',
        workEmail: 'lead@company.local',
        active: true,
        employmentStartDate: '2023-06-15',
        employmentEndDate: null,
        rotationEligibleFrom: '2024-01-01',
        rotationEligibleTo: null,
        rowVersion: 1,
      },
      {
        id: 103,
        employeeCode: 'EMP-103',
        firstName: 'Maya',
        lastName: 'Patel',
        displayName: 'Maya Patel',
        workEmail: 'member@company.local',
        active: true,
        employmentStartDate: '2024-02-01',
        employmentEndDate: null,
        rotationEligibleFrom: '2024-02-01',
        rotationEligibleTo: null,
        rowVersion: 1,
      },
      {
        id: 104,
        employeeCode: 'EMP-104',
        firstName: 'Noah',
        lastName: 'Brooks',
        displayName: 'Noah Brooks',
        workEmail: 'approver@company.local',
        active: true,
        employmentStartDate: '2023-09-10',
        employmentEndDate: null,
        rotationEligibleFrom: null,
        rotationEligibleTo: null,
        rowVersion: 1,
      },
      {
        id: 105,
        employeeCode: 'EMP-105',
        firstName: 'Elena',
        lastName: 'Vance',
        displayName: 'Elena Vance',
        workEmail: 'auditor@company.local',
        active: true,
        employmentStartDate: '2024-05-01',
        employmentEndDate: null,
        rotationEligibleFrom: null,
        rotationEligibleTo: null,
        rowVersion: 1,
      },
    ],
    memberships: [
      { id: 1, employeeId: 101, teamId: 1, effectiveFrom: '2024-01-01', effectiveTo: null, status: 'ACTIVE' },
      { id: 2, employeeId: 102, teamId: 1, effectiveFrom: '2024-01-01', effectiveTo: null, status: 'ACTIVE' },
      { id: 3, employeeId: 103, teamId: 1, effectiveFrom: '2024-02-01', effectiveTo: null, status: 'ACTIVE' },
      { id: 4, employeeId: 104, teamId: 2, effectiveFrom: '2024-01-01', effectiveTo: null, status: 'ACTIVE' },
      { id: 5, employeeId: 105, teamId: 2, effectiveFrom: '2024-05-01', effectiveTo: null, status: 'ACTIVE' },
    ],
    roleAssignments: [
      { id: 1, employeeId: 101, roleId: 1, effectiveFrom: '2024-01-01', effectiveTo: null },
      { id: 2, employeeId: 102, roleId: 2, effectiveFrom: '2024-01-01', effectiveTo: null },
      { id: 3, employeeId: 103, roleId: 3, effectiveFrom: '2024-02-01', effectiveTo: null },
      { id: 4, employeeId: 104, roleId: 3, effectiveFrom: '2024-01-01', effectiveTo: null },
      { id: 5, employeeId: 105, roleId: 3, effectiveFrom: '2024-05-01', effectiveTo: null },
    ],
    approvalGrants: [
      {
        id: 1,
        userAccountId: 4,
        scopeType: 'ORGANISATION',
        scopeId: null,
        validFrom: '2026-01-01',
        validUntil: '2027-12-31',
        reason: 'Designated holiday replacement approver',
        status: 'ACTIVE',
        rowVersion: 1,
      },
    ],
    holidays: [
      {
        id: 201,
        name: 'Winter Holiday Day 1',
        holidayDate: '2026-12-25',
        primaryCount: 1,
        standbyCount: 1,
        dutyWindowStart: '2026-12-25T00:00:00Z',
        dutyWindowEnd: '2026-12-25T23:59:59Z',
        status: 'ACTIVE',
        rowVersion: 1,
      },
      {
        id: 202,
        name: 'New Year Support Day',
        holidayDate: '2027-01-01',
        primaryCount: 1,
        standbyCount: 1,
        dutyWindowStart: '2027-01-01T00:00:00Z',
        dutyWindowEnd: '2027-01-01T23:59:59Z',
        status: 'ACTIVE',
        rowVersion: 1,
      },
    ],
    availability: [
      {
        id: 301,
        employeeId: 103,
        availabilityType: 'UNAVAILABLE',
        startDate: '2026-12-31',
        endDate: '2027-01-02',
        reasonCode: 'FAMILY_TRAVEL',
        note: 'Out of region over New Year',
        status: 'ACTIVE',
        rowVersion: 1,
      },
    ],
    rosterPeriods: [
      {
        id: 401,
        periodCode: 'HOL-2026-Q4',
        periodName: 'Year-End Holidays 2026/27',
        startDate: '2026-12-20',
        endDate: '2027-01-05',
        status: 'OPEN',
      },
    ],
    rosterVersions: [
      {
        id: 501,
        rosterPeriodId: 401,
        versionNumber: 1,
        status: 'PUBLISHED',
        parentVersionId: null,
        publishedByUserAccountId: 1,
        revisedByUserAccountId: null,
        rowVersion: 1,
      },
      {
        id: 502,
        rosterPeriodId: 401,
        versionNumber: 2,
        status: 'DRAFT',
        parentVersionId: 501,
        publishedByUserAccountId: null,
        revisedByUserAccountId: 1,
        rowVersion: 1,
      },
    ],
    generationRuns: [
      {
        id: 601,
        rosterPeriodId: 401,
        rosterVersionId: 501,
        runNumber: 1,
        algorithmVersion: 'FDR02-v1',
        policyVersion: 'PO-2026',
        status: 'SUCCEEDED',
        feasibilitySummary: 'All 4 configured Primary/Standby slots filled using chronological FDR-02 workload ordering.',
        explanations: [
          'Maya Patel selected for Winter Holiday Day 1 Primary #1 (0 prior Primary credits).',
          'Liam Chen selected for Winter Holiday Day 1 Standby #1 (0 prior Primary credits).',
        ],
      },
    ],
    assignments: [
      {
        id: 701,
        rosterPeriodId: 401,
        rosterVersionId: 501,
        holidayId: 201,
        holidayName: 'Winter Holiday Day 1',
        holidayDate: '2026-12-25',
        slotType: 'PRIMARY',
        slotNumber: 1,
        employeeId: 103,
        employeeDisplayName: 'Maya Patel',
        origin: 'AUTO',
        status: 'PUBLISHED',
      },
      {
        id: 702,
        rosterPeriodId: 401,
        rosterVersionId: 501,
        holidayId: 201,
        holidayName: 'Winter Holiday Day 1',
        holidayDate: '2026-12-25',
        slotType: 'STANDBY',
        slotNumber: 1,
        employeeId: 102,
        employeeDisplayName: 'Liam Chen',
        origin: 'AUTO',
        status: 'PUBLISHED',
      },
      {
        id: 703,
        rosterPeriodId: 401,
        rosterVersionId: 501,
        holidayId: 202,
        holidayName: 'New Year Support Day',
        holidayDate: '2027-01-01',
        slotType: 'PRIMARY',
        slotNumber: 1,
        employeeId: 104,
        employeeDisplayName: 'Noah Brooks',
        origin: 'AUTO',
        status: 'PUBLISHED',
      },
      {
        id: 704,
        rosterPeriodId: 401,
        rosterVersionId: 501,
        holidayId: 202,
        holidayName: 'New Year Support Day',
        holidayDate: '2027-01-01',
        slotType: 'STANDBY',
        slotNumber: 1,
        employeeId: 101,
        employeeDisplayName: 'Asha Rao',
        origin: 'AUTO',
        status: 'PUBLISHED',
      },
      {
        id: 705,
        rosterPeriodId: 401,
        rosterVersionId: 502,
        holidayId: 201,
        holidayName: 'Winter Holiday Day 1',
        holidayDate: '2026-12-25',
        slotType: 'PRIMARY',
        slotNumber: 1,
        employeeId: 103,
        employeeDisplayName: 'Maya Patel',
        origin: 'AUTO',
        status: 'PROPOSED',
      },
    ],
    replacementRequests: [
      {
        id: 801,
        requestCode: 'REP-2026-001',
        originalAssignmentId: 701,
        requestedForEmployeeId: 103,
        requestedForDisplayName: 'Maya Patel',
        requesterUserAccountId: 3,
        requesterDisplayName: 'Maya Patel',
        holidayDate: '2026-12-25',
        slotType: 'PRIMARY',
        slotNumber: 1,
        requestReason: 'Scheduled medical procedure on 25 Dec',
        status: 'AWAITING_MANAGER_DECISION',
        staffingGap: false,
        suggestedStandbyAssignmentId: 702,
        selectedReplacementEmployeeId: null,
        selectedReplacementDisplayName: null,
        submittedAtUtc: '2026-11-20T09:00:00Z',
        resolvedAtUtc: null,
        decisions: [],
        rowVersion: 1,
      },
    ],
    standbyActivations: [],
    handoverReports: [
      {
        id: 901,
        assignmentId: 701,
        authoredByUserAccountId: 3,
        authoredByDisplayName: 'Maya Patel',
        summary: 'Pre-holiday runbook verified and on-call escalation tree confirmed.',
        status: 'SUBMITTED',
        supersedesHandoverReportId: null,
        createdAtUtc: '2026-11-21T10:15:00Z',
        submittedAtUtc: '2026-11-21T10:15:00Z',
        items: [
          {
            itemType: 'REFERENCE',
            title: 'Incident escalation link',
            content: 'Primary bridge channel #holiday-support-ops is active.',
          },
        ],
      },
    ],
    notifications: [
      {
        id: 951,
        userAccountId: 4,
        title: 'Replacement decision required',
        message: 'Maya Patel requested replacement for Winter Holiday Day 1 (2026-12-25).',
        eventType: 'REPLACEMENT_SUBMITTED',
        targetType: 'REPLACEMENT_REQUEST',
        targetId: 801,
        createdAtUtc: '2026-11-20T09:01:00Z',
        readAtUtc: null,
      },
      {
        id: 952,
        userAccountId: 3,
        title: 'Schedule v1 published',
        message: 'Year-End Holidays 2026/27 (HOL-2026-Q4) has been published.',
        eventType: 'ROSTER_PUBLISHED',
        targetType: 'ROSTER_PERIOD',
        targetId: 401,
        createdAtUtc: '2026-11-19T14:00:00Z',
        readAtUtc: null,
      },
      {
        id: 953,
        userAccountId: 1,
        title: 'Draft revision v2 ready for review',
        message: 'A provisional draft for Year-End Holidays 2026/27 requires review before publication.',
        eventType: 'ROSTER_DRAFT_READY',
        targetType: 'ROSTER_PERIOD',
        targetId: 401,
        createdAtUtc: '2026-11-21T08:30:00Z',
        readAtUtc: null,
      },
      {
        id: 954,
        userAccountId: 1,
        title: 'Replacement request submitted',
        message: 'Maya Patel reported unavailability for Winter Holiday Day 1 (2026-12-25).',
        eventType: 'REPLACEMENT_SUBMITTED',
        targetType: 'REPLACEMENT_REQUEST',
        targetId: 801,
        createdAtUtc: '2026-11-20T09:01:00Z',
        readAtUtc: null,
      },
      {
        id: 955,
        userAccountId: 1,
        title: 'Schedule v1 published',
        message: 'Year-End Holidays 2026/27 (HOL-2026-Q4) was published.',
        eventType: 'ROSTER_PUBLISHED',
        targetType: 'ROSTER_PERIOD',
        targetId: 401,
        createdAtUtc: '2026-11-19T14:00:00Z',
        readAtUtc: '2026-11-19T14:15:00Z',
      },
      {
        id: 956,
        userAccountId: 2,
        title: 'Core Operations replacement pending',
        message: 'Maya Patel submitted a replacement request for Winter Holiday Day 1 (2026-12-25).',
        eventType: 'REPLACEMENT_SUBMITTED',
        targetType: 'REPLACEMENT_REQUEST',
        targetId: 801,
        createdAtUtc: '2026-11-20T09:02:00Z',
        readAtUtc: null,
      },
      {
        id: 957,
        userAccountId: 2,
        title: 'Schedule v1 published',
        message: 'Year-End Holidays 2026/27 includes Core Operations Primary and Standby assignments.',
        eventType: 'ROSTER_PUBLISHED',
        targetType: 'ROSTER_PERIOD',
        targetId: 401,
        createdAtUtc: '2026-11-19T14:00:00Z',
        readAtUtc: null,
      },
      {
        id: 958,
        userAccountId: 5,
        title: 'Published roster audit record created',
        message: 'Year-End Holidays 2026/27 (v1) publication was recorded in the audit log.',
        eventType: 'ROSTER_PUBLISHED',
        targetType: 'ROSTER_PERIOD',
        targetId: 401,
        createdAtUtc: '2026-11-19T14:01:00Z',
        readAtUtc: null,
      },
    ],
    helpCategories: [
      { id: 1, name: 'Getting Started' },
      { id: 2, name: 'Replacements & Standby' },
    ],
    helpArticles: [
      {
        id: 1,
        title: 'How Replacement Approval & Recusal Work',
        summary: 'Explains one-way replacement requests, scoped approval grants, and automatic recusal.',
        categoryId: 2,
        categoryName: 'Replacements & Standby',
        visibleRoleCodes: ['ADMIN', 'TEAM_LEAD', 'MEMBER'],
        publicationStatus: 'PUBLISHED',
        versionNumber: 1,
        publishedAtUtc: '2026-11-01T08:00:00Z',
        content: '# Replacement Workflow\n\n- Submitting an unavailability request keeps your published assignment active until an unconflicted Manager approves.\n- Requesters, affected assignees, and listed candidates are automatically recused from deciding.',
      },
      {
        id: 2,
        title: 'Roster Drafts vs Published Versions',
        summary: 'Drafts are provisional; only published Primary slots count toward official workload.',
        categoryId: 1,
        categoryName: 'Getting Started',
        visibleRoleCodes: ['ADMIN', 'TEAM_LEAD', 'MEMBER'],
        publicationStatus: 'PUBLISHED',
        versionNumber: 1,
        publishedAtUtc: '2026-11-01T08:00:00Z',
        content: '# Drafts vs Published\n\n- Draft versions never alter official Primary credit.\n- Post-publication edits require a reasoned Roster Revision and a separate publisher.',
      },
    ],
    auditEvents: [
      {
        id: 1,
        occurredAtUtc: '2026-11-19T14:00:00Z',
        actorUserAccountId: 1,
        actorDisplayName: 'Asha Rao',
        actorType: 'USER',
        action: 'ROSTER_VERSION_PUBLISHED',
        targetType: 'ROSTER_VERSION',
        targetId: 501,
        reason: 'Initial Q4 holiday roster publication',
        beforeReference: 'DRAFT v1',
        afterReference: 'PUBLISHED v1',
        correlationId: 'mock-corr-001',
      },
    ],
    onboardingByAccount: {},
  };
}

let state = createInitialState();

export function resetMockState() {
  state = createInitialState();
}

export function configureMockBehavior({ delayMs = 0, forcedError = null } = {}) {
  state.delayMs = Math.max(0, Number(delayMs) || 0);
  state.forcedError = forcedError;
}

export function getMockStateSnapshot() {
  return clone({
    currentUserAccountId: state.currentUserAccountId,
    csrfToken: state.csrfToken,
    employeesCount: state.employees.length,
    teamsCount: state.teams.length,
    holidaysCount: state.holidays.length,
    replacementRequestsCount: state.replacementRequests.length,
    auditEventsCount: state.auditEvents.length,
  });
}

function nextId() {
  state.seq += 1;
  return state.seq;
}

function nowUtc() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function makeResponse(status, body = null, extraHeaders = {}) {
  const headerMap = new Map(Object.entries(extraHeaders).map(([k, v]) => [k.toLowerCase(), v]));
  if (body !== null && !headerMap.has('content-type')) {
    headerMap.set('content-type', 'application/json');
  }
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get(name) {
        return headerMap.get(String(name).toLowerCase()) ?? null;
      },
    },
    async text() {
      return body === null ? '' : JSON.stringify(body);
    },
  };
}

function makeError(status, code, message, fieldErrors = []) {
  return makeResponse(status, {
    code,
    message,
    fieldErrors,
    correlationId: `mock-corr-${nextId()}`,
    timestamp: nowUtc(),
  });
}

function paginate(items, query) {
  const pageNum = Math.max(0, Number(query?.page ?? 0) || 0);
  const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize ?? 25) || 25));
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const slice = items.slice(pageNum * pageSize, pageNum * pageSize + pageSize);
  return {
    items: clone(slice),
    page: {
      number: pageNum,
      size: pageSize,
      totalElements,
      totalPages,
    },
  };
}

function getAuthAccount() {
  if (state.currentUserAccountId == null) return null;
  return state.accounts.find((a) => a.id === state.currentUserAccountId) || null;
}

function hasPerm(account, perm) {
  return Boolean(account && Array.isArray(account.permissions) && account.permissions.includes(perm));
}

function hasAnyPerm(account, perms) {
  return perms.some((p) => hasPerm(account, p));
}

function hasOrgScope(account) {
  return Boolean(account?.scopes?.includes('ORG'));
}

function getScopedTeamIds(account) {
  if (!account) return [];
  if (hasOrgScope(account)) return state.teams.map((t) => t.id);
  const ids = [];
  for (const s of account.scopes || []) {
    if (String(s).startsWith('TEAM:')) {
      const id = Number(String(s).slice(5));
      if (!Number.isNaN(id)) ids.push(id);
    }
  }
  return ids;
}

function recordAudit(account, action, targetType, targetId, reason = null, beforeRef = null, afterRef = null) {
  state.auditEvents.unshift({
    id: nextId(),
    occurredAtUtc: nowUtc(),
    actorUserAccountId: account?.id ?? null,
    actorDisplayName: account?.displayName ?? 'System',
    actorType: account ? 'USER' : 'SYSTEM',
    action,
    targetType,
    targetId,
    reason,
    beforeReference: beforeRef,
    afterReference: afterRef,
    correlationId: `mock-corr-${nextId()}`,
  });
}

const utf8Encoder = new TextEncoder();

function utf8Bytes(value) {
  return utf8Encoder.encode(String(value ?? '')).length;
}

function getScopedEmployeeIds(account) {
  if (!account) return new Set();
  if (hasOrgScope(account)) return null;
  const teamIds = getScopedTeamIds(account);
  const ids = new Set();
  if (account.employeeId != null) ids.add(account.employeeId);
  if (teamIds.length) {
    for (const m of state.memberships) {
      if (teamIds.includes(m.teamId) && m.status === 'ACTIVE') {
        ids.add(m.employeeId);
      }
    }
  }
  return ids;
}

function canReadEmployeeInScope(account, employeeId) {
  const visible = getScopedEmployeeIds(account);
  return visible === null || visible.has(employeeId);
}

function isEmployeeEligibleOnDate(emp, holidayDate) {
  if (!emp || !emp.active) return false;
  if (emp.employmentStartDate && holidayDate < emp.employmentStartDate) return false;
  if (emp.employmentEndDate && holidayDate > emp.employmentEndDate) return false;
  if (!emp.rotationEligibleFrom || holidayDate < emp.rotationEligibleFrom) return false;
  if (emp.rotationEligibleTo && holidayDate > emp.rotationEligibleTo) return false;
  return true;
}

function hasUnavailableOverlapOnDate(employeeId, holidayDate) {
  return state.availability.some(
    (av) =>
      av.employeeId === employeeId &&
      av.status === 'ACTIVE' &&
      av.availabilityType === 'UNAVAILABLE' &&
      av.startDate <= holidayDate &&
      av.endDate >= holidayDate
  );
}

function getRoleWalkthroughSpec(roleCode) {
  if (roleCode === 'ADMIN') {
    return {
      walkthroughId: 1,
      roleCode: 'ADMIN',
      title: 'Administrator Setup & Publishing Tour',
      description: 'Walk through people & teams, holiday staffing setup, draft generation, publishing, and audit governance.',
      steps: [
        {
          stepNumber: 1,
          title: 'Manage people, teams, and invitations',
          instructionText: 'Review employee employment dates, rotation eligibility windows, team memberships, and pending account invitations.',
          contextKey: 'nav-employees',
        },
        {
          stepNumber: 2,
          title: 'Configure holidays and explicit staffing counts',
          instructionText: 'Set exact Primary and Standby staffing counts for each holiday before generating a draft schedule.',
          contextKey: 'nav-holidays',
        },
        {
          stepNumber: 3,
          title: 'Inspect team availability',
          instructionText: 'Availability declarations apply immediately to future planning and never overwrite published assignments.',
          contextKey: 'nav-availability',
        },
        {
          stepNumber: 4,
          title: 'Generate and review a draft schedule',
          instructionText: 'Use Schedules to generate a provisional draft, inspect fairness explanations, and resolve any staffing gaps.',
          contextKey: 'nav-roster',
        },
        {
          stepNumber: 5,
          title: 'Visualize coverage on the Schedule Calendar',
          instructionText: 'Switch across Month, Week, Day, Agenda, and Team Grid views to verify coverage and inspect individual shifts.',
          contextKey: 'nav-calendar',
        },
        {
          stepNumber: 6,
          title: 'Administer scoped approval authority',
          instructionText: 'Grant or revoke time-bounded replacement approval authority; self-granting is strictly prohibited.',
          contextKey: 'nav-authority',
        },
        {
          stepNumber: 7,
          title: 'Review audit events and notifications',
          instructionText: 'Track roster publications, reasoned revisions, and operational decisions from the Audit Log and header notifications.',
          contextKey: 'nav-audit',
        },
      ],
    };
  }

  if (roleCode === 'TEAM_LEAD') {
    return {
      walkthroughId: 2,
      roleCode: 'TEAM_LEAD',
      title: 'Team Lead Coordination Tour',
      description: 'Coordinate team schedules, review availability, monitor replacement requests, and read shift notes.',
      steps: [
        {
          stepNumber: 1,
          title: 'Monitor your team overview',
          instructionText: 'Your Overview surfaces upcoming holidays, active team schedules, and pending replacement requests in your team scope.',
          contextKey: 'nav-overview',
        },
        {
          stepNumber: 2,
          title: 'Check team coverage on the Schedule Calendar',
          instructionText: 'Use the Team Grid and Week views to spot Primary, Standby, and unavailability conflicts across your team.',
          contextKey: 'nav-calendar',
        },
        {
          stepNumber: 3,
          title: 'Coordinate team availability',
          instructionText: 'Review upcoming unavailability declarations early so planning drafts reflect accurate availability.',
          contextKey: 'nav-availability',
        },
        {
          stepNumber: 4,
          title: 'Follow replacement requests',
          instructionText: 'Track one-way replacement requests for your team; approval decisions require an active approval grant and no conflict.',
          contextKey: 'nav-replacements',
        },
        {
          stepNumber: 5,
          title: 'Review shift handover notes',
          instructionText: 'Read operational handover notes and addendums before and after holiday coverage windows.',
          contextKey: 'nav-handover',
        },
      ],
    };
  }

  return {
    walkthroughId: 3,
    roleCode: 'MEMBER',
    title: 'Team Member Holiday Roster Tour',
    description: 'Learn how to manage your availability, inspect published shifts, request replacements, and check handover notes.',
    steps: [
      {
        stepNumber: 1,
        title: 'View your schedule on the Calendar',
        instructionText: 'Inspect your published Primary shifts, Standby designations, and upcoming holidays in Month, Week, Day, or Agenda view.',
        contextKey: 'nav-calendar',
      },
      {
        stepNumber: 2,
        title: 'Declare your holiday availability',
        instructionText: 'Record unavailable or available dates for future planning. Changes never alter already-published shifts automatically.',
        contextKey: 'nav-availability',
      },
      {
        stepNumber: 3,
        title: 'Submit a one-way replacement request',
        instructionText: 'If you cannot cover a published shift, report unavailability—your shift remains yours until a Manager approves a replacement.',
        contextKey: 'nav-replacements',
      },
      {
        stepNumber: 4,
        title: 'Understand Backup & Standby',
        instructionText: 'Standby is backup readiness only; it adds zero Primary workload credit unless formally activated after approval.',
        contextKey: 'nav-standby',
      },
      {
        stepNumber: 5,
        title: 'Read and share shift notes',
        instructionText: 'Review runbooks and escalation details in Shift Notes before a holiday shift begins.',
        contextKey: 'nav-handover',
      },
      {
        stepNumber: 6,
        title: 'Stay updated with notifications',
        instructionText: 'Open the header notification bell anytime to jump directly to schedule publications or request updates.',
        contextKey: 'header-notifications',
      },
    ],
  };
}

function buildOnboardingForAccount(account) {
  if (!state.onboardingByAccount[account.id]) {
    const primaryRole = account.roles[0] || 'MEMBER';
    const spec = getRoleWalkthroughSpec(primaryRole);
    state.onboardingByAccount[account.id] = {
      walkthroughs: [
        {
          walkthroughId: spec.walkthroughId,
          roleCode: spec.roleCode,
          title: spec.title,
          description: spec.description,
          versionNumber: 1,
          status: 'NOT_STARTED',
          currentStep: 0,
          steps: spec.steps,
        },
      ],
    };
  }
  return clone(state.onboardingByAccount[account.id]);
}

function buildSessionPayload(account) {
  return {
    user: {
      id: account.id,
      employeeId: account.employeeId,
      username: account.username,
      displayName: account.displayName,
      roles: [...account.roles],
      permissions: [...account.permissions],
      scopes: [...account.scopes],
    },
    csrfToken: state.csrfToken,
    onboarding: buildOnboardingForAccount(account),
  };
}

function requireIfMatchHeader(headers, expectedEtagOrVersion) {
  const provided = headers['If-Match'];
  if (!provided) {
    return makeError(428, 'PRECONDITION_REQUIRED', 'If-Match header is required for this mutation.');
  }
  const normalizedExpected = typeof expectedEtagOrVersion === 'number'
    ? `"${expectedEtagOrVersion}"`
    : String(expectedEtagOrVersion);
  if (String(provided).trim() !== normalizedExpected) {
    return makeError(409, 'CONCURRENT_MODIFICATION', 'The record was modified by another action. Reload and try again.');
  }
  return null;
}

function intervalsOverlap(aFrom, aTo, bFrom, bTo) {
  const aEnd = aTo || '9999-12-31';
  const bEnd = bTo || '9999-12-31';
  return aFrom <= bEnd && bFrom <= aEnd;
}

function buildRosterPayload(periodId, statusFilter) {
  const period = state.rosterPeriods.find((p) => p.id === periodId);
  if (!period) return null;
  const versions = state.rosterVersions.filter((v) => v.rosterPeriodId === periodId);
  let targetVersion = null;
  if (statusFilter) {
    const matched = versions.filter((v) => v.status === statusFilter);
    if (matched.length) targetVersion = matched[matched.length - 1];
  }
  if (!targetVersion) {
    const pub = versions.filter((v) => v.status === 'PUBLISHED');
    targetVersion = pub.length ? pub[pub.length - 1] : versions[versions.length - 1] || null;
  }
  const versionAssignments = targetVersion
    ? state.assignments.filter((a) => a.rosterVersionId === targetVersion.id)
    : [];

  const slots = [];
  if (targetVersion) {
    for (const holiday of state.holidays) {
      if (holiday.holidayDate < period.startDate || holiday.holidayDate > period.endDate) continue;
      if (holiday.status === 'CANCELLED') continue;
      for (let i = 1; i <= holiday.primaryCount; i += 1) {
        const match = versionAssignments.find(
          (a) => a.holidayId === holiday.id && a.slotType === 'PRIMARY' && a.slotNumber === i
        );
        slots.push({
          id: targetVersion.id * 1000 + slots.length + 1,
          holidayId: holiday.id,
          holidayName: holiday.name,
          holidayDate: holiday.holidayDate,
          slotType: 'PRIMARY',
          slotNumber: i,
          assignmentId: match ? match.id : null,
        });
      }
      for (let i = 1; i <= holiday.standbyCount; i += 1) {
        const match = versionAssignments.find(
          (a) => a.holidayId === holiday.id && a.slotType === 'STANDBY' && a.slotNumber === i
        );
        slots.push({
          id: targetVersion.id * 1000 + slots.length + 1,
          holidayId: holiday.id,
          holidayName: holiday.name,
          holidayDate: holiday.holidayDate,
          slotType: 'STANDBY',
          slotNumber: i,
          assignmentId: match ? match.id : null,
        });
      }
    }
  }

  return {
    period: clone(period),
    versions: clone(versions),
    slots,
    assignments: clone(versionAssignments),
  };
}

export async function mockTransport({ path, method, query = null, headers = {}, body = undefined, signal = undefined }) {
  if (signal?.aborted) {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    throw err;
  }
  if (state.delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, state.delayMs));
  }
  if (signal?.aborted) {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    throw err;
  }
  if (state.forcedError) {
    const errCfg = state.forcedError;
    state.forcedError = null;
    return makeError(errCfg.status ?? 500, errCfg.code ?? 'INTERNAL_ERROR', errCfg.message ?? 'Simulated server error.');
  }

  // CSRF check on all mutations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = headers['X-CSRF-TOKEN'];
    if (!token || token !== state.csrfToken) {
      return makeError(403, 'CSRF_INVALID', 'Missing or invalid CSRF token.');
    }
  }

  // Idempotency key deduplication for mutating commands
  const idempKey = headers['Idempotency-Key'];
  if (idempKey && method === 'POST') {
    const cacheKey = `${method}:${path}:${idempKey}`;
    if (state.idempotencyCache.has(cacheKey)) {
      const cached = state.idempotencyCache.get(cacheKey);
      return makeResponse(cached.status, clone(cached.body));
    }
  }

  const saveIdempotent = (status, resBody) => {
    if (idempKey && method === 'POST') {
      state.idempotencyCache.set(`${method}:${path}:${idempKey}`, { status, body: clone(resBody) });
    }
    return makeResponse(status, resBody);
  };

  // --- AUTH / SESSION ---
  if (method === 'GET' && path === '/session/csrf') {
    state.csrfToken = `mock-csrf-${nextId()}`;
    return makeResponse(200, { csrfToken: state.csrfToken }, { 'Cache-Control': 'no-store' });
  }

  if (method === 'POST' && path === '/session/login') {
    const username = String(body?.username || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const account = state.accounts.find((a) => a.username.toLowerCase() === username && a.password === password);
    if (!account || !account.active) {
      return makeError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
    }
    state.currentUserAccountId = account.id;
    state.csrfToken = `mock-csrf-${nextId()}`;
    return makeResponse(200, buildSessionPayload(account));
  }

  if (method === 'POST' && path === '/session/logout') {
    state.currentUserAccountId = null;
    state.csrfToken = `mock-csrf-${nextId()}`;
    return makeResponse(204, null);
  }

  if (method === 'POST' && path === '/password-reset-requests') {
    return makeResponse(202, {
      message: 'If an eligible account matches that email address, a password reset link has been queued.',
    });
  }

  if (method === 'POST' && path === '/password-resets') {
    const newPassword = String(body?.newPassword || '');
    if (!body?.token || newPassword.length < 12 || utf8Bytes(newPassword) > 72) {
      return makeError(422, 'VALIDATION_ERROR', 'Invalid reset token or password.', [
        { field: 'newPassword', message: 'Password must be 12–72 UTF-8 bytes.' },
      ]);
    }
    state.csrfToken = `mock-csrf-${nextId()}`;
    return makeResponse(204, null);
  }

  if (method === 'POST' && path === '/account-activations') {
    const newPassword = String(body?.newPassword || '');
    if (!body?.token || newPassword.length < 12 || utf8Bytes(newPassword) > 72) {
      return makeError(422, 'VALIDATION_ERROR', 'Invalid activation token or password.', [
        { field: 'newPassword', message: 'Password must be 12–72 UTF-8 bytes.' },
      ]);
    }
    state.csrfToken = `mock-csrf-${nextId()}`;
    return makeResponse(204, null);
  }

  // Protected routes below require session
  const account = getAuthAccount();
  if (!account) {
    return makeError(401, 'UNAUTHENTICATED', 'Authentication required.');
  }

  if (method === 'GET' && path === '/session/me') {
    return makeResponse(200, buildSessionPayload(account));
  }

  if (method === 'POST' && path === '/session/password/change') {
    const { currentPassword, newPassword } = body || {};
    if (currentPassword !== account.password) {
      return makeError(422, 'VALIDATION_ERROR', 'Current password is incorrect.', [
        { field: 'currentPassword', message: 'Current password is incorrect.' },
      ]);
    }
    const nextPw = String(newPassword || '');
    if (nextPw.length < 12 || utf8Bytes(nextPw) > 72) {
      return makeError(422, 'VALIDATION_ERROR', 'New password must be 12–72 UTF-8 bytes.', [
        { field: 'newPassword', message: 'New password must be 12–72 UTF-8 bytes.' },
      ]);
    }
    account.password = nextPw;
    state.csrfToken = `mock-csrf-${nextId()}`;
    return makeResponse(204, null);
  }

  // --- ONBOARDING ---
  if (method === 'GET' && path === '/onboarding/progress') {
    return makeResponse(200, buildOnboardingForAccount(account));
  }

  if ((method === 'PATCH' || method === 'PUT') && path === '/onboarding/progress') {
    const current = buildOnboardingForAccount(account);
    const target = state.onboardingByAccount[account.id]?.walkthroughs?.find(
      (w) => w.walkthroughId === Number(body?.walkthroughId)
    );
    if (target) {
      target.currentStep = Number(body?.currentStep ?? target.currentStep);
      if (body?.status) target.status = body.status;
    }
    return makeResponse(200, buildOnboardingForAccount(account) || current);
  }

  // --- EMPLOYEES ---
  if (method === 'GET' && path === '/employees') {
    if (!hasPerm(account, 'ORG.USER.READ')) return makeError(403, 'FORBIDDEN', 'ORG.USER.READ required.');
    let items = state.employees;
    if (!hasOrgScope(account)) {
      const teamIds = getScopedTeamIds(account);
      if (teamIds.length) {
        const memberEmpIds = new Set(
          state.memberships.filter((m) => teamIds.includes(m.teamId)).map((m) => m.employeeId)
        );
        items = items.filter((e) => memberEmpIds.has(e.id) || e.id === account.employeeId);
      } else {
        items = items.filter((e) => e.id === account.employeeId);
      }
    }
    if (query?.active === true || query?.active === 'true') items = items.filter((e) => e.active);
    if (query?.active === false || query?.active === 'false') items = items.filter((e) => !e.active);
    return makeResponse(200, paginate(items, query));
  }

  if (method === 'POST' && path === '/employees') {
    if (!hasPerm(account, 'ORG.USER.MANAGE') || !hasOrgScope(account)) {
      return makeError(403, 'FORBIDDEN', 'ORG.USER.MANAGE with ORG scope required.');
    }
    if (state.employees.some((e) => e.employeeCode === body?.employeeCode)) {
      return makeError(422, 'VALIDATION_ERROR', 'Employee code already exists.', [
        { field: 'employeeCode', message: 'Employee code must be unique.' },
      ]);
    }
    if (state.employees.some((e) => e.workEmail.toLowerCase() === String(body?.workEmail || '').toLowerCase())) {
      return makeError(422, 'VALIDATION_ERROR', 'Work email already exists.', [
        { field: 'workEmail', message: 'Work email must be unique.' },
      ]);
    }
    const emp = {
      id: nextId(),
      employeeCode: String(body.employeeCode),
      firstName: String(body.firstName),
      lastName: String(body.lastName),
      displayName: `${body.firstName} ${body.lastName}`.trim(),
      workEmail: String(body.workEmail),
      active: true,
      employmentStartDate: body.employmentStartDate,
      employmentEndDate: body.employmentEndDate || null,
      rotationEligibleFrom: body.rotationEligibleFrom || null,
      rotationEligibleTo: body.rotationEligibleTo || null,
      rowVersion: 1,
    };
    state.employees.push(emp);
    recordAudit(account, 'EMPLOYEE_CREATED', 'EMPLOYEE', emp.id, null, null, emp.employeeCode);
    return makeResponse(201, clone(emp), { ETag: `"${emp.rowVersion}"` });
  }

  let m = path.match(/^\/employees\/(\d+)$/);
  if (m) {
    const empId = Number(m[1]);
    const emp = state.employees.find((e) => e.id === empId);
    if (!emp) return makeError(404, 'NOT_FOUND', 'Employee not found.');

    if (method === 'GET') {
      if (!hasPerm(account, 'ORG.USER.READ')) return makeError(403, 'FORBIDDEN', 'ORG.USER.READ required.');
      if (!canReadEmployeeInScope(account, empId)) return makeError(404, 'NOT_FOUND', 'Employee not found.');
      return makeResponse(200, clone(emp), { ETag: `"${emp.rowVersion}"` });
    }

    if (method === 'PATCH') {
      if (!hasPerm(account, 'ORG.USER.MANAGE') || !hasOrgScope(account)) {
        return makeError(403, 'FORBIDDEN', 'ORG.USER.MANAGE with ORG scope required.');
      }
      const preErr = requireIfMatchHeader(headers, emp.rowVersion);
      if (preErr) return preErr;
      Object.assign(emp, {
        employeeCode: body.employeeCode ?? emp.employeeCode,
        firstName: body.firstName ?? emp.firstName,
        lastName: body.lastName ?? emp.lastName,
        workEmail: body.workEmail ?? emp.workEmail,
        employmentStartDate: body.employmentStartDate ?? emp.employmentStartDate,
        employmentEndDate: body.employmentEndDate !== undefined ? body.employmentEndDate : emp.employmentEndDate,
        rotationEligibleFrom: body.rotationEligibleFrom !== undefined ? body.rotationEligibleFrom : emp.rotationEligibleFrom,
        rotationEligibleTo: body.rotationEligibleTo !== undefined ? body.rotationEligibleTo : emp.rotationEligibleTo,
      });
      emp.displayName = `${emp.firstName} ${emp.lastName}`.trim();
      emp.rowVersion += 1;
      recordAudit(account, 'EMPLOYEE_UPDATED', 'EMPLOYEE', emp.id, null, null, `v${emp.rowVersion}`);
      return makeResponse(200, clone(emp), { ETag: `"${emp.rowVersion}"` });
    }
  }

  m = path.match(/^\/employees\/(\d+)\/invitations$/);
  if (m && method === 'POST') {
    if (!hasPerm(account, 'ACCOUNT.INVITE') || !hasOrgScope(account)) {
      return makeError(403, 'FORBIDDEN', 'ACCOUNT.INVITE with ORG scope required.');
    }
    const empId = Number(m[1]);
    const emp = state.employees.find((e) => e.id === empId);
    if (!emp) return makeError(404, 'NOT_FOUND', 'Employee not found.');
    recordAudit(account, 'ACCOUNT_INVITED', 'EMPLOYEE', emp.id, null, null, emp.workEmail);
    return saveIdempotent(202, { message: 'Account invitation queued.', employeeId: emp.id });
  }

  m = path.match(/^\/employees\/(\d+)\/account-status$/);
  if (m && method === 'PUT') {
    if (!hasPerm(account, 'ACCOUNT.STATUS.MANAGE') || !hasOrgScope(account)) {
      return makeError(403, 'FORBIDDEN', 'ACCOUNT.STATUS.MANAGE with ORG scope required.');
    }
    const empId = Number(m[1]);
    const emp = state.employees.find((e) => e.id === empId);
    if (!emp) return makeError(404, 'NOT_FOUND', 'Employee not found.');
    const preErr = requireIfMatchHeader(headers, emp.rowVersion);
    if (preErr) return preErr;
    const prev = emp.active;
    emp.active = Boolean(body?.active);
    emp.rowVersion += 1;
    const linked = state.accounts.find((a) => a.employeeId === emp.id);
    if (linked) linked.active = emp.active;
    recordAudit(account, 'ACCOUNT_STATUS_CHANGED', 'EMPLOYEE', emp.id, null, String(prev), String(emp.active));
    return makeResponse(200, clone(emp), { ETag: `"${emp.rowVersion}"` });
  }

  // --- TEAMS & TEAM LEADS ---
  if (method === 'GET' && path === '/teams') {
    if (!hasPerm(account, 'ORG.USER.READ')) return makeError(403, 'FORBIDDEN', 'ORG.USER.READ required.');
    const allowedTeamIds = getScopedTeamIds(account);
    const visibleTeams = hasOrgScope(account)
      ? state.teams
      : state.teams.filter((t) => allowedTeamIds.includes(t.id));
    return makeResponse(200, paginate(visibleTeams, query));
  }

  if (method === 'POST' && path === '/teams') {
    if (!hasPerm(account, 'ORG.TEAM.MANAGE') || !hasOrgScope(account)) {
      return makeError(403, 'FORBIDDEN', 'ORG.TEAM.MANAGE with ORG scope required.');
    }
    const name = String(body?.name || '').trim();
    if (!name || name.length > 120) {
      return makeError(422, 'VALIDATION_ERROR', 'Team name must be 1–120 characters.', [
        { field: 'name', message: 'Team name must be between 1 and 120 characters.' },
      ]);
    }
    const team = { id: nextId(), code: String(body.code).trim(), name, active: true };
    state.teams.push(team);
    state.teamLeadCollections[team.id] = { etag: `"tl-col-${team.id}-v1"` };
    recordAudit(account, 'TEAM_CREATED', 'TEAM', team.id, null, null, team.code);
    return makeResponse(201, clone(team));
  }

  m = path.match(/^\/teams\/(\d+)\/team-lead-assignments$/);
  if (m) {
    const teamId = Number(m[1]);
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) return makeError(404, 'NOT_FOUND', 'Team not found.');
    if (!state.teamLeadCollections[teamId]) state.teamLeadCollections[teamId] = { etag: `"tl-col-${teamId}-v1"` };

    if (method === 'GET') {
      if (!hasPerm(account, 'ORG.USER.READ')) return makeError(403, 'FORBIDDEN', 'ORG.USER.READ required.');
      let items = state.teamLeadAssignments.filter((a) => a.teamId === teamId);
      if (!hasOrgScope(account)) {
        const scopedTeams = getScopedTeamIds(account);
        if (!scopedTeams.includes(teamId)) {
          items = items.filter((a) => a.employeeId === account.employeeId);
        }
      }
      return makeResponse(200, paginate(items, query), { ETag: state.teamLeadCollections[teamId].etag });
    }

    if (method === 'POST') {
      if (!account.roles.includes('ADMIN') || !hasPerm(account, 'ORG.TEAM_LEAD.MANAGE') || !hasOrgScope(account)) {
        return makeError(403, 'FORBIDDEN', 'ADMIN with ORG.TEAM_LEAD.MANAGE and ORG scope required.');
      }
      const preErr = requireIfMatchHeader(headers, state.teamLeadCollections[teamId].etag);
      if (preErr) return preErr;
      const empId = Number(body?.employeeId);
      const effFrom = String(body?.effectiveFrom || '');
      const hasOverlap = state.teamLeadAssignments.some(
        (a) => a.teamId === teamId && intervalsOverlap(a.effectiveFrom, a.effectiveTo, effFrom, null)
      );
      if (hasOverlap) {
        return makeError(422, 'OVERLAPPING_INTERVAL', 'Team Lead assignment overlaps an existing inclusive interval.', [
          { field: 'effectiveFrom', message: 'Overlaps an existing Team Lead assignment.' },
        ]);
      }
      const created = {
        id: nextId(),
        teamId,
        employeeId: empId,
        effectiveFrom: effFrom,
        effectiveTo: null,
        assignedByUserAccountId: account.id,
        rowVersion: 1,
      };
      state.teamLeadAssignments.push(created);
      state.teamLeadCollections[teamId].etag = `"tl-col-${teamId}-v${nextId()}"`;
      recordAudit(account, 'TEAM_LEAD_ASSIGNED', 'TEAM_LEAD_ASSIGNMENT', created.id, null, null, `Employee #${empId}`);
      return makeResponse(201, clone(created), { ETag: state.teamLeadCollections[teamId].etag });
    }
  }

  m = path.match(/^\/teams\/(\d+)\/team-lead-assignments\/(\d+)\/replacement$/);
  if (m && method === 'POST') {
    const teamId = Number(m[1]);
    const assignmentId = Number(m[2]);
    if (!account.roles.includes('ADMIN') || !hasPerm(account, 'ORG.TEAM_LEAD.MANAGE') || !hasOrgScope(account)) {
      return makeError(403, 'FORBIDDEN', 'ADMIN with ORG.TEAM_LEAD.MANAGE and ORG scope required.');
    }
    const col = state.teamLeadCollections[teamId];
    if (!col) return makeError(404, 'NOT_FOUND', 'Team not found.');
    const preErr = requireIfMatchHeader(headers, col.etag);
    if (preErr) return preErr;
    const current = state.teamLeadAssignments.find((a) => a.id === assignmentId && a.teamId === teamId);
    if (!current) return makeError(404, 'NOT_FOUND', 'Team Lead assignment not found.');
    const effFrom = String(body?.effectiveFrom || '');
    const prevDate = new Date(`${effFrom}T00:00:00Z`);
    prevDate.setUTCDate(prevDate.getUTCDate() - 1);
    current.effectiveTo = prevDate.toISOString().slice(0, 10);
    current.rowVersion += 1;
    const replacement = {
      id: nextId(),
      teamId,
      employeeId: Number(body.employeeId),
      effectiveFrom: effFrom,
      effectiveTo: null,
      assignedByUserAccountId: account.id,
      rowVersion: 1,
    };
    state.teamLeadAssignments.push(replacement);
    col.etag = `"tl-col-${teamId}-v${nextId()}"`;
    recordAudit(account, 'TEAM_LEAD_REPLACED', 'TEAM_LEAD_ASSIGNMENT', replacement.id, null, `#${current.id}`, `#${replacement.id}`);
    return makeResponse(200, clone(replacement), { ETag: col.etag });
  }

  m = path.match(/^\/teams\/(\d+)\/team-lead-assignments\/(\d+)\/terminate$/);
  if (m && method === 'POST') {
    const teamId = Number(m[1]);
    const assignmentId = Number(m[2]);
    if (!account.roles.includes('ADMIN') || !hasPerm(account, 'ORG.TEAM_LEAD.MANAGE') || !hasOrgScope(account)) {
      return makeError(403, 'FORBIDDEN', 'ADMIN with ORG.TEAM_LEAD.MANAGE and ORG scope required.');
    }
    const current = state.teamLeadAssignments.find((a) => a.id === assignmentId && a.teamId === teamId);
    if (!current) return makeError(404, 'NOT_FOUND', 'Team Lead assignment not found.');
    const preErr = requireIfMatchHeader(headers, current.rowVersion);
    if (preErr) return preErr;
    if (String(body?.effectiveTo || '') < current.effectiveFrom) {
      return makeError(422, 'VALIDATION_ERROR', 'Termination date cannot precede effectiveFrom.', [
        { field: 'effectiveTo', message: 'Must be on or after effectiveFrom.' },
      ]);
    }
    current.effectiveTo = body.effectiveTo;
    current.rowVersion += 1;
    if (state.teamLeadCollections[teamId]) state.teamLeadCollections[teamId].etag = `"tl-col-${teamId}-v${nextId()}"`;
    recordAudit(account, 'TEAM_LEAD_TERMINATED', 'TEAM_LEAD_ASSIGNMENT', current.id, null, null, current.effectiveTo);
    return makeResponse(200, clone(current), { ETag: `"${current.rowVersion}"` });
  }

  m = path.match(/^\/teams\/(\d+)\/team-lead-assignments\/(\d+)$/);
  if (m && method === 'PATCH') {
    const teamId = Number(m[1]);
    const assignmentId = Number(m[2]);
    if (!account.roles.includes('ADMIN') || !hasPerm(account, 'ORG.TEAM_LEAD.MANAGE') || !hasOrgScope(account)) {
      return makeError(403, 'FORBIDDEN', 'ADMIN with ORG.TEAM_LEAD.MANAGE and ORG scope required.');
    }
    const current = state.teamLeadAssignments.find((a) => a.id === assignmentId && a.teamId === teamId);
    if (!current) return makeError(404, 'NOT_FOUND', 'Team Lead assignment not found.');
    const preErr = requireIfMatchHeader(headers, current.rowVersion);
    if (preErr) return preErr;
    const effFrom = String(body?.effectiveFrom || current.effectiveFrom);
    const effTo = body?.effectiveTo !== undefined ? body.effectiveTo : current.effectiveTo;
    const overlap = state.teamLeadAssignments.some(
      (a) => a.teamId === teamId && a.id !== current.id && intervalsOverlap(a.effectiveFrom, a.effectiveTo, effFrom, effTo)
    );
    if (overlap) {
      return makeError(422, 'OVERLAPPING_INTERVAL', 'Corrected interval overlaps another assignment.', [
        { field: 'effectiveFrom', message: 'Overlaps another Team Lead assignment.' },
      ]);
    }
    current.effectiveFrom = effFrom;
    current.effectiveTo = effTo;
    current.rowVersion += 1;
    if (state.teamLeadCollections[teamId]) state.teamLeadCollections[teamId].etag = `"tl-col-${teamId}-v${nextId()}"`;
    recordAudit(account, 'TEAM_LEAD_CORRECTED', 'TEAM_LEAD_ASSIGNMENT', current.id);
    return makeResponse(200, clone(current), { ETag: `"${current.rowVersion}"` });
  }

  // --- MEMBERSHIPS & ROLES ---
  m = path.match(/^\/employees\/(\d+)\/team-memberships$/);
  if (m) {
    const empId = Number(m[1]);
    if (method === 'GET') {
      if (!hasPerm(account, 'ORG.USER.READ')) return makeError(403, 'FORBIDDEN', 'ORG.USER.READ required.');
      if (!canReadEmployeeInScope(account, empId)) return makeError(404, 'NOT_FOUND', 'Employee not found.');
      return makeResponse(200, paginate(state.memberships.filter((x) => x.employeeId === empId), query));
    }
    if (method === 'POST') {
      if (!hasPerm(account, 'ORG.MEMBERSHIP.MANAGE') || !hasOrgScope(account)) {
        return makeError(403, 'FORBIDDEN', 'ORG.MEMBERSHIP.MANAGE with ORG scope required.');
      }
      const created = {
        id: nextId(),
        employeeId: empId,
        teamId: Number(body.teamId),
        effectiveFrom: body.effectiveFrom,
        effectiveTo: body.effectiveTo || null,
        status: 'ACTIVE',
      };
      state.memberships.push(created);
      recordAudit(account, 'TEAM_MEMBERSHIP_CREATED', 'EMPLOYEE', empId, null, null, `Team #${created.teamId}`);
      return makeResponse(201, clone(created));
    }
  }

  if (method === 'GET' && path === '/authorization/roles') {
    return makeResponse(200, paginate(state.roles, query));
  }

  m = path.match(/^\/employees\/(\d+)\/role-assignments$/);
  if (m) {
    const empId = Number(m[1]);
    if (method === 'GET') {
      if (!hasPerm(account, 'ORG.USER.READ')) return makeError(403, 'FORBIDDEN', 'ORG.USER.READ required.');
      if (!canReadEmployeeInScope(account, empId)) return makeError(404, 'NOT_FOUND', 'Employee not found.');
      return makeResponse(200, paginate(state.roleAssignments.filter((r) => r.employeeId === empId), query));
    }
    if (method === 'POST') {
      if (!hasPerm(account, 'ORG.ROLE.MANAGE') || !hasOrgScope(account)) {
        return makeError(403, 'FORBIDDEN', 'ORG.ROLE.MANAGE with ORG scope required.');
      }
      const created = {
        id: nextId(),
        employeeId: empId,
        roleId: Number(body.roleId),
        effectiveFrom: body.effectiveFrom,
        effectiveTo: body.effectiveTo || null,
      };
      state.roleAssignments.push(created);
      recordAudit(account, 'ROLE_ASSIGNED', 'EMPLOYEE', empId, null, null, `Role #${created.roleId}`);
      return makeResponse(201, clone(created));
    }
  }

  // --- APPROVAL GRANTS ---
  if (method === 'GET' && path === '/authorization/approval-grants') {
    if (!hasPerm(account, 'ORG.AUTHORITY.MANAGE') || !hasOrgScope(account)) {
      return makeError(403, 'FORBIDDEN', 'ORG.AUTHORITY.MANAGE with ORG scope required.');
    }
    return makeResponse(200, paginate(state.approvalGrants, query));
  }

  if (method === 'POST' && path === '/authorization/approval-grants') {
    if (!hasPerm(account, 'ORG.AUTHORITY.MANAGE') || !hasOrgScope(account)) {
      return makeError(403, 'FORBIDDEN', 'ORG.AUTHORITY.MANAGE with ORG scope required.');
    }
    if (Number(body?.userAccountId) === account.id) {
      return makeError(422, 'SELF_GRANT_PROHIBITED', 'Cannot grant replacement approval authority to yourself.', [
        { field: 'userAccountId', message: 'Self-granting replacement approval authority is prohibited.' },
      ]);
    }
    const created = {
      id: nextId(),
      userAccountId: Number(body.userAccountId),
      scopeType: body.scopeType,
      scopeId: body.scopeId ?? null,
      validFrom: body.validFrom,
      validUntil: body.validUntil,
      reason: body.reason,
      status: 'ACTIVE',
      rowVersion: 1,
    };
    state.approvalGrants.push(created);
    recordAudit(account, 'APPROVAL_GRANT_CREATED', 'APPROVAL_GRANT', created.id, created.reason);
    return makeResponse(201, clone(created), { ETag: `"${created.rowVersion}"` });
  }

  m = path.match(/^\/authorization\/approval-grants\/(\d+)\/revoke$/);
  if (m && method === 'POST') {
    if (!hasPerm(account, 'ORG.AUTHORITY.MANAGE') || !hasOrgScope(account)) {
      return makeError(403, 'FORBIDDEN', 'ORG.AUTHORITY.MANAGE with ORG scope required.');
    }
    const grant = state.approvalGrants.find((g) => g.id === Number(m[1]));
    if (!grant) return makeError(404, 'NOT_FOUND', 'Approval grant not found.');
    const preErr = requireIfMatchHeader(headers, grant.rowVersion);
    if (preErr) return preErr;
    grant.status = 'REVOKED';
    grant.rowVersion += 1;
    recordAudit(account, 'APPROVAL_GRANT_REVOKED', 'APPROVAL_GRANT', grant.id);
    return makeResponse(204, null);
  }

  // --- HOLIDAYS ---
  if (method === 'GET' && path === '/holidays') {
    if (!hasPerm(account, 'CALENDAR.READ')) return makeError(403, 'FORBIDDEN', 'CALENDAR.READ required.');
    let items = state.holidays;
    if (query?.fromDate) items = items.filter((h) => h.holidayDate >= query.fromDate);
    if (query?.toDate) items = items.filter((h) => h.holidayDate <= query.toDate);
    return makeResponse(200, paginate(items, query));
  }

  if (method === 'POST' && path === '/holidays') {
    if (!hasPerm(account, 'CALENDAR.MANAGE')) return makeError(403, 'FORBIDDEN', 'CALENDAR.MANAGE required.');
    if (state.holidays.some((h) => h.holidayDate === body?.holidayDate && h.name.toLowerCase() === String(body?.name || '').toLowerCase())) {
      return makeError(422, 'DUPLICATE_HOLIDAY', 'A holiday with that name and date already exists.', [
        { field: 'holidayDate', message: 'Duplicate holiday on this date.' },
      ]);
    }
    if (Number(body?.primaryCount) < 1 || Number(body?.standbyCount) < 0) {
      return makeError(422, 'VALIDATION_ERROR', 'Invalid staffing counts.');
    }
    const created = {
      id: nextId(),
      name: String(body.name),
      holidayDate: body.holidayDate,
      primaryCount: Number(body.primaryCount),
      standbyCount: Number(body.standbyCount),
      dutyWindowStart: body.dutyWindowStart || null,
      dutyWindowEnd: body.dutyWindowEnd || null,
      status: 'ACTIVE',
      rowVersion: 1,
    };
    state.holidays.push(created);
    recordAudit(account, 'HOLIDAY_CREATED', 'HOLIDAY', created.id, null, null, created.name);
    return makeResponse(201, clone(created), { ETag: `"${created.rowVersion}"` });
  }

  m = path.match(/^\/holidays\/(\d+)$/);
  if (m && method === 'PATCH') {
    if (!hasPerm(account, 'CALENDAR.MANAGE')) return makeError(403, 'FORBIDDEN', 'CALENDAR.MANAGE required.');
    const holiday = state.holidays.find((h) => h.id === Number(m[1]));
    if (!holiday) return makeError(404, 'NOT_FOUND', 'Holiday not found.');
    const preErr = requireIfMatchHeader(headers, holiday.rowVersion);
    if (preErr) return preErr;
    const isReferencedByPublished = state.assignments.some(
      (a) => a.holidayId === holiday.id && a.status === 'PUBLISHED'
    );
    if (isReferencedByPublished) {
      return makeError(
        409,
        'PUBLISHED_REFERENCE_CONFLICT',
        'Holiday is referenced by a published roster. Use a reasoned Roster Revision instead.'
      );
    }
    Object.assign(holiday, {
      name: body.name ?? holiday.name,
      holidayDate: body.holidayDate ?? holiday.holidayDate,
      primaryCount: body.primaryCount ?? holiday.primaryCount,
      standbyCount: body.standbyCount ?? holiday.standbyCount,
      dutyWindowStart: body.dutyWindowStart !== undefined ? body.dutyWindowStart : holiday.dutyWindowStart,
      dutyWindowEnd: body.dutyWindowEnd !== undefined ? body.dutyWindowEnd : holiday.dutyWindowEnd,
    });
    holiday.rowVersion += 1;
    recordAudit(account, 'HOLIDAY_UPDATED', 'HOLIDAY', holiday.id);
    return makeResponse(200, clone(holiday), { ETag: `"${holiday.rowVersion}"` });
  }

  // --- AVAILABILITY ---
  if (method === 'GET' && path === '/availability') {
    if (!hasAnyPerm(account, ['AVAILABILITY.MANAGE_OWN', 'AVAILABILITY.READ', 'AVAILABILITY.MANAGE_ON_BEHALF'])) {
      return makeError(403, 'FORBIDDEN', 'Availability read permission required.');
    }
    let items = state.availability;
    if (!hasAnyPerm(account, ['AVAILABILITY.READ', 'AVAILABILITY.MANAGE_ON_BEHALF'])) {
      items = items.filter((a) => a.employeeId === account.employeeId);
    } else if (query?.employeeId) {
      items = items.filter((a) => a.employeeId === Number(query.employeeId));
    }
    if (query?.fromDate) items = items.filter((a) => a.endDate >= query.fromDate);
    if (query?.toDate) items = items.filter((a) => a.startDate <= query.toDate);
    return makeResponse(200, paginate(items, query));
  }

  if (method === 'POST' && path === '/availability') {
    if (!hasAnyPerm(account, ['AVAILABILITY.MANAGE_OWN', 'AVAILABILITY.MANAGE_ON_BEHALF'])) {
      return makeError(403, 'FORBIDDEN', 'Availability manage permission required.');
    }
    const targetEmpId = body?.employeeId ? Number(body.employeeId) : account.employeeId;
    const overlap = state.availability.some(
      (a) =>
        a.employeeId === targetEmpId &&
        a.status === 'ACTIVE' &&
        intervalsOverlap(a.startDate, a.endDate, body.startDate, body.endDate)
    );
    if (overlap) {
      return makeError(422, 'OVERLAPPING_AVAILABILITY', 'An active availability declaration overlaps this date range.', [
        { field: 'startDate', message: 'Overlaps an existing active availability record.' },
      ]);
    }
    const created = {
      id: nextId(),
      employeeId: targetEmpId,
      availabilityType: body.availabilityType,
      startDate: body.startDate,
      endDate: body.endDate,
      reasonCode: body.reasonCode || null,
      note: body.note || null,
      status: 'ACTIVE',
      rowVersion: 1,
    };
    state.availability.push(created);
    return makeResponse(201, clone(created), { ETag: `"${created.rowVersion}"` });
  }

  m = path.match(/^\/availability\/(\d+)$/);
  if (m && method === 'PATCH') {
    const rec = state.availability.find((a) => a.id === Number(m[1]));
    if (!rec) return makeError(404, 'NOT_FOUND', 'Availability record not found.');
    const preErr = requireIfMatchHeader(headers, rec.rowVersion);
    if (preErr) return preErr;
    const overlap = state.availability.some(
      (a) =>
        a.id !== rec.id &&
        a.employeeId === rec.employeeId &&
        a.status === 'ACTIVE' &&
        intervalsOverlap(a.startDate, a.endDate, body.startDate, body.endDate)
    );
    if (overlap) {
      return makeError(422, 'OVERLAPPING_AVAILABILITY', 'Updated date range overlaps another active record.', [
        { field: 'startDate', message: 'Overlaps another active availability record.' },
      ]);
    }
    Object.assign(rec, {
      availabilityType: body.availabilityType ?? rec.availabilityType,
      startDate: body.startDate ?? rec.startDate,
      endDate: body.endDate ?? rec.endDate,
      reasonCode: body.reasonCode !== undefined ? body.reasonCode : rec.reasonCode,
      note: body.note !== undefined ? body.note : rec.note,
    });
    rec.rowVersion += 1;
    return makeResponse(200, clone(rec), { ETag: `"${rec.rowVersion}"` });
  }

  m = path.match(/^\/availability\/(\d+)\/withdraw$/);
  if (m && method === 'POST') {
    const rec = state.availability.find((a) => a.id === Number(m[1]));
    if (!rec) return makeError(404, 'NOT_FOUND', 'Availability record not found.');
    const preErr = requireIfMatchHeader(headers, rec.rowVersion);
    if (preErr) return preErr;
    rec.status = 'CANCELLED';
    rec.rowVersion += 1;
    return makeResponse(204, null);
  }

  // --- ROSTER ---
  if (method === 'GET' && path === '/roster-periods') {
    if (!hasPerm(account, 'ROSTER.READ')) return makeError(403, 'FORBIDDEN', 'ROSTER.READ required.');
    return makeResponse(200, paginate(state.rosterPeriods, query));
  }

  if (method === 'POST' && path === '/roster-periods') {
    if (!hasAnyPerm(account, ['ROSTER.GENERATE', 'ROSTER.PUBLISH', 'ROSTER.REVISE'])) {
      return makeError(403, 'FORBIDDEN', 'Roster planning permission required.');
    }
    const created = {
      id: nextId(),
      periodCode: String(body.periodCode),
      periodName: String(body.periodName),
      startDate: body.startDate,
      endDate: body.endDate,
      status: 'OPEN',
    };
    state.rosterPeriods.push(created);
    recordAudit(account, 'ROSTER_PERIOD_CREATED', 'ROSTER_PERIOD', created.id, null, null, created.periodCode);
    return makeResponse(201, clone(created));
  }

  m = path.match(/^\/roster-periods\/(\d+)\/roster$/);
  if (m && method === 'GET') {
    if (!hasPerm(account, 'ROSTER.READ')) return makeError(403, 'FORBIDDEN', 'ROSTER.READ required.');
    const payload = buildRosterPayload(Number(m[1]), query?.status);
    if (!payload) return makeError(404, 'NOT_FOUND', 'Roster period not found.');
    return makeResponse(200, payload);
  }

  m = path.match(/^\/roster-periods\/(\d+)\/generation-runs$/);
  if (m && method === 'GET') {
    if (!hasPerm(account, 'ROSTER.READ')) return makeError(403, 'FORBIDDEN', 'ROSTER.READ required.');
    const runs = state.generationRuns.filter((r) => r.rosterPeriodId === Number(m[1]));
    return makeResponse(200, paginate(runs, query));
  }

  m = path.match(/^\/roster-periods\/(\d+)\/generate$/);
  if (m && method === 'POST') {
    if (!hasPerm(account, 'ROSTER.GENERATE')) return makeError(403, 'FORBIDDEN', 'ROSTER.GENERATE required.');
    const periodId = Number(m[1]);
    const period = state.rosterPeriods.find((p) => p.id === periodId);
    if (!period) return makeError(404, 'NOT_FOUND', 'Roster period not found.');
    const nextVerNum = state.rosterVersions.filter((v) => v.rosterPeriodId === periodId).length + 1;
    const version = {
      id: nextId(),
      rosterPeriodId: periodId,
      versionNumber: nextVerNum,
      status: 'DRAFT',
      parentVersionId: null,
      publishedByUserAccountId: null,
      revisedByUserAccountId: null,
      rowVersion: 1,
    };
    state.rosterVersions.push(version);
    const explanations = [];
    const unresolvedGaps = [];
    let empIdx = 0;
    for (const h of state.holidays) {
      if (h.holidayDate < period.startDate || h.holidayDate > period.endDate || h.status === 'CANCELLED') continue;
      const holidayAssignedIds = new Set();
      const eligibleForDate = state.employees.filter(
        (e) => isEmployeeEligibleOnDate(e, h.holidayDate) && !hasUnavailableOverlapOnDate(e.id, h.holidayDate)
      );
      for (const [slotType, count] of [['PRIMARY', h.primaryCount], ['STANDBY', h.standbyCount]]) {
        for (let slotNum = 1; slotNum <= count; slotNum += 1) {
          const pool = eligibleForDate.filter((e) => !holidayAssignedIds.has(e.id));
          const candidate = pool.length ? pool[empIdx % pool.length] : null;
          if (candidate) {
            holidayAssignedIds.add(candidate.id);
            state.assignments.push({
              id: nextId(),
              rosterPeriodId: periodId,
              rosterVersionId: version.id,
              holidayId: h.id,
              holidayName: h.name,
              holidayDate: h.holidayDate,
              slotType,
              slotNumber: slotNum,
              employeeId: candidate.id,
              employeeDisplayName: candidate.displayName,
              origin: 'AUTO',
              status: 'PROPOSED',
            });
            explanations.push(`${candidate.displayName} proposed for ${h.name} ${slotType} #${slotNum}.`);
            empIdx += 1;
          } else if (slotType === 'PRIMARY') {
            unresolvedGaps.push({
              holidayId: h.id,
              requiredPrimaryCount: h.primaryCount,
              assignedPrimaryCount: holidayAssignedIds.size,
              message: 'No eligible available employee for this holiday slot.',
            });
          }
        }
      }
    }
    const run = {
      id: nextId(),
      rosterPeriodId: periodId,
      rosterVersionId: version.id,
      runNumber: state.generationRuns.filter((r) => r.rosterPeriodId === periodId).length + 1,
      algorithmVersion: body?.algorithmVersion || 'FDR02-v1',
      policyVersion: body?.policyVersion || 'PO-2026',
      status: unresolvedGaps.length ? 'PARTIAL' : 'SUCCEEDED',
      feasibilitySummary: unresolvedGaps.length
        ? 'Draft generated with unresolved staffing gaps.'
        : 'All configured holiday slots filled in provisional draft.',
      explanations,
    };
    state.generationRuns.push(run);
    return saveIdempotent(201, {
      generationRunId: run.id,
      rosterVersion: clone(version),
      feasibilitySummary: run.feasibilitySummary,
      unresolvedGaps,
      explanations,
    });
  }

  m = path.match(/^\/roster-versions\/(\d+)\/assignment-candidates$/);
  if (m && method === 'GET') {
    if (!hasPerm(account, 'ROSTER.MANUAL_ASSIGN')) return makeError(403, 'FORBIDDEN', 'ROSTER.MANUAL_ASSIGN required.');
    const version = state.rosterVersions.find((v) => v.id === Number(m[1]));
    if (!version) return makeError(404, 'NOT_FOUND', 'Roster version not found.');
    if (!['DRAFT', 'REVIEWED'].includes(version.status)) {
      return makeError(422, 'VALIDATION_ERROR', 'Assignment candidates can only be listed for editable draft versions.');
    }
    const period = state.rosterPeriods.find((p) => p.id === version.rosterPeriodId);
    const holidayId = Number(query?.holidayId);
    const slotType = String(query?.slotType || '').toUpperCase();
    const slotNumber = Number(query?.slotNumber);
    const holiday = state.holidays.find((h) => h.id === holidayId);
    if (!holiday || holiday.status === 'CANCELLED' || (period && (holiday.holidayDate < period.startDate || holiday.holidayDate > period.endDate))) {
      return makeError(422, 'VALIDATION_ERROR', 'Holiday is invalid or outside the roster period.');
    }
    if (!['PRIMARY', 'STANDBY'].includes(slotType)) {
      return makeError(422, 'VALIDATION_ERROR', 'slotType must be PRIMARY or STANDBY.');
    }
    const maxSlot = slotType === 'PRIMARY' ? holiday.primaryCount : holiday.standbyCount;
    if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > maxSlot) {
      return makeError(422, 'VALIDATION_ERROR', 'slotNumber is outside configured slot counts for this holiday.');
    }

    const assignedOnHolidayIds = new Set(
      state.assignments
        .filter((a) => a.rosterVersionId === version.id && a.holidayId === holiday.id && a.status !== 'CANCELLED')
        .map((a) => a.employeeId)
    );

    const eligible = state.employees
      .filter(
        (e) =>
          isEmployeeEligibleOnDate(e, holiday.holidayDate) &&
          !hasUnavailableOverlapOnDate(e.id, holiday.holidayDate) &&
          !assignedOnHolidayIds.has(e.id)
      )
      .map((e) => ({ employeeId: e.id, displayName: e.displayName }));
    return makeResponse(200, paginate(eligible, query));
  }

  m = path.match(/^\/roster-versions\/(\d+)\/assignments$/);
  if (m && method === 'POST') {
    if (!hasPerm(account, 'ROSTER.MANUAL_ASSIGN')) return makeError(403, 'FORBIDDEN', 'ROSTER.MANUAL_ASSIGN required.');
    const version = state.rosterVersions.find((v) => v.id === Number(m[1]));
    if (!version) return makeError(404, 'NOT_FOUND', 'Roster version not found.');
    const preErr = requireIfMatchHeader(headers, version.rowVersion);
    if (preErr) return preErr;
    const holiday = state.holidays.find((h) => h.id === Number(body.holidayId));
    const emp = state.employees.find((e) => e.id === Number(body.employeeId));
    const created = {
      id: nextId(),
      rosterPeriodId: version.rosterPeriodId,
      rosterVersionId: version.id,
      holidayId: Number(body.holidayId),
      holidayName: holiday?.name || `Holiday #${body.holidayId}`,
      holidayDate: holiday?.holidayDate || '2026-12-25',
      slotType: body.slotType,
      slotNumber: Number(body.slotNumber),
      employeeId: Number(body.employeeId),
      employeeDisplayName: emp?.displayName || `Employee #${body.employeeId}`,
      origin: 'MANUAL',
      status: 'PROPOSED',
    };
    state.assignments.push(created);
    version.rowVersion += 1;
    recordAudit(account, 'DRAFT_ASSIGNMENT_CREATED', 'ROSTER_ASSIGNMENT', created.id, body.reason);
    return makeResponse(201, clone(created));
  }

  m = path.match(/^\/roster-versions\/(\d+)\/assignments\/(\d+)$/);
  if (m && method === 'PATCH') {
    if (!hasPerm(account, 'ROSTER.MANUAL_ASSIGN')) return makeError(403, 'FORBIDDEN', 'ROSTER.MANUAL_ASSIGN required.');
    const version = state.rosterVersions.find((v) => v.id === Number(m[1]));
    if (!version) return makeError(404, 'NOT_FOUND', 'Roster version not found.');
    const preErr = requireIfMatchHeader(headers, version.rowVersion);
    if (preErr) return preErr;
    const assignment = state.assignments.find((a) => a.id === Number(m[2]) && a.rosterVersionId === version.id);
    if (!assignment) return makeError(404, 'NOT_FOUND', 'Draft assignment not found.');
    const emp = state.employees.find((e) => e.id === Number(body.employeeId));
    assignment.employeeId = Number(body.employeeId);
    assignment.employeeDisplayName = emp?.displayName || `Employee #${body.employeeId}`;
    assignment.origin = 'MANUAL';
    version.rowVersion += 1;
    recordAudit(account, 'DRAFT_ASSIGNMENT_UPDATED', 'ROSTER_ASSIGNMENT', assignment.id, body.reason);
    return makeResponse(200, clone(assignment));
  }

  m = path.match(/^\/roster-versions\/(\d+)\/publish$/);
  if (m && method === 'POST') {
    if (!hasPerm(account, 'ROSTER.PUBLISH')) return makeError(403, 'FORBIDDEN', 'ROSTER.PUBLISH required.');
    const version = state.rosterVersions.find((v) => v.id === Number(m[1]));
    if (!version) return makeError(404, 'NOT_FOUND', 'Roster version not found.');
    const preErr = requireIfMatchHeader(headers, version.rowVersion);
    if (preErr) return preErr;
    if (version.parentVersionId != null && version.revisedByUserAccountId === account.id) {
      return makeError(403, 'TWO_PERSON_CONTROL_VIOLATION', 'A different user account must publish a reasoned revision (FDR-09).');
    }
    version.status = 'PUBLISHED';
    version.publishedByUserAccountId = account.id;
    version.rowVersion += 1;
    for (const a of state.assignments.filter((x) => x.rosterVersionId === version.id)) {
      a.status = 'PUBLISHED';
    }
    recordAudit(account, 'ROSTER_VERSION_PUBLISHED', 'ROSTER_VERSION', version.id, null, 'DRAFT', 'PUBLISHED');
    return saveIdempotent(200, clone(version));
  }

  m = path.match(/^\/roster-versions\/(\d+)\/revisions$/);
  if (m && method === 'POST') {
    if (!hasPerm(account, 'ROSTER.REVISE')) return makeError(403, 'FORBIDDEN', 'ROSTER.REVISE required.');
    const source = state.rosterVersions.find((v) => v.id === Number(m[1]));
    if (!source) return makeError(404, 'NOT_FOUND', 'Source roster version not found.');
    const preErr = requireIfMatchHeader(headers, source.rowVersion);
    if (preErr) return preErr;
    const child = {
      id: nextId(),
      rosterPeriodId: source.rosterPeriodId,
      versionNumber: state.rosterVersions.filter((v) => v.rosterPeriodId === source.rosterPeriodId).length + 1,
      status: 'DRAFT',
      parentVersionId: source.id,
      publishedByUserAccountId: null,
      revisedByUserAccountId: account.id,
      rowVersion: 1,
    };
    state.rosterVersions.push(child);
    for (const a of state.assignments.filter((x) => x.rosterVersionId === source.id)) {
      state.assignments.push({ ...clone(a), id: nextId(), rosterVersionId: child.id, status: 'PROPOSED' });
    }
    recordAudit(account, 'ROSTER_REVISION_CREATED', 'ROSTER_VERSION', child.id, body?.reason);
    return saveIdempotent(201, clone(child));
  }

  // --- REPLACEMENTS & STANDBY ---
  if (method === 'GET' && path === '/replacement-requests') {
    if (!hasAnyPerm(account, ['REPLACEMENT.READ', 'REPLACEMENT.REQUEST_OWN', 'REPLACEMENT.APPROVE'])) {
      return makeError(403, 'FORBIDDEN', 'Replacement read permission required.');
    }
    let items = state.replacementRequests;
    if (!hasOrgScope(account)) {
      const visibleEmpIds = getScopedEmployeeIds(account);
      items = items.filter(
        (r) =>
          r.requesterUserAccountId === account.id ||
          r.requestedForEmployeeId === account.employeeId ||
          (visibleEmpIds && visibleEmpIds.has(r.requestedForEmployeeId))
      );
    }
    if (query?.status) items = items.filter((r) => r.status === query.status);
    return makeResponse(200, paginate(items, query));
  }

  if (method === 'POST' && path === '/replacement-requests') {
    if (!hasPerm(account, 'REPLACEMENT.REQUEST_OWN')) return makeError(403, 'FORBIDDEN', 'REPLACEMENT.REQUEST_OWN required.');
    const assignment = state.assignments.find((a) => a.id === Number(body?.originalAssignmentId));
    if (!assignment) {
      return makeError(422, 'VALIDATION_ERROR', 'Published assignment not found.', [
        { field: 'originalAssignmentId', message: 'Assignment does not exist.' },
      ]);
    }
    const created = {
      id: nextId(),
      requestCode: `REP-2026-${nextId()}`,
      originalAssignmentId: assignment.id,
      requestedForEmployeeId: assignment.employeeId,
      requestedForDisplayName: assignment.employeeDisplayName,
      requesterUserAccountId: account.id,
      requesterDisplayName: account.displayName,
      holidayDate: assignment.holidayDate,
      slotType: assignment.slotType,
      slotNumber: assignment.slotNumber,
      requestReason: String(body.reason || '').trim(),
      status: 'AWAITING_MANAGER_DECISION',
      staffingGap: false,
      suggestedStandbyAssignmentId: null,
      selectedReplacementEmployeeId: null,
      selectedReplacementDisplayName: null,
      submittedAtUtc: nowUtc(),
      resolvedAtUtc: null,
      decisions: [],
      rowVersion: 1,
    };
    state.replacementRequests.unshift(created);
    recordAudit(account, 'REPLACEMENT_REQUESTED', 'REPLACEMENT_REQUEST', created.id, created.requestReason);
    return saveIdempotent(201, clone(created));
  }

  m = path.match(/^\/replacement-requests\/(\d+)\/candidates$/);
  if (m && method === 'GET') {
    if (!hasPerm(account, 'REPLACEMENT.APPROVE')) return makeError(403, 'FORBIDDEN', 'REPLACEMENT.APPROVE required.');
    const req = state.replacementRequests.find((r) => r.id === Number(m[1]));
    if (!req) return makeError(404, 'NOT_FOUND', 'Replacement request not found.');
    const standbyAssign = req.suggestedStandbyAssignmentId
      ? state.assignments.find((a) => a.id === req.suggestedStandbyAssignmentId)
      : null;
    const candidates = state.employees
      .filter((e) => e.id !== req.requestedForEmployeeId && e.active && e.rotationEligibleFrom)
      .map((e) => {
        const isStandby = Boolean(standbyAssign && standbyAssign.employeeId === e.id);
        const eligible = Boolean(e.active && e.rotationEligibleFrom);
        const available = !state.availability.some(
          (av) =>
            av.employeeId === e.id &&
            av.status === 'ACTIVE' &&
            av.availabilityType === 'UNAVAILABLE' &&
            av.startDate <= req.holidayDate &&
            av.endDate >= req.holidayDate
        );
        return {
          employeeId: e.id,
          displayName: e.displayName,
          suggestedStandby: isStandby,
          eligible,
          available,
          exclusionReason: !eligible ? 'Not rotation-eligible' : !available ? 'Declared unavailable' : null,
        };
      });
    candidates.sort((a, b) => Number(b.suggestedStandby) - Number(a.suggestedStandby));
    return makeResponse(200, paginate(candidates, query));
  }

  m = path.match(/^\/replacement-requests\/(\d+)\/decision$/);
  if (m && method === 'POST') {
    if (!hasPerm(account, 'REPLACEMENT.APPROVE')) return makeError(403, 'FORBIDDEN', 'REPLACEMENT.APPROVE required.');
    const req = state.replacementRequests.find((r) => r.id === Number(m[1]));
    if (!req) return makeError(404, 'NOT_FOUND', 'Replacement request not found.');
    const preErr = requireIfMatchHeader(headers, req.rowVersion);
    if (preErr) return preErr;
    if (req.requesterUserAccountId === account.id || req.requestedForEmployeeId === account.employeeId) {
      return makeError(403, 'RECUSAL_REQUIRED', 'Conflicted participants cannot decide this replacement request (FDR-03).');
    }
    const decision = body.decision;
    let selectedEmp = null;
    if (decision === 'APPROVED') {
      selectedEmp = state.employees.find((e) => e.id === Number(body.replacementEmployeeId));
      if (!selectedEmp) {
        return makeError(422, 'VALIDATION_ERROR', 'Replacement candidate not found.');
      }
      if (selectedEmp.id === account.employeeId) {
        return makeError(403, 'RECUSAL_REQUIRED', 'Listed candidate cannot approve own replacement (FDR-03).');
      }
      req.selectedReplacementEmployeeId = selectedEmp.id;
      req.selectedReplacementDisplayName = selectedEmp.displayName;
      const origAssign = state.assignments.find((a) => a.id === req.originalAssignmentId);
      if (origAssign) {
        origAssign.status = 'REPLACED';
        state.assignments.push({
          ...clone(origAssign),
          id: nextId(),
          employeeId: selectedEmp.id,
          employeeDisplayName: selectedEmp.displayName,
          origin: 'REPLACEMENT',
          status: 'PUBLISHED',
        });
      }
    }
    req.status = decision;
    req.resolvedAtUtc = nowUtc();
    req.rowVersion += 1;
    req.decisions.push({
      id: nextId(),
      decision,
      approverUserAccountId: account.id,
      approverDisplayName: account.displayName,
      selectedReplacementEmployeeId: selectedEmp?.id ?? null,
      selectedReplacementDisplayName: selectedEmp?.displayName ?? null,
      decisionReason: body.reason,
      validationResult: 'VALIDATED',
      decidedAtUtc: req.resolvedAtUtc,
    });
    recordAudit(account, `REPLACEMENT_${decision}`, 'REPLACEMENT_REQUEST', req.id, body.reason);
    return saveIdempotent(200, clone(req));
  }

  if (method === 'POST' && path === '/standby-activations') {
    if (!hasPerm(account, 'STANDBY.ACTIVATE')) return makeError(403, 'FORBIDDEN', 'STANDBY.ACTIVATE required.');
    const approved = state.replacementRequests.some(
      (r) => r.originalAssignmentId === Number(body?.primaryAssignmentId) && r.status === 'APPROVED'
    );
    if (!approved) {
      return makeError(422, 'APPROVAL_REQUIRED', 'Recording Standby activation requires an already-approved replacement decision for that Primary slot.');
    }
    const primaryAssign = state.assignments.find((a) => a.id === Number(body?.primaryAssignmentId));
    const act = {
      id: nextId(),
      standbyAssignmentId: Number(body.standbyAssignmentId),
      primaryAssignmentId: Number(body.primaryAssignmentId),
      activatedForEmployeeId: primaryAssign?.employeeId ?? null,
      activatedByUserAccountId: account.id,
      reason: body.reason,
      status: 'ACTIVATED',
      activatedAtUtc: nowUtc(),
    };
    state.standbyActivations.push(act);
    recordAudit(account, 'STANDBY_ACTIVATED', 'STANDBY_ACTIVATION', act.id, act.reason);
    return makeResponse(201, clone(act));
  }

  // --- DUTY HISTORY ---
  if (method === 'GET' && path === '/duty-history') {
    if (!hasPerm(account, 'DUTY.REPORT.READ')) return makeError(403, 'FORBIDDEN', 'DUTY.REPORT.READ required.');
    const dimension = query?.dimension || 'EFFECTIVE_PUBLISHED_PRIMARY_CREDIT';
    const todayIso = new Date().toISOString().slice(0, 10);
    let rows = [];
    if (dimension === 'EFFECTIVE_PUBLISHED_PRIMARY_CREDIT') {
      rows = state.assignments.filter(
        (a) => a.slotType === 'PRIMARY' && (a.status === 'PUBLISHED' || a.status === 'CURRENT')
      );
    } else if (dimension === 'FUTURE_PUBLISHED_PRIMARY') {
      rows = state.assignments.filter(
        (a) =>
          a.slotType === 'PRIMARY' &&
          (a.status === 'PUBLISHED' || a.status === 'CURRENT') &&
          a.holidayDate >= todayIso
      );
    } else if (dimension === 'STANDBY_ASSIGNMENT') {
      rows = state.assignments.filter(
        (a) => a.slotType === 'STANDBY' && (a.status === 'PUBLISHED' || a.status === 'CURRENT')
      );
    } else if (dimension === 'STANDBY_ACTIVATION') {
      rows = state.standbyActivations.map((act) => {
        const primaryAssign = state.assignments.find((a) => a.id === act.primaryAssignmentId);
        return {
          ...act,
          employeeId: act.activatedForEmployeeId ?? primaryAssign?.employeeId ?? null,
          holidayDate: primaryAssign?.holidayDate ?? act.activatedAtUtc.slice(0, 10),
          holidayName: primaryAssign?.holidayName ?? null,
        };
      });
    } else if (dimension === 'DRAFT_ASSIGNMENT') {
      rows = state.assignments.filter((a) => a.status === 'PROPOSED');
    } else if (dimension === 'REPLACED_ASSIGNMENT') {
      rows = state.assignments.filter((a) => a.status === 'REPLACED');
    } else if (dimension === 'CANCELLED_ASSIGNMENT') {
      rows = state.assignments.filter((a) => a.status === 'CANCELLED');
    }

    if (query?.fromDate) {
      rows = rows.filter((r) => (r.holidayDate || r.activatedAtUtc?.slice(0, 10) || '') >= query.fromDate);
    }
    if (query?.toDate) {
      rows = rows.filter((r) => (r.holidayDate || r.activatedAtUtc?.slice(0, 10) || '') <= query.toDate);
    }

    const visibleEmpIds = getScopedEmployeeIds(account);
    if (visibleEmpIds !== null) {
      rows = rows.filter((r) => visibleEmpIds.has(r.employeeId ?? r.activatedForEmployeeId));
    }
    if (query?.employeeId) {
      const targetId = Number(query.employeeId);
      rows = rows.filter((r) => (r.employeeId ?? r.activatedForEmployeeId) === targetId);
    }
    return makeResponse(200, { dimension, ...paginate(rows, query) });
  }

  // --- HANDOVER ---
  if (method === 'GET' && path === '/handover-reports') {
    if (!hasAnyPerm(account, ['HANDOVER.READ', 'HANDOVER.CREATE'])) return makeError(403, 'FORBIDDEN', 'HANDOVER.READ required.');
    let items = state.handoverReports;
    if (query?.assignmentId) items = items.filter((h) => h.assignmentId === Number(query.assignmentId));
    return makeResponse(200, paginate(items, query));
  }

  if (method === 'POST' && path === '/handover-reports') {
    if (!hasPerm(account, 'HANDOVER.CREATE')) return makeError(403, 'FORBIDDEN', 'HANDOVER.CREATE required.');
    const created = {
      id: nextId(),
      assignmentId: Number(body.assignmentId),
      authoredByUserAccountId: account.id,
      authoredByDisplayName: account.displayName,
      summary: String(body.summary),
      status: 'SUBMITTED',
      supersedesHandoverReportId: body.supersedesHandoverReportId ?? null,
      createdAtUtc: nowUtc(),
      submittedAtUtc: nowUtc(),
      items: Array.isArray(body.items) ? clone(body.items) : [],
    };
    state.handoverReports.unshift(created);
    recordAudit(account, 'HANDOVER_CREATED', 'HANDOVER_REPORT', created.id);
    return makeResponse(201, clone(created));
  }

  m = path.match(/^\/handover-reports\/(\d+)$/);
  if (m && method === 'GET') {
    if (!hasPerm(account, 'HANDOVER.READ')) return makeError(403, 'FORBIDDEN', 'HANDOVER.READ required.');
    const report = state.handoverReports.find((h) => h.id === Number(m[1]));
    if (!report) return makeError(404, 'NOT_FOUND', 'Handover report not found.');
    return makeResponse(200, clone(report));
  }

  // --- NOTIFICATIONS ---
  if (method === 'GET' && path === '/notifications') {
    if (!hasPerm(account, 'NOTIFICATION.READ')) return makeError(403, 'FORBIDDEN', 'NOTIFICATION.READ required.');
    const items = state.notifications.filter((n) => n.userAccountId === account.id);
    return makeResponse(200, paginate(items, query));
  }

  if (method === 'GET' && path === '/notifications/unread-count') {
    if (!hasPerm(account, 'NOTIFICATION.READ')) return makeError(403, 'FORBIDDEN', 'NOTIFICATION.READ required.');
    const count = state.notifications.filter((n) => n.userAccountId === account.id && !n.readAtUtc).length;
    return makeResponse(200, { count });
  }

  m = path.match(/^\/notifications\/(\d+)\/read$/);
  if (m && method === 'POST') {
    if (!hasPerm(account, 'NOTIFICATION.READ')) return makeError(403, 'FORBIDDEN', 'NOTIFICATION.READ required.');
    const notif = state.notifications.find((n) => n.id === Number(m[1]) && n.userAccountId === account.id);
    if (!notif) return makeError(404, 'NOT_FOUND', 'Notification not found.');
    notif.readAtUtc = notif.readAtUtc || nowUtc();
    return makeResponse(204, null);
  }

  // --- HELP ---
  if (method === 'GET' && path === '/help/articles') {
    if (!hasAnyPerm(account, ['HELP.READ', 'HELP.MANAGE'])) return makeError(403, 'FORBIDDEN', 'HELP.READ required.');
    let items = state.helpArticles;
    if (!hasPerm(account, 'HELP.MANAGE')) {
      items = items.filter(
        (a) =>
          a.publicationStatus === 'PUBLISHED' &&
          a.visibleRoleCodes.some((r) => account.roles.includes(r))
      );
    }
    if (query?.categoryId) items = items.filter((a) => String(a.categoryId) === String(query.categoryId));
    if (query?.q) {
      const q = String(query.q).toLowerCase();
      items = items.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.summary || '').toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q)
      );
    }
    const paged = paginate(items, query);
    paged.categories = clone(state.helpCategories);
    return makeResponse(200, paged);
  }

  if (method === 'POST' && path === '/help/articles') {
    if (!hasPerm(account, 'HELP.MANAGE')) return makeError(403, 'FORBIDDEN', 'HELP.MANAGE required.');
    const cat = state.helpCategories.find((c) => c.id === Number(body.categoryId));
    const created = {
      id: nextId(),
      title: String(body.title),
      summary: String(body.summary || ''),
      categoryId: Number(body.categoryId),
      categoryName: cat?.name || 'General',
      visibleRoleCodes: [...body.visibleRoleCodes],
      content: String(body.content),
      publicationStatus: body.publicationStatus,
      versionNumber: 1,
      publishedAtUtc: body.publicationStatus === 'PUBLISHED' ? nowUtc() : null,
    };
    state.helpArticles.unshift(created);
    recordAudit(account, 'HELP_ARTICLE_CREATED', 'HELP_ARTICLE', created.id);
    return makeResponse(201, clone(created));
  }

  m = path.match(/^\/help\/articles\/(\d+)$/);
  if (m) {
    const article = state.helpArticles.find((a) => a.id === Number(m[1]));
    if (!article) return makeError(404, 'NOT_FOUND', 'Help article not found.');
    if (method === 'GET') {
      if (!hasAnyPerm(account, ['HELP.READ', 'HELP.MANAGE'])) return makeError(403, 'FORBIDDEN', 'HELP.READ required.');
      return makeResponse(200, clone(article));
    }
    if (method === 'PATCH') {
      if (!hasPerm(account, 'HELP.MANAGE')) return makeError(403, 'FORBIDDEN', 'HELP.MANAGE required.');
      const cat = state.helpCategories.find((c) => c.id === Number(body.categoryId));
      Object.assign(article, {
        title: body.title ?? article.title,
        summary: body.summary ?? article.summary,
        categoryId: body.categoryId ?? article.categoryId,
        categoryName: cat?.name || article.categoryName,
        visibleRoleCodes: body.visibleRoleCodes ?? article.visibleRoleCodes,
        content: body.content ?? article.content,
        publicationStatus: body.publicationStatus ?? article.publicationStatus,
        versionNumber: article.versionNumber + 1,
      });
      if (article.publicationStatus === 'PUBLISHED' && !article.publishedAtUtc) {
        article.publishedAtUtc = nowUtc();
      }
      recordAudit(account, 'HELP_ARTICLE_UPDATED', 'HELP_ARTICLE', article.id);
      return makeResponse(200, clone(article));
    }
  }

  // --- AUDIT ---
  if (method === 'GET' && path === '/audit-events') {
    if (!hasPerm(account, 'AUDIT.READ')) return makeError(403, 'FORBIDDEN', 'AUDIT.READ required.');
    let items = state.auditEvents;
    if (query?.fromDate) items = items.filter((e) => e.occurredAtUtc.slice(0, 10) >= query.fromDate);
    if (query?.toDate) items = items.filter((e) => e.occurredAtUtc.slice(0, 10) <= query.toDate);
    return makeResponse(200, paginate(items, query));
  }

  return makeError(404, 'NOT_FOUND', `No mock handler for ${method} ${path}`);
}
