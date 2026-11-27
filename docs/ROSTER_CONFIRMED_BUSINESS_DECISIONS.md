# HOLIDAY SUPPORT ROSTER MANAGEMENT SYSTEM
# CONFIRMED BUSINESS DECISIONS

**Document ID:** ROSTER-PO-DECISIONS-001  
**Version:** 1.1  
**Status:** Authoritative decision register — final reconciliations recorded  
**Purpose:** Authoritative reference for validating all project documents and future implementation specifications.

---

## 1. Purpose of This Document

This document consolidates the business decisions confirmed by the Product Owner during the design of the Holiday Support Roster Management System.

It must be used as a reference when reviewing:

1. Final Product Requirements Document.
2. Domain & Business Rules.
3. Roles, Permissions & Workflows.
4. System Architecture.
5. Database Design.
6. Backend Technical Specification.
7. API Contract.
8. Frontend Specification.
9. Testing & QA Strategy.

Every document must remain consistent with these decisions.

Do not silently change a confirmed business rule. If a contradiction is identified, document it and request clarification.

This document distinguishes Product Owner-confirmed decisions from decisions finalized under the separate reconciliation authority in Part F.

### Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 27 Nov 2026 | Initial Product Owner-confirmed baseline and legacy open-decision register. |
| 1.1 | 27 Nov 2026 | Added final reconciliation decisions FDR-01..18 under explicit Product Owner authorization; marked conflicting legacy entries superseded and retained provenance. |

### 1.1 Final reconciliation authority and precedence

The Product Owner's `FINAL AUTHORIZED DECISION UPDATE & PRE-DEVELOPMENT RECONCILIATION` dated 27 November 2026 authorizes ordinary policy and technical decisions within the approved scope. Part F records resulting decisions as `FINALIZED_UNDER_RECONCILIATION_AUTHORITY`; this provenance must not be shortened to or represented as `PRODUCT_OWNER_APPROVED`. Part F is the active rule set and supersedes conflicting earlier text in Parts A–E and the legacy open-decision list in Part C. Historical language remains for traceability only. The explicit exclusions and technology constraints remain unchanged.

---

# PART A — PRODUCT OWNER-CONFIRMED DECISIONS (ACTIVE UNLESS SUPERSEDED BY PART F)

## 2. Application Scope

The application is an internal Holiday Support Roster Management System.

Its primary responsibility is to manage holiday support personnel allocation.

The application must support:

- Employee and team management.
- Holiday configuration.
- Configurable personnel requirements per holiday.
- Automatic roster generation.
- Fair allocation across employees.
- Same-team pairing preference.
- Draft and published roster management.
- Manual assignment by authorized Managers.
- Employee availability and unavailability reporting.
- Manager-approved replacement.
- Standby/backup management.
- Actual duty tracking.
- Duty history and workload analytics.
- Handover information.
- Notifications.
- Audit history.
- Role-based onboarding.
- Searchable Help Center.

### Existing ticketing platform

The existing ticketing platform continues to manage regular ticket assignment and ticket operations.

This application must not replace or duplicate those responsibilities.

Each support employee continues to handle their own tickets through the existing platform.

The roster application does not need to implement shared ticket ownership or cross-team ticket assignment.

### Explicit exclusions

The application must not introduce:

- Comp-Off or compensatory leave.
- Leave management.
- Attendance management.
- Payroll management.
- Ticket management.
- Ticket assignment functionality.

Comp-Off is completely excluded from the project.

---

## 3. Configurable Personnel Requirements Per Holiday

**Confirmed decision: Personnel count must be configurable individually for every holiday.**

The system must not permanently enforce a fixed number of support personnel.

The Admin/Manager must be able to configure the number of active support personnel required for a particular holiday.

Examples:

| Holiday | Required active personnel |
|---|---:|
| Holiday A | 2 |
| Holiday B | 3 |
| Holiday C | 4 |
| Holiday D | 5 |
| Holiday E | 6 |

These are illustrative examples, not hardcoded limits.

Requirements:

- Each holiday must have its own staffing requirement.
- Different holidays may have different requirements.
- The roster generator must respect the configured requirement.
- The system must validate whether enough eligible employees are available.
- If insufficient candidates exist, the system must report the shortage.
- The system must not silently publish an incomplete roster as though it were valid.

Active Primary personnel and Standby backup personnel must be represented as distinct concepts.

The exact configuration of Primary count and Standby count separately remains subject to the open decisions section.

---

## 4. No Fixed Cooldown Period

**Confirmed decision: Remove the fixed 14-day cooldown.**

Indian public holidays can occur close together, including consecutive days or multiple holidays within a short period.

A fixed cooldown could unnecessarily restrict the available employee pool.

Therefore:

- No fixed 14-day cooldown.
- No arbitrary date-based eligibility restriction.
- Employees must not be blocked solely because they performed a recent holiday duty.
- Historical workload fairness must drive allocation.
- Recent assignments may be considered as a secondary consideration when candidates have otherwise comparable workloads.

The system must remain capable of assigning an employee again when required by legitimate staffing constraints.

---

## 5. Organization-Wide Fairness

**Confirmed decision: Fairness must be calculated across all employees in the organization.**

The system must not maintain separate team-wise fairness quotas.

All eligible employees across all teams belong to one common fairness pool.

Requirements:

- No independent team-wise fairness counters.
- No separate team allocation quotas.
- Employees with lower actual duty workload should receive higher allocation priority.
- Team membership must not cause an employee to be systematically favored or disadvantaged.
- Same-team pairing is a preference, not a separate fairness system.

The objective is to distribute holiday support duties fairly across the entire organization.

---

## 6. Same-Team Pairing Preference

**Confirmed decision: Prefer allocating employees from the same team together for a particular holiday.**

The reason is operational familiarity and employee comfort.

Employees belonging to the same team may be more comfortable working together.

Rules:

1. Prefer eligible employees from the same team when practical.
2. If sufficient eligible employees are not available in that team, include employees from another team.
3. Same-team pairing is not mandatory.
4. It must not override organization-wide fairness.
5. It must not override mandatory eligibility or availability.
6. No mandatory cross-team representation is required.

Example:

For a holiday requiring two active support employees:

Preferred:
- Employee A1 — Team A.
- Employee A2 — Team A.

Fallback:
- Employee A1 — Team A.
- Employee B1 — Team B.

The same principle applies when more than two active support personnel are required.

The allocation engine must evaluate the combination of employees, rather than blindly selecting individuals independently.

---

## 7. Sequential Chronological Allocation

**Confirmed decision: Holidays must be processed sequentially in chronological order.**

The allocation engine must process the selected holidays from earliest to latest.

Example:

| Holiday | Date | Allocation order |
|---|---|---:|
| H1 | August 15 | 1 |
| H2 | August 17 | 2 |
| H3 | August 21 | 3 |
| H4 | August 25 | 4 |
| H5 | August 30 | 5 |

Requirements:

- Earlier holiday allocations must influence subsequent allocations.
- Temporary workload must be updated after each allocation.
- Draft assignments must not alter official historical workload.
- The generation process must not treat each holiday independently.
- The algorithm must evaluate overall fairness across the selected holiday period.

### Global fairness validation

A simple greedy allocation algorithm is not sufficient if it creates avoidable unfairness.

The system should:

1. Generate allocations chronologically.
2. Update temporary workload after each holiday.
3. Evaluate the impact of allocations on later holidays.
4. Validate the overall workload distribution.
5. Reconsider earlier choices through controlled reassignment or backtracking when a better valid result is available.
6. Preserve deterministic and explainable results.

The final allocation engine must be tested against complex scheduling scenarios before approval.

---

## 8. Primary and Standby Responsibilities

**Confirmed decision: Standby is a backup option, not an active support assignment.**

### Primary personnel

Primary personnel are responsible for providing actual holiday support.

Actual completed Primary duties contribute to official workload fairness.

### Standby personnel

Standby personnel are backup resources.

They are not automatically expected to work.

Rules:

- Standby designation alone does not count as an actual completed duty.
- Standby assignment history should be retained.
- Standby assignment counts should be visible separately.
- If Standby is activated and performs support, the actual duty is attributed to that person.
- The original assignment must remain historically traceable.

### Standby activation

When a Primary employee becomes unavailable:

1. The system identifies the designated Standby person.
2. The system checks their eligibility and availability.
3. The system suggests that person as the first backup option.
4. The Manager approves the replacement.
5. If the suggested Standby person is unavailable or unsuitable, the Manager can select another eligible employee.
6. The system records the replacement and approval history.

---

## 9. Workload and Duty Accounting

**Confirmed decision: Actual completed Primary duties determine historical workload fairness.**

The system must maintain reliable duty history for every employee.

The following information must be distinguishable:

- Actual completed Primary duties.
- Published/future Primary assignments.
- Standby assignments.
- Standby activations.
- Duties performed after Standby activation.
- Cancelled assignments.
- Replaced assignments.
- Draft assignments.

Rules:

1. Actual completed Primary duties count towards official workload fairness.
2. Standby-only assignments do not count as actual completed duties.
3. Draft assignments do not change official historical workload.
4. Temporary draft assignments influence later allocations within the same generation run.
5. If an employee is replaced before performing the duty, that assignment must not be counted as a completed duty for that employee.
6. Historical assignment records must be preserved.
7. Workload totals must be based on authoritative duty history rather than manually maintained counters alone.

The system may maintain separate statistics for Primary and Standby.

However, Standby-only assignments must never be presented as completed support duties.

---

## 10. Automatic Roster Generation

The application must provide automatic roster generation.

The generation engine must consider:

- Holiday date.
- Configured active personnel count.
- Standby requirement, where applicable.
- Employee eligibility.
- Employee availability.
- Historical actual duty workload.
- Temporary assignments from earlier holidays in the generation run.
- Same-team pairing preference.
- Approved participation rules.
- Existing roster history and revision rules.

The engine must:

- Generate allocations chronologically.
- Maintain organization-wide fairness.
- Prefer same-team combinations when reasonable.
- Avoid unnecessary repeated assignments.
- Respect mandatory eligibility rules.
- Detect insufficient candidates.
- Explain allocation decisions.
- Produce an auditable generation result.

Automatic generation creates a draft for review. It must not silently publish the roster.

---

## 11. Manual Allocation by Manager

**Confirmed decision: Automatic allocation must coexist with manual assignment flexibility.**

The Manager must be able to manually select or add an employee to a holiday roster.

Requirements:

- Manager can manually select an eligible employee.
- System validates employment eligibility.
- System validates availability.
- System checks the configured staffing requirement.
- System warns about fairness imbalance where relevant.
- System records the manual override reason.
- System records the actor and timestamp.
- Previous assignment history must be preserved.
- The system must distinguish automatically generated assignments from manually selected assignments.

Manual assignment must not silently bypass mandatory eligibility rules.

The exact authorization boundary between Manager and Admin must follow the approved Roles, Permissions & Workflows document.

---

## 12. Employee Unavailability and Manager-Approved Replacement

**Confirmed decision: A Manager must approve replacement of an already assigned employee who becomes unavailable.**

This is a critical business workflow.

### Scenario

An employee has already been assigned to provide holiday support.

Later, the employee reports that they cannot attend or perform the assigned duty because of an unforeseen reason.

The system must initiate a replacement workflow.

### Required workflow

**Step 1 — Employee reports unavailability**

The assigned employee submits an unavailability request against the specific holiday assignment.

The request should capture:

- Holiday.
- Assigned duty.
- Reason for unavailability.
- Supporting information, if required.
- Submission timestamp.

**Step 2 — System requests Manager action**

The system creates a replacement request and notifies the responsible Manager.

The existing assignment must not be silently changed.

**Step 3 — System identifies backup**

The system checks the designated Standby employee.

If the Standby employee is eligible and available, the system suggests that person as the first replacement option.

**Step 4 — Manager decides**

The Manager can:

- Approve the suggested Standby replacement.
- Select another eligible employee manually.
- Reject the request.
- Request additional information where appropriate.

**Step 5 — System validates replacement**

Before confirmation, the system checks:

- Employment eligibility.
- Availability.
- Existing assignments.
- Holiday staffing requirements.
- Relevant assignment conflicts.

**Step 6 — Assignment changes after approval**

Only after the required Manager approval should the effective roster assignment be changed.

**Step 7 — Historical record preserved**

The application must preserve:

- Original assigned employee.
- Replacement employee.
- Original assignment.
- Replacement request.
- Reason.
- Manager decision.
- Approver identity.
- Approval timestamp.
- Assignment change history.

### If Standby is unavailable

If the designated Standby employee is also unavailable or ineligible:

- The system must allow the Manager to select another eligible employee.
- The Manager must be able to choose an employee from another team.
- The system must clearly display the unresolved staffing gap if no eligible employee exists.

### Important distinction

One-way replacement and mutual swap are different workflows.

A replacement does not require the replacement employee to exchange another holiday duty.

A mutual date-for-date swap, if retained in scope, must be handled separately.

---

## 13. Draft and Published Roster

The application must maintain clear separation between draft and published roster versions.

### Draft

- Generated allocations remain provisional.
- Draft assignments do not modify official historical duty workload.
- Temporary allocations influence later holidays in the same generation run.
- Managers can review and manually adjust drafts.
- Draft changes must be traceable.

### Published

- Publication establishes the official roster version.
- Published assignments must be retained historically.
- Changes after publication require an authorized replacement or revision workflow.
- Published history must not be silently overwritten.
- The system must preserve who published the roster and when.

---

## 14. Availability and Eligibility

The system must consider employee availability when generating rosters.

Requirements:

- Employees can report availability/unavailability according to the approved workflow.
- Unavailable employees must not be treated as ordinary eligible candidates for that date.
- The system must validate replacement availability.
- Employee joining, leaving, deactivation, and team transfer must be represented with effective dates.
- Historical team membership must remain available for historical roster interpretation.

Manager approval for replacing an already assigned employee is mandatory.

Approval requirements for ordinary availability submissions remain subject to the approved workflow specification.

---

## 15. Duty Visibility and Analytics

**Confirmed decision: The application must clearly show how many duties each employee has actually performed.**

The system must provide useful duty observations for Managers and other authorized roles.

At minimum, provide:

### Employee-level statistics

- Total actual completed duties.
- Actual Primary duties.
- Standby assignments.
- Standby activations.
- Duties performed after Standby activation.
- Future published assignments.
- Draft assignments, clearly identified as provisional.

### Historical information

- Holiday date.
- Holiday name.
- Employee assigned.
- Assignment type.
- Whether the assignment was completed.
- Whether replacement occurred.
- Whether Standby was activated.

### Organization-wide reporting

The application should provide:

- Duty distribution across all employees.
- Employee workload comparisons.
- Duty history by date range.
- Primary duty distribution.
- Standby assignment distribution.
- Replacement and activation statistics.
- Filters by employee, team, date range, and duty status, subject to permissions.

The system must never combine completed duties, future assignments, Standby-only assignments, and draft assignments into one misleading total.

---

## 16. Audit and Explainability

The application must maintain auditable records for important business operations.

At minimum:

- Roster generation.
- Manual assignment.
- Roster publication.
- Published roster revision.
- Employee unavailability request.
- Replacement request.
- Manager approval or rejection.
- Standby activation.
- Assignment replacement.
- Manual override.
- Relevant administrative changes.

Every important decision should be explainable.

The system should be able to show why an employee was selected, which fairness considerations were applied, and whether any exception occurred.

---

# PART B — CORE ALLOCATION ENGINE REQUIREMENTS

## 17. Allocation Engine Principles

The allocation engine is the most important business component of the application.

Its design must receive special attention during domain modelling, architecture, database design, backend implementation, and testing.

### Allocation input

- Selected holidays.
- Required active personnel count for each holiday.
- Standby requirement, if applicable.
- Employee eligibility.
- Employee availability.
- Historical actual Primary duty workload.
- Effective team membership.
- Temporary allocations in the current generation run.
- Team Leader participation rules.
- Existing published assignments and revision constraints.

### Allocation priority

The engine should follow this general hierarchy:

1. Mandatory eligibility and availability.
2. Organization-wide historical workload fairness.
3. Fair combinations of employees for each holiday.
4. Same-team pairing preference.
5. Primary/Standby role requirements, where configured.
6. Recent assignment history as a secondary consideration.
7. Deterministic tie-breaking.

This hierarchy must be formalized into a precise algorithm with clearly defined hard constraints and soft preferences.

### Sequential generation

- Process holidays chronologically.
- Update temporary workload after each allocation.
- Evaluate future holiday feasibility.
- Perform global fairness validation.
- Reconsider earlier allocations when appropriate.
- Preserve reproducibility and auditability.

### Required edge-case coverage

The algorithm must be tested for:

1. Multiple consecutive holidays.
2. Multiple holidays within one week.
3. Different staffing counts across holidays.
4. Unequal team sizes.
5. Insufficient employees in one team.
6. Same-team preference conflicting with fairness.
7. Equal workload among candidates.
8. Employees with no historical duty.
9. Mid-period joiners.
10. Employees leaving or becoming inactive.
11. Team transfers.
12. Employee unavailability before generation.
13. Employee unavailability after publication.
14. Standby person becoming unavailable.
15. No eligible Standby person.
16. No eligible replacement.
17. Manager manually choosing a replacement.
18. Multiple unavailable employees on the same holiday.
19. Draft regeneration.
20. Manual changes followed by regeneration.
21. Published roster revisions.
22. Concurrent Manager actions.
23. Repeated generation with identical inputs.
24. Historical data import.
25. Partial staffing feasibility.

The system must report unavoidable exceptions instead of pretending perfect equality is always possible.

---

# PART C — HISTORICAL OPEN DECISIONS (SUPERSEDED WHERE PART F RESOLVES THEM)

The following list records the state before the final reconciliation authorization. It is historical and is not a list of active blockers; consult Part F for current status. Any item not explicitly resolved in Part F remains open as stated here.

The following matters must not be assumed to be approved merely because they are mentioned here.

1. Should active Primary count and Standby count be configured separately for each holiday?
2. Should a default Standby count be automatically suggested?
3. Are mutual date-for-date swaps retained in scope in addition to one-way replacement?
4. Do ordinary availability submissions require approval?
5. What is the precise employee eligibility boundary on their joining and last working dates?
6. What fairness baseline should be used for new joiners?
7. Can Admins participate as support personnel?
8. Can a team have multiple simultaneous Team Leads?
9. Can an employee belong to multiple teams simultaneously?
10. Does holiday identity remain unchanged when its date is edited?
11. Is holiday completion derived or explicitly recorded?
12. Is handover acknowledgement mandatory?
13. Are submitted handover notes immutable with addenda?
14. Is email the only initial notification channel?
15. How should historical data imports handle partially invalid records?
16. Can closed roster periods receive controlled revisions?
17. Which database migration tool is approved?

Resolve these decisions with the Product Owner or the authoritative approved source document.

Do not silently invent answers.

---

# PART D — DOCUMENT CONSISTENCY CHECKLIST

## 18. Mandatory Review Checklist

Use this checklist when reviewing every existing and future project document.

### Product requirements

- [ ] Per-holiday staffing count is configurable.
- [ ] Active support and Standby are distinct.
- [ ] No fixed 14-day cooldown exists.
- [ ] Organization-wide fairness is used.
- [ ] Same-team pairing is preferred, not mandatory.
- [ ] Sequential chronological allocation is specified.
- [ ] Global fairness validation is included.

### Workload

- [ ] Actual completed Primary duties determine historical workload fairness.
- [ ] Standby-only assignments do not count as completed duties.
- [ ] Standby activation attributes actual duty to the person who performed it.
- [ ] Draft allocations do not change official workload.
- [ ] Duty history is preserved.
- [ ] Per-employee duty counts are available.
- [ ] Planned, draft, Standby, and completed duties are distinguishable.

### Replacement

- [ ] Employee can report unavailability for an existing assignment.
- [ ] Replacement request is created.
- [ ] Manager approval is required before assignment changes.
- [ ] System suggests the eligible Standby person first where available.
- [ ] Manager can manually select another eligible person.
- [ ] Replacement eligibility and availability are validated.
- [ ] Original assignment remains historically traceable.
- [ ] Approval and rejection decisions are audited.

### Allocation flexibility

- [ ] Automatic roster generation is supported.
- [ ] Manager manual assignment is supported.
- [ ] Manual overrides are validated and audited.
- [ ] Insufficient candidate situations are clearly reported.
- [ ] Allocation decisions are explainable.

### Project boundaries

- [ ] Existing ticketing platform remains separate.
- [ ] No Comp-Off functionality is introduced.
- [ ] No leave management, attendance, payroll, or ticketing replacement is introduced.

---

# PART E — GOVERNANCE

## 19. Change Management

This document represents the confirmed business decisions discussed with the Product Owner.

It does not automatically mean that all four existing project documents have been updated or formally approved.

Whenever a decision changes, including one finalized under expressly delegated reconciliation authority:

1. Record the old decision.
2. Record the new decision.
3. Record provenance accurately; seek additional Product Owner confirmation only when the existing authorization does not delegate the decision.
4. Identify impacted documents and sections.
5. Update the affected documents consistently.
6. Perform a cross-document consistency audit.
7. Preserve historical roster and audit records.

Do not modify historical operational facts simply because a future business rule changes.

## 20. Final Authority

This document is the consolidated reference for the Product Owner decisions recorded to date.

If any existing document contradicts a confirmed decision:

- Identify the contradiction.
- Explain the impact.
- Recommend a correction.
- Obtain approval where needed.
- Reconcile the affected documents.

Unresolved decisions remain unresolved until explicitly approved.

# PART F — FINAL DECISIONS UNDER RECONCILIATION AUTHORITY

**Authority:** Product Owner's explicit final reconciliation authorization dated 27 November 2026. Every row below is `FINALIZED_UNDER_RECONCILIATION_AUTHORITY`, not a claim of prior explicit PO approval. These decisions are active and supersede conflicting legacy statements above.

| ID | Final decision | Rationale and scope | Affected documents/status |
|---|---|---|---|
| FDR-01 | Official fairness workload is the count of effective published Primary assignments. Each effective published Primary slot contributes one credit to its current assignee. A replacement transfers that slot's credit; the outgoing assignee loses it. Draft, Standby designation, activation alone, and unverified performance add no Primary credit. No duty-completion, attendance/audit, or actual-performer workflow is in initial release. | Uses authoritative assignment history; avoids unverified post-duty facts and prohibited completion workflow. Credit is unique per effective holiday/slot, not multiplied by immutable version history. | Supersedes BD-006/013/023 and actual-completed-duty statements; PRD, Domain, Architecture, DB, Backend, API, Frontend, QA updated. |
| FDR-02 | Exact deterministic global allocation is lexicographic: (1) hard eligibility/availability/one slot per employee per holiday; (2) minimize the descending vector of effective published Primary credits plus the complete proposed Primary allocation over employees eligible for at least one selected slot; (3) maximize same-team pairings among equally fair feasible rosters; (4) maximize, among still-equal outcomes, the sorted ascending days-since-last-effective-published-Primary vector (no prior assignment sorts as infinite; no fixed recency window); (5) break remaining ties using a stable hash of canonical input fingerprint, algorithm version, slot key and employee code. Standby is assigned separately and earns no Primary credit. | Makes global, reproducible comparison explicit without team quotas, fixed cooldowns or invented historical data. The vector and every tie-break step are returned in explanations. | Resolves OD-06; Domain, Backend, DB, API, QA updated; algorithm policy version `1`. |
| FDR-03 | Replacement approval uses a separately scoped `REPLACEMENT.APPROVE` capability, not a fourth application role and not an automatic Admin/TL privilege. Admins with `ORG.AUTHORITY.MANAGE` may grant it to an identified account for explicit team or organization scope and validity dates; the grantor cannot grant their own authority. Requester, affected assignee, and any candidate are recused from that request. A delegate requires a separate time-bounded grant; no automatic delegation. If no unconflicted authorized approver exists, request stays pending, no assignment changes, and an operational escalation is raised. | Least privilege and separation of duties; organizational appointment is configured by the customer, not invented here. | Resolves OD-01/16; Roles, Architecture, DB, Backend, API, Frontend, QA updated. Account appointment is deployment data, not a spec blocker. |
| FDR-04 | Every holiday requires explicit Primary count ≥1 and Standby count ≥0; no defaults. Primary plus Standby counts cannot exceed the active rotation-eligible employee pool for that date; each configured slot must be assigned to a distinct eligible employee. Date-specific availability infeasibility is reported by generation and blocks publication until corrected or authorized staffing configuration changes. | Prevents silent staffing assumptions and impossible cardinality while preserving dynamic counts. | Resolves OD-02; PRD, Domain, DB, Backend, API, Frontend, QA updated. |
| FDR-05 | Availability submission/update is immediately effective for future generation and draft validation. It cannot alter or remove a published assignment. A conflict with a published assignment must be reported through the assignment-specific replacement request, which requires Manager approval. Withdrawals restore availability only prospectively. Draft/generation snapshots become stale when source availability changes; publish and manual writes revalidate current facts. | Simple declaration lifecycle with no silent roster mutation. | Resolves OD-03; PRD, Domain, Roles, DB, Backend, API, Frontend, QA updated. |
| FDR-06 | A new or otherwise history-free employee starts with zero effective published Primary credits. Missing history is not imputed, normalized, or penalized. They compete using the same global credit comparison; tie-breaks apply only after fairness equivalence. | Avoids fabricated workload and disadvantage for missing data. | Resolves OD-04; PRD, Domain, DB, Backend, QA updated. |
| FDR-07 | An employee has at most one active team membership on any business date; memberships are effective-dated and non-overlapping. Each team has at most one active Team Lead at a time; successive leads are allowed and retained historically. An employee may hold multiple role assignments but team membership alone never grants permission. All active rotation-eligible employees, including Admins and TLs, may be roster candidates unless explicitly marked ineligible. | Simplest model that preserves historical context and team preference without quotas or privilege-based exclusion. | Resolves OD-05 and Admin participation; PRD, Domain, Roles, DB, Backend, QA updated. |
| FDR-08 | Initial release handover is assignment-linked, informational, and authored by an authorized participant. Submitted reports/items are immutable; corrections are a new clearly linked report/addendum. No receiver acknowledgement, mandatory recipient, or acknowledgement retention workflow is included. Retain records with roster/audit history; no automatic deletion absent a customer retention policy. | Preserves useful handover while excluding an unnecessary acknowledgement workflow. | Resolves OD-09 as `OUT_OF_INITIAL_RELEASE_SCOPE`; update FR-HO/API/DB/UI/QA; no acknowledgement endpoint/entity. |
| FDR-09 | Published corrections (including closed periods and holiday date/staffing changes) require a reasoned new version. An operator with `ROSTER.REVISE` initiates; a different actor with `ROSTER.PUBLISH` validates and publishes. Previous versions remain immutable. Effective workload credits are recalculated once per holiday/slot from the resulting effective published assignment; no double credit for version copies. Replacement approvals remain their own mandatory workflow. | Append-only history, two-person control, no silent edits. No duty completion is involved. | Resolves OD-10; PRD, Domain, Roles, Architecture, DB, Backend, API, Frontend, QA updated. |
| FDR-10 | Holiday identity is stable after creation. Before any published roster reference, date/staffing edits are versioned and audited. After publication, date/staffing changes or cancellation create a proposed roster revision; only its authorized publication changes effective assignments. Cancellation is a status transition, not deletion. Affected employees receive in-app and configured email notices after commit. | Prevents history mutation and preserves FK references. | Resolves OD-11; PRD, Domain, DB, Backend, API, QA updated. |
| FDR-11 | Historical import is outside the initial release. Initial fairness starts from the published assignment history entered through this application; no historical credits are fabricated. | The PRD does not require import and the authorized prompt directs exclusion absent such requirement. | Resolves OD-12 as `OUT_OF_INITIAL_RELEASE_SCOPE`; remove import dependencies from initial-release docs. |
| FDR-12 | Initial notifications: in-app for workflow events; email via provider-neutral Spring Mail/SMTP configuration for invitations, replacement requests/decisions, unresolved gaps, and publication. Each event/recipient/channel is idempotent. Retry failures after 1m, 5m, 30m, 2h and 12h (five attempts); then mark FAILED, retain intent, expose in-app/operations alert, and permit authorized retry. Notification failure never rolls back the business event. | Provider and credentials remain external; users still receive in-app history. | Finalizes logical policy under reconciliation authority; provider-neutral config. Architecture, DB, Backend, API, Security/Ops, QA updated. OD-15 resolved for design; actual SMTP provider/credentials remain `EXTERNAL_DEPENDENCY`. |
| FDR-13 | Account lifecycle uses Admin-created employee-linked invitations, hashed single-use activation token (24h), password setup, login, authenticated current-password change, generic password-reset request and hashed single-use reset token (30m), activation/deactivation and immediate session revocation on password reset, deactivation or role/permission change. Store password hashes only. Require 12–72 UTF-8 bytes, at least 12 characters, no arbitrary composition rules; BCrypt cost 12; reset response does not reveal account existence. | Uses approved Spring Security, no third-party identity provider. Invite/reset email delivery uses configured provider-neutral mail. | Finalizes initial-release password/account policy; API/security/DB/Backend/UI updated. Email delivery is external dependency. |
| FDR-14 | Use Flyway versioned SQL migrations, pinned via Spring Boot dependency management. Apply forward-only migrations in order. Do not run destructive rollback migrations; recover using verified backup and corrective forward migration. Separate MySQL databases/credentials for development, test and production; startup refuses production schema drift. | Standard Spring Boot/MySQL fit; explicit reversible data protection and controlled schema history. | Resolves OD-13 as `FINALIZED_UNDER_RECONCILIATION_AUTHORITY`; architecture ADR, DB, Backend and Roadmap updated. |
| FDR-15 | Integration workflow: API contract and OpenAPI are version-controlled boundary. Antigravity owns frontend changes; Codex owns backend and final source integration, API integration and E2E verification; defects route by owning layer, contract changes require synchronized Document 07/OpenAPI update. Until a shared repo is provisioned, use controlled handoff bundles containing source snapshot, commit/hash if available, changed-file manifest and contract version; receiving owner imports/reviews before integration. Environment base URL is injected from environment configuration, never hardcoded. | Concrete process without claiming agents share workspace or that a repository is already configured. | SETUP-01 design resolved; actual shared repository provisioning (preferred) or bundle exchange, credentials and deployment URL remain `EXTERNAL_DEPENDENCY`. Architecture, Backend, API, Roadmap and memory updated. |
| FDR-16 | Security defaults: same-origin session cookie (Secure in deployed environments, HttpOnly, SameSite=Lax), CSRF on mutations, 30-minute idle and 12-hour absolute session, session ID rotation at authentication, generic auth/reset errors, progressive login delay and 15-minute lock after 10 consecutive failures, per-account/IP request limits; TLS; CSP and standard security headers; strict same-origin CORS; DTO validation/output encoding; secrets from environment/secret manager; dependency scanning at build; append-only audit access; PII minimization. | Practical internal-app baseline. Rate limits are configurable; account recovery remains non-enumerating. | Security specs updated; real secret manager/TLS cert and CI scanning platform are environment dependencies, not policy blockers. |
| FDR-17 | Operations: three isolated environments; structured JSON logs/correlation IDs; health/readiness endpoints with no sensitive details; monitor app/DB/mail/outbox/generation/publication failures; nightly encrypted DB backup, 30-day retention, quarterly restore drill; deploy immutable artifact after migration backup; rollback app artifact only if schema-compatible, otherwise roll forward; operational owner is customer-designated Admin/IT. | Safe default operations without naming provider, hosting, or company personnel. | Architecture, Security/Ops and Roadmap updated. Hosting, SMTP, secret store and named operators are `EXTERNAL_DEPENDENCY`. |
| FDR-18 | The project specification baseline is finalized under this authorization. Implementation may begin against the current versions; actual organization timezone, employee/team roster, named scoped approvers/publishers, email/secret credentials, configured shared source/handoff, and environment URL must be supplied before corresponding end-to-end/production use. | Separates complete specification from external setup/execution. | Update status across PRD/architecture/DB/backend/API/frontend/memory/report; no claim that external setup or runtime verification is complete. |

### Superseded legacy decision entries

`BD-006`, `BD-013`, and `BD-023` are **SUPERSEDED by FDR-01**. Legacy references to actual completed duty as the official fairness basis, completion evidence, or actual-performer confirmation are historical only. `BD-034` is **SUPERSEDED by FDR-14**. Open-decision items OD-01 through OD-06, OD-08 through OD-13 are closed as stated in FDR-03 through FDR-14; OD-07 and OD-14 remain out of initial scope/non-blocking; OD-15 is resolved at design level with external provider configuration only; OD-16 is resolved by FDR-03.

**Current decision status:** No unresolved Product Owner policy decisions remain for the initial release. External organizational appointments and environment provisioning remain setup dependencies, not specification blockers.

**END OF DOCUMENT**
