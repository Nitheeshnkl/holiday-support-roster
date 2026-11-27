# API Contract & OpenAPI Specification
## Holiday Support Roster Management System

| Field | Value |
|---|---|
| Document ID | ROSTER-API-007 |
| Version | 2.1 |
| Status | Finalized implementation contract under authorized reconciliation |
| Created / updated | 27 November 2026 |
| Owner | API Architecture / Backend Architecture |
| Machine-readable contract | `openapi.yaml` (OpenAPI 3.0.3) |
| Shared consumers | Antigravity frontend; OpenAI Codex backend |
| Authority | `ROSTER_CONFIRMED_BUSINESS_DECISIONS.md` v1.1; Documents 01–06 current versions |

### Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 27 Nov 2026 | Initial shared API contract and OpenAPI definition. Conditional items retain their governing open decision. |
| 1.1 | 27 Nov 2026 | Reconciled against 31 Document 08 screens; added eligible draft assignment candidate lookup and creation of an assignment in an unfilled draft slot. Classified unresolved reported gaps without inventing behavior. |
| 1.2 | 27 Nov 2026 | Reconciled response schemas and collection pagination against existing screens and data model; aligned OpenAPI version to 1.2.0-draft. No new business workflow was added; unresolved policies remain conditional. |
| 2.0 | 27 Nov 2026 | Finalized account lifecycle, scoped approval-grant administration, published/closed-period revision, and decision-aligned workload/availability/notification behavior; synchronized OpenAPI 2.0.0. Duty-completion and handover acknowledgement remain excluded. |
| 2.1 | 27 Nov 2026 | Synchronized availability update and holiday change-history validation, effective-date grant schemas, replacement recusal errors, seven workload dimensions, and standby activation semantics with the final database model. |

## 1. Purpose and scope

This is the proposed integration contract between Antigravity's HTML/CSS/Vanilla-JS ES-module frontend and Codex's Java/Spring Boot backend. It covers identity, organisation, holidays, availability, roster generation and publication, standby, replacement, duty history, handover, notifications and Help Centre. It excludes Comp-Off, leave, attendance, payroll and ticketing. No ticketing-platform API is defined.

Both agents must implement only this versioned contract. Contract changes require a synchronized update to this document and `openapi.yaml`; neither client nor server may infer missing business behavior.

**Authorized integration model:** OpenAI Codex owns final source integration and API/end-to-end verification after a shared repository or formal handoff is selected. Antigravity resolves frontend/UI integration defects. This assigns responsibility without assuming a repository provider, URL, deployment platform or shared workspace.

## 2. Architecture and API conventions

- Base URL: `{baseUrl}/api/v1`; `{baseUrl}` is environment configuration, not a production URL.
- JSON UTF-8 request/response bodies; field names are lowerCamelCase; IDs are integer `int64` values.
- Dates use `YYYY-MM-DD`; timestamps use UTC RFC 3339 `date-time`; business-date interpretation uses the organisation timezone.
- Collections use `{ items, page }`, with `page` zero-based and `pageSize` 1–100 (default 25). Filter/sort support is limited to documented query parameters.
- `POST` creates or performs commands; `PATCH` changes mutable draft/admin data; `GET` is read-only. Published facts are never patched.
- State-changing browser requests use the authenticated Spring Security session cookie plus CSRF token. No JWT, OAuth, refresh-token mechanism, or production host is introduced.
- Mutation of `rowVersion` resources requires `If-Match`; stale state returns `409 CONCURRENT_MODIFICATION`. Generation, publication and replacement commands require `Idempotency-Key` and return the prior compatible result for a duplicate key.
- Backward-compatible additions are permitted in `/v1`; breaking changes require a new API version and migration plan.

## 3. Authentication and authorization

`POST /session/login` establishes a secure HttpOnly session. `GET /session/me` returns the non-sensitive principal, effective roles/permissions/scopes, CSRF token and onboarding state. `POST /session/logout` ends the session. Account invitation/activation, password reset, password change and deactivation follow FDR-13: minimum 12 characters, maximum 72 UTF-8 bytes, BCrypt cost 12; single-use hashed invitation token (24 hours) and reset token (30 minutes); generic non-enumerating reset response; sessions revoked after reset, deactivation or permission change.

The backend enforces authentication, effective role, permission, resource scope, relationship and state. Frontend visibility is not authorization. The Manager approver is a capability, not a confirmed role; endpoints requiring `REPLACEMENT.APPROVE`, `REPLACEMENT.REJECT` or `REPLACEMENT.SELECT_CANDIDATE` remain conditional on OD-01/OD-16 and must fail closed without an active scoped authority grant.

## 4. Standard envelopes, errors and validation

Success returns the schema stated for the endpoint. Empty success returns `204`. Errors use:

```json
{"code":"ASSIGNMENT_CONFLICT","message":"The employee already occupies a slot for this holiday.","fieldErrors":[{"field":"employeeId","code":"DUPLICATE_HOLIDAY_ASSIGNMENT","message":"Choose another eligible employee."}],"correlationId":"illustrative-request-id","timestamp":"2026-11-27T00:00:00Z"}
```

`400` malformed request; `401` absent/expired session; `403` role, permission or scope denial; `404` unavailable/not visible resource; `409` stale version, duplicate command, or invalid current state; `422` syntactically valid but field/business-rule invalid; `429` only when an approved rate limit is configured; `500` sanitized unexpected failure; `503` temporarily unavailable dependency. Standard business codes include `EMPLOYEE_INELIGIBLE`, `EMPLOYEE_UNAVAILABLE`, `ASSIGNMENT_CONFLICT`, `INSUFFICIENT_STAFFING`, `NO_ELIGIBLE_REPLACEMENT`, `MANAGER_APPROVAL_REQUIRED`, `INVALID_ROSTER_STATE`, `PUBLISHED_MODIFICATION_RESTRICTED`, `CONCURRENT_MODIFICATION`, `DUPLICATE_OPERATION`, and `INVALID_TRANSITION`.

## 5. Endpoint catalogue

All endpoint schemas are authoritative in `openapi.yaml`. The active decision rules come from Decision Register v1.1 Part F. Authorization failures return 403, missing scoped resources 404, stale version/grant writes 409, and Jakarta validation or business-rule violations 422 unless an operation documents a narrower response.

| ID | Method / path | Auth / authorization | Purpose, validation and side effects | Data mapping / source |
|---|---|---|---|---|
| API-AUTH-01 | POST `/session/login` | Public | Validate credentials; establish session; never return password. | user_account; NFR-SEC-02 |
| API-AUTH-02 | POST `/session/logout` | Session | End current session; 204. | identity/session adapter |
| API-AUTH-03 | GET `/session/me` | Session | Return effective UI permissions/scopes and onboarding state. | user_account, role assignment, onboarding |
| API-ORG-01 | GET/POST `/employees` | `ORG.USER.READ` / `ORG.USER.MANAGE` | Paginated scoped listing / create effective-dated employee with unique validated work email. | employee, user_account; FR-ORG |
| API-ORG-02 | GET/PATCH `/employees/{employeeId}` | READ / MANAGE; scope checked | Read/update without erasing historic facts; PATCH uses `If-Match`. | employee; FR-ORG-02..03 |
| API-ORG-03 | GET `/teams` | `ORG.USER.READ`, scoped | List visible teams only. Team membership alone grants no access. | team; FR-ORG-04 |
| API-ORG-04 | POST `/teams`; GET/POST `/employees/{employeeId}/team-memberships` | `ORG.TEAM.MANAGE` / `ORG.MEMBERSHIP.MANAGE` | Maintain teams and effective-dated membership; preserve history; multiple-membership rules remain OD-05. | team, team_membership; FR-ORG |
| API-ORG-05 | GET `/authorization/roles`; GET/POST `/employees/{employeeId}/role-assignments` | own/scoped visibility / `ORG.ROLE.MANAGE` | Expose visible role/permission catalogue and administer effective-dated application roles; does not grant Manager approval capability. | app_role, permission, user_role_assignment; Roles §§4–5 |
| API-ORG-06 | POST `/employees/{employeeId}/invitations`; POST `/account-activations`; PUT `/employees/{employeeId}/account-status` | `ORG.USER.MANAGE` / public single-use activation | Invite, activate with initial password, deactivate/reactivate linked account; invitation is single-use 24h; status changes revoke sessions and are audited. | user_account, account_action_token, audit_event, notification_outbox; FDR-13 |
| API-ORG-07 | GET/POST `/authorization/approval-grants`; POST `/authorization/approval-grants/{grantId}/revoke` | `ORG.AUTHORITY.MANAGE` | List/create/revoke scoped, time-bounded `REPLACEMENT.APPROVE` grants; self-grant forbidden; 403 unauthorized, 409 stale grant, 422 invalid scope/time/reason. | approval_authority_grant, audit_event; FDR-03 |
| API-AUTH-04 | POST `/session/password/change`; POST `/password-reset-requests`; POST `/password-resets` | authenticated self / public generic reset | Verify current password, issue generic reset response, consume single-use 30m token; revoke sessions as defined. 401 invalid current session; 422 invalid token/password; 429 rate limit. | user_account, account_action_token, session, notification_outbox; FDR-13 |
| API-HOL-01 | GET/POST `/holidays` | `CALENDAR.READ` / `CALENDAR.MANAGE` | List or create holiday with explicit Primary >=1 and Standby >=0 counts, no defaults; combined count cannot exceed active rotation-eligible pool. New holiday requires staffing before generation; date-specific availability gaps surface during generation and block publication. | holiday, holiday_staffing_requirement; FDR-04 |
| API-HOL-02 | PATCH `/holidays/{holidayId}` | `CALENDAR.MANAGE`, `If-Match` | Amend pre-publication data; after publication use reasoned roster revision; cancellation is status transition. | holiday, holiday_staffing_requirement; FDR-04/10 |
| API-AVL-01 | GET/POST `/availability` | OWN or explicit `AVAILABILITY.READ` / `AVAILABILITY.MANAGE_OWN` | List scoped records or submit own availability. Effective immediately; end date ≥ start; published assignments are never mutated. | availability_record; FR-AVL, FDR-05 |
| API-AVL-03 | PATCH `/availability/{availabilityId}` | OWN or explicit on-behalf authority; `If-Match` | Update own availability effective immediately; stale drafts are invalidated; generation and publish revalidate; assignment conflict routes to replacement. 403/404/409/422 errors. | availability_record, audit_event; FDR-05 |
| API-AVL-02 | POST `/availability/{availabilityId}/withdraw` | OWN or explicit delegated scope | Cancel/supersede own record with concurrency check; audit. | availability_record; BR-AVL-001 |
| API-ROS-01 | GET/POST `/roster-periods` | `ROSTER.READ` / explicit creation authority | List/create planning periods. Validate date order. | roster_period |
| API-ROS-02 | POST `/roster-periods/{periodId}/generate` | `ROSTER.GENERATE`, org scope | Create draft generation only; chronological, global fairness, same-team soft preference; return gaps/explanations. | roster_version, generation_run/input, slots, assignments; FR-GEN |
| API-ROS-03 | GET `/roster-periods/{periodId}/roster` | `ROSTER.READ`, own/team/org scope | Return requested DRAFT/REVIEWED/PUBLISHED view, version lineage, all requirement-snapshot slots including holiday name/date and unfilled slots, and separately labelled assignments with employee display facts. | roster_period/version/slot/assignment/employee |
| API-ROS-04 | PATCH `/roster-versions/{versionId}/assignments/{assignmentId}` | `ROSTER.MANUAL_ASSIGN`, conditional grant | Draft-only manual edit. Revalidate eligibility, availability, duplicate holiday slot, slot type; reason/audit required. | assignment, assignment_change; FR-MAN |
| API-ROS-07 | GET `/roster-versions/{versionId}/assignment-candidates` | `ROSTER.MANUAL_ASSIGN`, org scope | Return only candidates satisfying current hard eligibility, availability, slot validity, and no-other-slot-on-holiday rules for the supplied draft slot coordinates. This is a point-in-time discovery result, not a reservation; write operation revalidates. Manual candidate discovery does not rank candidates; generation applies FDR-02. | employee, team_membership, availability_record, roster_slot, assignment; FR-MAN-01..03; BR-ELG-001..004 |
| API-ROS-08 | POST `/roster-versions/{versionId}/assignments` | `ROSTER.MANUAL_ASSIGN`, org scope | Add a manually selected employee to an existing unfilled slot in a draft version. Require `If-Match`, slot coordinates, employee ID, and reason. Validate slot/version state, active and rotation eligibility, availability, and one-assignment-per-holiday; persist MANUAL origin, actor/reason/time and audit event. Never bypass hard checks. | roster_slot, assignment, audit_event; FR-MAN-01..05; BR-MAN-001..005 |
| API-ROS-05 | POST `/roster-versions/{versionId}/publish` | `ROSTER.PUBLISH`, org scope | Atomic publish after staffing/hard-constraint validation. Published version immutable. | roster_version, assignment, audit/outbox; FR-PUB |
| API-ROS-06 | GET `/roster-periods/{periodId}/generation-runs` | `ROSTER.READ`, scoped | Retrieve generation metadata, feasibility result and explanations; no client recalculation of fairness. | generation_run/input; FR-GEN-12 |
| API-ROS-09 | POST `/roster-versions/{versionId}/revisions` | `ROSTER.REVISE`, scoped; idempotency key | Create reasoned child draft from published version, including closed period/date/staffing/cancellation changes. Different `ROSTER.PUBLISH` actor must validate and publish. 403/409/422 errors; prior version immutable. | roster_version, holiday history, assignment lineage, audit_event, notification_outbox; FDR-09/10 |
| API-REP-01 | GET/POST `/replacement-requests` | participant/scope / `REPLACEMENT.REQUEST_OWN` | Paginated request list includes requester/requested-for display identities, reason, status/timestamps, slot context and decision history with approver/selected replacement display identities. Create reports unavailability for a current published assignment and does not change it. | replacement_request, replacement_decision, assignment, user_account, employee, notification_outbox; FR-REP |
| API-REP-02 | GET `/replacement-requests/{requestId}/candidates` | active scoped `REPLACEMENT.APPROVE` | Evaluate current eligibility/availability; Standby first; alternatives/gap visible; conflicted participants excluded. | assignment, availability, approval grant; FDR-03 |
| API-REP-03 | POST `/replacement-requests/{requestId}/decision` | active scoped `REPLACEMENT.APPROVE` | Approve selected eligible candidate or reject, transactionally revalidated; self-approval/participant conflict forbidden. If no eligible approver, remain pending and escalate with no assignment change. | request/decision/change/version/audit/outbox; FDR-03 |
| API-STB-01 | POST `/standby-activations` | `STANDBY.ACTIVATE`; replacement approval still required for assignment transfer | Record the activation event; only approved assignment lineage changes current slot credit. No actual performance assertion. | standby_activation, assignment_change; FDR-01/03 |
| API-DUT-01 | GET `/duty-history` | own/team/org + `DUTY.REPORT.READ` where required | Return effective published Primary assignment credits and separately labeled future/draft/Standby/replaced/cancelled dimensions. No completion/actual-performer data. | assignment, roster_version, activation; FDR-01 |
| API-HO-01 | GET/POST `/handover-reports`; GET `/handover-reports/{handoverId}` | `HANDOVER.READ` / `HANDOVER.CREATE`, scoped | Create/list/detail bounded content; submitted record immutable; correction is new linked addendum via `supersedesHandoverReportId`; no assignment change or acknowledgment. | handover_report/item, user_account, employee; FDR-08 |
| API-NOT-01 | GET `/notifications`; GET `/notifications/unread-count` | `NOTIFICATION.READ`, OWN | Paginated current-user notifications include type, title, rendered message, creation/read time and optional target; no delivery-provider control exposed. | notification_outbox, notification_delivery |
| API-NOT-02 | POST `/notifications/{notificationId}/read` | OWN | Set per-recipient in-app read timestamp; 404 for non-visible ID. | notification_outbox.read_at_utc |
| API-AUD-01 | GET `/audit-events` | `AUDIT.READ`, org scope | Paginated authorized append-only history includes actor id/display name/type, action, target, time, reason and before/after references. | audit_event, user_account, employee; FR-AUD |
| API-ONB-01 | GET/PATCH `/onboarding/progress` | authenticated OWN | Read published walkthroughs matching effective role, ordered step content and own persisted progress; update only own walkthrough progress. | walkthrough(role_id), walkthrough_step, user_onboarding_progress; FR-HELP |
| API-HELP-01 | GET/POST `/help/articles`; GET/PATCH `/help/articles/{articleId}` | `HELP.READ` / `HELP.MANAGE` | Search/list role-visible published articles with category catalogue and category/visibility metadata; Admin-managed article lifecycle uses category and role codes. | help_article/category/role; FR-HELP |

Representative replacement request:

```json
{"originalAssignmentId":101,"reason":"Illustrative unforeseen unavailability"}
```

Representative successful result:

```json
{"id":501,"requestCode":"illustrative-code","originalAssignmentId":101,"requestedForEmployeeId":73,"requesterUserAccountId":73,"requesterDisplayName":"Alex Morgan","requestedForDisplayName":"Alex Morgan","holidayId":12,"holidayDate":"2026-12-25","slotType":"PRIMARY","slotNumber":1,"requestReason":"Unexpected unavailability","status":"AWAITING_MANAGER_DECISION","suggestedStandbyAssignmentId":102,"selectedReplacementEmployeeId":null,"selectedReplacementDisplayName":null,"submittedAtUtc":"2026-11-27T09:00:00Z","resolvedAtUtc":null,"rowVersion":0,"staffingGap":false,"decisions":[]}
```

## 6. Workflow API sequences

### 6.1 Login and first use

Member submits `API-AUTH-01`; frontend stores no credential and uses session cookie; it calls `API-AUTH-03` and `API-ONB-01`, then renders role-authorized navigation and resumable onboarding. Authentication failure shows sanitized validation; onboarding cannot block urgent operations.

### 6.2 Configure and generate roster

Authorized Admin creates/updates holiday through `API-HOL-01/02`, creates a period with `API-ROS-01`, then calls idempotent `API-ROS-02`. Backend freezes inputs, generates draft chronologically, returns explanations/gaps, writes audit/outbox as applicable. Frontend displays draft distinctly. Authorized operator edits only draft with `API-ROS-04`, then publishes using `API-ROS-05`; failed validation returns `422`, stale version `409`.

### 6.2.1 Manual draft assignment

For an unfilled slot, the authorized operator calls `API-ROS-07` with `holidayId`, `slotType`, and `slotNumber`. The response contains only currently eligible and available employees and is not a reservation. The operator selects one and calls `API-ROS-08` with the same slot coordinates, `employeeId`, reason, and `If-Match`. The backend revalidates at commit time and creates a MANUAL assignment with its audit/history facts. For changing an existing draft assignment, use `API-ROS-04`; candidate lookup is shared. A `409` requires refreshing the draft and candidate list; `422` identifies a slot or business-rule validation failure. Candidate results are not fairness-ranked; generation uses the approved server-side FDR-02 comparator and the client must not calculate a score.

Example candidate request: `GET /roster-versions/41/assignment-candidates?holidayId=12&slotType=PRIMARY&slotNumber=2`. Example response: `{"items":[{"employeeId":73,"displayName":"Alex Morgan"}]}`. Example create body: `{"holidayId":12,"slotType":"PRIMARY","slotNumber":2,"employeeId":73,"reason":"Fill unassigned draft slot"}` with `If-Match: "roster-v4"`; example success response: `{"id":208,"rosterVersionId":41,"holidayId":12,"slotType":"PRIMARY","slotNumber":2,"employeeId":73,"origin":"MANUAL","status":"PROPOSED","reason":"Fill unassigned draft slot"}`. A candidate response is not a reservation and may become stale immediately.

### 6.3 Replacement approval

```mermaid
sequenceDiagram
  participant E as Assigned employee
  participant F as Antigravity frontend
  participant B as Codex backend
  participant M as Authorized Manager
  E->>F: Report unavailability
  F->>B: POST /replacement-requests
  B->>B: Persist request; suggest Standby; audit/outbox
  B-->>F: 201 AWAITING_MANAGER_DECISION
  M->>F: Open request/candidates
  F->>B: GET candidates
  B-->>F: Standby-first eligible list or gap
  M->>F: Approve/reject
  F->>B: POST decision (If-Match, Idempotency-Key)
  B->>B: Revalidate grant, scope, candidate, availability and version
  B-->>F: 200 terminal decision; original retained
```

Approval is atomic; it writes decision, new effective revision/change, audit and notification intent. Rejection changes no effective assignment. Candidate, requester or unauthorised Admin/TL cannot approve. If no candidate exists, `UNRESOLVED_STAFFING_GAP` is returned and displayed.

### 6.4 Standby, duty and reporting

`API-STB-01` records activation only after an approved replacement decision; it does not change assignment state or assert performance. `API-DUT-01` exposes exactly seven selectable dimensions: effective published Primary credit, future published Primary, Standby assignment, Standby activation, draft, replaced and cancelled assignment. There is no duty-completion or actual-performer dimension or write API (FDR-01).

### 6.5 Complete workflow call matrix

| Workflow | Initiator / precondition | Ordered calls and expected behavior | Audit, error path and frontend behavior |
|---|---|---|---|
| 1. Login / load | Unauthenticated user | `POST /session/login` → `GET /session/me` → `GET /onboarding/progress`. | Login failure is 401/422; no password is retained by client. |
| 2. First-login onboarding | Authenticated user | `GET/PATCH /onboarding/progress`; resume current step. | Progress persists; urgent actions remain accessible. |
| 3. Employee/team management | Admin / management permission | Employee/team/membership/role routes in API-ORG-01..05. | Effective dates and updates audited; stale mutation is 409. |
| 4. Holiday/staffing | Calendar manager | `POST/PATCH /holidays`; client sends explicit Primary and Standby counts. | Invalid count/date is 422; historic roster snapshots are not changed. |
| 5. Availability | Own employee or delegated actor | POST/PATCH `/availability`, then optional withdrawal route. | Backend applies immediately to future generation/draft checks; current published assignments remain unchanged (FDR-05). |
| 6. Generate draft | Authorized roster operator; period exists | `POST /roster-periods/{periodId}/generate` with idempotency key. | Audit input/run and return gaps/explanations; 422 for infeasible validation, not silent publication. |
| 7. Review fairness/draft | Scoped roster reader | `GET /roster-periods/{periodId}/roster` and generation-runs route. | UI labels draft/proposed data and displays explanations without recalculating fairness. |
| 8. Manual draft modification/addition | Explicit `ROSTER.MANUAL_ASSIGN` grant | GET eligible candidates using `API-ROS-07`; PATCH an existing assignment with `API-ROS-04` or POST an unfilled slot assignment with `API-ROS-08`, using `If-Match` and reason. | Candidate lookup is advisory; write revalidates hard constraints and audits manual origin. 409 refreshes data. |
| 9. Publish | Explicit `ROSTER.PUBLISH` grant | POST publish with `If-Match` and idempotency key. | Atomic roster/audit/outbox transaction; 422 shows staffing or validation gap. |
| 10. Assigned employee unavailable | Participant on published assignment | POST replacement request. | Original assignment stays effective; create request/audit/manager notification. |
| 11. Manager replacement | Active scoped Manager grant | GET candidates then POST decision with version/idempotency keys. | Approval revalidates and creates lineage; rejection leaves original; missing grant is 403. |
| 12. Standby activation | Explicit activation authority | POST standby activation. | Activation is audited but is not completion or workload credit. |
| 13. Duty completion | Excluded by FDR-01 | No endpoint or workflow | Do not present completion/actual-performance controls. |
| 14. Workload/history | Scoped viewer | GET duty history with one explicit dimension/filter selection. | UI never aggregates incompatible dimensions into a completed-duty total. |
| 15. Handover | Assigned/authorized user | POST handover/addendum, GET list/detail. | Submitted reports are immutable and linked corrections are allowed; no acknowledgement workflow (FDR-08). |
| 16. Notifications | Authenticated user | GET notifications/count; POST own notification read. | Delivery failure is operationally visible but cannot undo business commits. |
| 17. Help Center | Any role / Admin manager | GET visible articles; Help Admin uses create/update routes. | Role-filter draft/restricted content; Admin changes are auditable. |

## 7. DTO and persistence boundary

### 7.1 Examples for v2.1 additions

Create a scoped approval grant (caller has `ORG.AUTHORITY.MANAGE`; dates and identities are illustrative):

```json
{"userAccountId":73,"scopeType":"TEAM","scopeId":12,"validFrom":"2026-12-01","validUntil":"2027-03-01","reason":"Holiday replacement approver rotation"}
```

Create a published-roster correction draft (the selected published version remains effective until a different authorized publisher publishes the child):

```json
{"reason":"Correct holiday date after company calendar update","changes":[{"holidayId":12,"changeType":"DATE","holidayDate":"2026-12-26"}]}
```

Update availability (current published assignment remains unchanged; a conflict uses the replacement flow):

```json
{"availabilityType":"UNAVAILABLE","startDate":"2026-12-25","endDate":"2026-12-25","reasonCode":"PERSONAL","note":null}
```

Request password recovery with a provider-neutral work address; response is identical whether the address is registered or not:

```json
{"email":"employee@example.invalid"}
```

All examples are illustrative. Secret/password/token values are intentionally not included. OpenAPI schemas are authoritative for writable fields and bounds.

`openapi.yaml` defines all writable/read-only properties. DTOs never expose entities or system-controlled audit fields. Core mappings: `Employee`→employee/user_account; account tokens→account_action_token; `Holiday`→holiday/holiday_staffing_requirement; `Availability`→availability_record; `RosterPeriod/RosterVersion/Assignment/GenerationResult`→roster_period/version/slot/assignment/generation_*; `ReplacementRequest`→replacement_request/decision/change/approval_authority_grant; `StandbyActivation`→standby_activation; `Handover`→handover_report/item with supersedes lineage.

Derived data (`staffingGap`, candidate eligibility, fairness explanation, duty dimensions) is read-only. Client input cannot set workload totals, audit actor/timestamps, assignment origin/status, approval grant, version lineage or notification delivery state.

## 8. Enforcement, transactions and concurrency

Frontend performs format/required-field checks for usability. Backend is final authority for eligibility, availability, staffing, duplicate holiday assignment, roster state, authority and transitions. MySQL foreign/unique/check constraints support integrity; services perform cross-row/state checks.

Generation persistence, publication, manual draft changes, replacement approval/rejection, standby activation and revision publication are transactional service operations. Replacement approval locks/revalidates request/version/candidate state; publication is all-or-nothing. Notifications use transactional outbox and cannot roll back the committed business change. No distributed transaction or client-calculated fairness is allowed.

## 9. Security and frontend/backend implementation contract

### Antigravity frontend

Use Vanilla JS ES Modules with a centralized `api/` service layer: `session.js`, `employees.js`, `holidays.js`, `availability.js`, `roster.js`, `replacements.js`, `history.js`, `handover.js`, `notifications.js`, `help.js`. Read `{baseUrl}` from environment/build configuration. Attach CSRF token to mutations; handle 401 by clearing local view state and returning to login; handle 403 as no-access, 409 by refreshing versioned data, and 422 using `fieldErrors`. Disable duplicate submissions while commands are pending. Do not calculate fairness, approve replacements, infer publication, credit standby duty, or access the database.

### Codex backend

Implement Spring MVC controllers as transport adapters; request DTO + Jakarta Validation at the boundary; service layer for authorization/workflow/transactions; repositories only for persistence; mappers between entity and DTO; `@ControllerAdvice` for the standard error schema; Spring Security sessions/CSRF and server-side permission checks. Use optimistic locking/ETag adaptation for `rowVersion`; record audit/outbox in the same transaction. Publish generated OpenAPI from the checked-in `openapi.yaml` or keep generated output conformant to it. No new backend framework or database is authorized.

## 10. Traceability and gaps

### 10.1 Final authorized contract additions (v2.1)

The synchronized OpenAPI operations `changePassword`, `requestPasswordReset`, `resetPassword`, `inviteEmployeeAccount`, `activateAccount`, `setEmployeeAccountStatus`, `listApprovalGrants`, `createApprovalGrant`, `revokeApprovalGrant`, and `createRosterRevision` implement FDR-03, FDR-09/10 and FDR-13. They require validation, audit, authorization and error handling as specified in the OpenAPI operation descriptions. Revision creates a draft child version only; another authorized publisher must publish it. No `duty completion` or `handover acknowledgement` operation exists. Existing candidate discovery and empty-slot creation operations remain supported.

The endpoint catalogue plus OpenAPI v2.1 define the contract. Document 08 §12.2 maps all 31 screens. Password, invitation, grant administration, and closed-period correction now have operations. Duty completion and handover acknowledgement are excluded; manual candidate lookup and empty-slot assignment are supported. Dashboard aggregates and free-text employee search are not required; availability impact is returned through applicable validation and replacement flows, not a separate API.

## 11. Open API decisions and blockers

| ID | Question / impact | Affected work | Owner / recommendation |
|---|---|---|---|
| FDR-03 | Scoped approval grants/recusal | API-ORG-07, API-REP-02/03 | Resolved; named grantees are customer setup |
| FDR-04/05 | Explicit staffing and immediate availability | API-HOL/AVL and generation/publish validation | Resolved |
| FDR-02 | Exact fairness objective/tie-break | Generation implementation/explanations | Resolved; policy version 1 |
| FDR-01/08 | Completion excluded; handover ack excluded | No corresponding write operations | Out of initial release |
| FDR-09/10 | Closed revision and holiday history | API-ROS-09 | Resolved |
| SETUP-01 | Repository/handoff/base URL | Cross-agent integration | Design resolved; actual provisioning and environment URL external setup |

### 11.1 Reconciliation of six reported gaps

| Capability | Reconciliation | Contract treatment |
|---|---|---|
| Password management | FDR-13 defines invite/activation, change, generic reset, token expiry and revocation | Fully supported by `inviteEmployeeAccount`, `activateAccount`, `changePassword`, `requestPasswordReset`, `resetPassword`; email provider remains deployment dependency |
| Manual assignment candidates and empty slots | Manual selection is confirmed (FR-MAN-01; BR-MAN-001..005; Roles WF-07). Existing `updateDraftAssignment` only changes a known assignment and does not provide eligible candidates or create an assignment for an unfilled `roster_slot`. | Added API-ROS-07 and API-ROS-08; no fairness ranking. Existing data model supports the operations. |
| Duty completion | FDR-01 explicitly prohibits completion and actual-performer workflows | EXCLUDED; no endpoint/table/UI operation |
| Handover acknowledgement | FDR-08 chooses informational immutable reports and linked addenda | EXCLUDED; no acknowledgement endpoint |
| Approval-grant administration | FDR-03 defines scoped, time-bounded grant and conflict controls | Fully supported by `listApprovalGrants`, `createApprovalGrant`, `revokeApprovalGrant` |
| Closed-period revision | FDR-09/10 requires reasoned immutable child version, two-person publish and history | Fully supported by `createRosterRevision` plus `publishRosterVersion` |

## 12. Validation and implementation status

Contract v2.1 is finalized under reconciliation authority. All 31 frontend screen actions map to existing or newly added OpenAPI operationIds. YAML parsing and local reference/operationId validation are recorded in the final readiness report. No application server, database, browser, integration or end-to-end test was executed in this documentation exercise.
