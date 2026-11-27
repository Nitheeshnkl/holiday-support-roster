# Holiday Support Roster Management System
## Product Requirements Document

| Field | Value |
|---|---|
| Document ID | ROSTER-PRD-001 |
| Version | 5.4 |
| Date | 27 November 2026 |
| Status | Finalized under reconciliation authority — implementation baseline |
| Supersedes | `Roster_Corrected_Final_PRD_v4.md` (v4.0) |
| Related documents | `02_DOMAIN_AND_BUSINESS_RULES.md`; `03_ROLES_PERMISSIONS_AND_WORKFLOWS.md`; `04_SYSTEM_ARCHITECTURE.md`; `DATABASE_DESIGN_READINESS_REVIEW_v2.md` |
| Decision authority | `ROSTER_CONFIRMED_BUSINESS_DECISIONS.md` v1.1 — Part F contains final reconciliation decisions |
| Implementation authority | Specification baseline complete; implementation may start after external setup dependencies are supplied |

> This baseline is finalized under the Product Owner's 27 November 2026 reconciliation authorization. Decisions carry their recorded provenance in the decision register. No code, migration or deployment was performed by the reconciliation exercise.

## Revision history

| Version | Date | Change |
|---|---|---|
| 4.0 | 26 Nov 2026 | Existing corrected PRD baseline; source copy preserved in Project Library |
| 5.0 | 26 Nov 2026 | Reconciled staffing, global fairness, same-team preference, no fixed cooldown, standby accounting, manual assignment, manager-approved replacement, duty reporting and exclusions |
| 5.1 | 27 Nov 2026 | Incorporated `ROSTER-PO-DECISIONS-001` as the authoritative register; recorded confirmed v0/Replit/Antigravity workflow and the unresolved frontend-framework compatibility decision (ARC-01). |
| 5.2 | 27 Nov 2026 | Superseded v0/Replit workflow: Antigravity is frontend development and Codex is backend development; retained approved Vanilla JS and Java/Spring Boot stacks. |
| 5.3 | 27 Nov 2026 | Reconciled to decision register v1.1: published-assignment workload, deterministic fairness, availability, authority, staffing, revision, account, notification and initial-release boundaries finalized. |
| 5.4 | 27 Nov 2026 | Final cross-document alignment: clarified mutual swaps exclusion and synchronized finalized technical details to Part F. |

## 1. Product overview

### 1.1 Vision
Plan holiday support fairly, maintain coverage when assigned personnel become unavailable, preserve the complete history of assignments and approvals, and enable users to operate the system through role-aware self-service guidance.

### 1.2 Problem
Spreadsheet- and chat-based holiday support planning creates opaque allocation decisions, unowned coverage gaps, inconsistent availability handling, weak history and dependence on experienced colleagues for process knowledge.

### 1.3 Product
A secure internal web application that manages holiday support responsibilities, availability, roster generation, manual allocation, publication, replacement approval, standby backup, operational handover information, duty history, notifications, audit and self-service onboarding.

The existing ticketing platform continues to manage normal ticket assignment and ticket operations. This product does not duplicate or replace that platform.

## 2. Product objectives

- **OBJ-01 Fair allocation:** Use effective published Primary assignment credits across the organisation; authorized replacements transfer the credit.
- **OBJ-02 Coverage:** Make every assignment-affecting unavailability visible and route it through an owned replacement workflow.
- **OBJ-03 Controlled authority:** Require Manager approval before an existing assignment is replaced.
- **OBJ-04 Traceability:** Preserve original assignments, replacements, decisions, reasons, actors and timestamps.
- **OBJ-05 Operational visibility:** Show actual, planned, standby, draft and cancelled/replaced states separately.
- **OBJ-06 Dynamic staffing:** Configure staffing independently for each holiday.
- **OBJ-07 Usability:** Provide onboarding, contextual help, walkthroughs, FAQs and searchable guidance.
- **OBJ-08 Simplicity:** Retain a single-deployable modular monolith and the fixed technology stack.

## 3. Users and responsibilities

The source PRD defines exactly three application roles:

| Application role | High-level responsibility |
|---|---|
| Admin | Organisation and application administration, calendar configuration, roster oversight, publication, organisation-wide reporting, audit and Help Centre administration, subject to explicit permission boundaries |
| Team Lead (TL) | Team-scoped operational coordination and permitted first-level workflow responsibilities |
| Member | Employee self-service: maintain availability, view permitted roster information, report unavailability for own assignment, participate in replacement/handover workflows and complete onboarding |

**Manager approval authority:** Keep the three application roles Admin, TL and Member. Grant `REPLACEMENT.APPROVE` as a scoped, time-bounded capability to designated accounts; Admin has no approval right by default. A grantor with `ORG.AUTHORITY.MANAGE` cannot grant themself the capability. Requester, affected assignee, and every candidate are recused from a request. Delegation requires an explicit separate grant. If no unconflicted approver exists, keep the request pending, leave the assignment unchanged, and escalate operationally. (FDR-03)

“Employee” is the business/domain person concept and maps to the PRD’s Member application role unless the Product Owner approves a role-model change.

## 4. Scope

### 4.1 In scope
- Authentication and server-side role/permission enforcement.
- Dynamic employee and team administration, effective-dated history.
- Holiday calendar, holiday types, date-specific support requirements and duty windows.
- Employee availability and unavailability declarations.
- Automatic roster generation using organisation-wide fairness.
- Same-team pairing as a soft preference.
- Chronological allocation with temporary workload updates and whole-roster fairness validation.
- Manual employee selection/addition with mandatory eligibility and availability validation.
- Draft roster review, locking, publication and version history.
- Standby backup designation, activation history and actual-duty attribution.
- Manager-approved one-way replacement of an existing assignment.
- Unresolved staffing-gap visibility.
- Separately filterable duty history and workload reporting.
- Handover as operational information transfer, separate from replacement.
- Notifications, append-only audit, role-aware onboarding and Help Centre.

### 4.2 Explicit exclusions
- Comp-Off or compensatory leave/time off.
- Leave management or leave approval.
- Attendance management.
- Payroll.
- Ticket management, ticket assignment, ticket routing or ticket replacement.
- Shared ticket ownership assumptions.
- Unconfirmed ticketing-platform APIs, vendor contracts or payloads.
- Unapproved frontend-framework changes, Node.js backend, Python backend, MongoDB, microservices or an alternative database.
- Skill-based scheduling unless separately approved.

## 5. Functional requirements

### 5.1 Organisation and employee administration (FR-ORG)
- **FR-ORG-01:** Admin-authorised users can maintain dynamic teams and employee records without code changes.
- **FR-ORG-02:** Preserve effective-dated team membership, application role, employment status and rotation eligibility.
- **FR-ORG-03:** Deactivation or transfer must not erase historical roster or audit references.
- **FR-ORG-04:** The system must not infer that team membership alone grants permissions.
- **FR-ORG-05:** An employee has one active team membership at a time; historical memberships are effective-dated. Each team has at most one active Team Lead at a time. All active rotation-eligible employees, including Admins and TLs, may be scheduled. History-free employees begin at zero published Primary credits without imputed history. (FDR-06/07)

### 5.2 Holiday and staffing configuration (FR-HOL)
- **FR-HOL-01:** Authorized personnel configure the number of active Primary support employees separately for each holiday.
- **FR-HOL-02:** Optional Standby staffing is configured separately from active Primary staffing.
- **FR-HOL-03:** The system must not hardcode a permanent 2 Primary + 1 Standby arrangement.
- **FR-HOL-04:** Do not infer that Standby count is included in active Primary count.
- **FR-HOL-05:** Every holiday requires explicit Primary count ≥1 and Standby count ≥0. No defaults are applied. Primary + Standby counts may not exceed the active eligible employee pool for the date; availability-specific infeasibility is reported by generation.
- **FR-HOL-06:** Holiday identity remains stable. A date or staffing change after publication requires a reasoned new roster version, validated and published through the two-person revision/publish flow. Cancellation is a status transition, never deletion. (FDR-04/09/10)

### 5.3 Availability (FR-AVL)
- **FR-AVL-01:** Members can submit availability/unavailability for relevant dates and report unavailability against an existing assignment.
- **FR-AVL-02:** Availability is validated against the effective holiday and assignment state.
- **FR-AVL-03:** An availability declaration/change takes effect on submission for future generation and draft validation; it never changes a published assignment. Assignment conflicts use the assignment-specific replacement flow and mandatory approval. (FDR-05)
- **FR-AVL-04:** An unavailability report against an assigned holiday initiates a replacement request; it does not silently remove or replace the assignment.

### 5.4 Automatic roster generation (FR-GEN)
- **FR-GEN-01:** The system must generate draft rosters automatically.
- **FR-GEN-02:** Fairness is organisation-wide; there are no team-wise fairness quotas or team fairness counters.
- **FR-GEN-03:** The count of effective published Primary assignments drives historical fairness. Each effective holiday/slot counts once. Replacement transfers the credit; draft, Standby designation, activation alone, and unverified performance do not contribute.
- **FR-GEN-04:** No fixed 14-day cooldown or other arbitrary date-based exclusion may prevent selection.
- **FR-GEN-05:** Recent assignments may be considered only as a secondary consideration when workload is otherwise comparable; they must not operate as a fixed eligibility prohibition.
- **FR-GEN-06:** Prefer employees from the same team for a holiday as a soft preference. It must not override eligibility, availability or global fairness. Use another team when the team does not have enough eligible employees.
- **FR-GEN-07:** Process holidays chronologically and update temporary workload after each allocation.
- **FR-GEN-08:** Evaluate employee combinations, not only independent employee rankings.
- **FR-GEN-09:** Validate fairness across the complete generated roster. Use controlled reassignment/backtracking when an earlier local choice creates avoidable global unfairness.
- **FR-GEN-10:** Algorithm policy version 1 is deterministic and explainable. Identical canonical inputs produce the same result.
- **FR-GEN-11:** Compare full feasible allocations lexicographically: hard constraints; minimize descending vector of prior effective published Primary credits plus all proposed Primary slots for employees eligible in the period; maximize same-team pairs among equal workload outcomes; maximize days since last published Primary assignment among still-equal outcomes (no prior assignment sorts as infinite); then stable hash of input fingerprint, policy version, slot key, and employee code. Standby allocation is separate. Explain each comparison and any unavoidable gap. (FDR-02)
- **FR-GEN-12:** Generation produces a feasibility report, candidate exclusions, explanations and any unresolved staffing gaps.

### 5.5 Manual assignment (FR-MAN)
- **FR-MAN-01:** An account with explicit `ROSTER.MANUAL_ASSIGN` can select/fill an employee in a draft roster; role label alone does not grant this authority.
- **FR-MAN-02:** Manual assignment must validate active employment, applicable team/membership rules, rotation eligibility, availability, duplicate-per-holiday constraints and slot validity.
- **FR-MAN-03:** Hard eligibility and availability checks cannot be bypassed by manual action.
- **FR-MAN-04:** A fairness override is permitted only where explicitly authorised, with a visible warning, reason, actor and audit event.
- **FR-MAN-05:** Persist whether each assignment originated from automatic generation or manual selection.

### 5.6 Standby (FR-STB)
- **FR-STB-01:** Standby is backup only, not an active Primary support assignment.
- **FR-STB-02:** Standby designation or activation does not add a Primary workload credit.
- **FR-STB-03:** Standby assignment history and Standby activation history are separate reportable facts.
- **FR-STB-04:** Activation is an operational event only; the application does not assert that a person performed a duty.
- **FR-STB-05:** Preserve original assignment, Standby designation, activation and authorized replacement lineage.
- **FR-STB-06:** Activation must not erase or overwrite the original Primary assignment record.

### 5.7 Manager-approved replacement (FR-REP) — mandatory
When an already assigned employee becomes unavailable:

1. The assigned employee may report unavailability against that holiday assignment.
2. The system creates a replacement request and records the requester, original employee, affected holiday/slot, reason and time.
3. The authorised Manager approver is notified and approval is requested.
4. The system identifies the designated Standby person.
5. If Standby is eligible and available, the system suggests that person first.
6. The Manager may approve the suggested Standby replacement.
7. Alternatively, the Manager may select another eligible and available employee.
8. The system revalidates eligibility, availability, duplicate assignment, effective dates and roster version before approval is committed.
9. The effective assignment must not change before Manager approval.
10. If no eligible replacement exists, the request remains unresolved and the system displays a staffing gap and escalation status.
11. Preserve the original assignment and full approval/replacement history.

Required audit facts: requester, approver, decision, timestamp, reason, original employee, replacement employee, holiday, slot, validation outcome and effective roster version.

**FR-REP-02:** Manager may approve or reject. A rejection leaves the existing assignment unchanged and the staffing issue unresolved until another action is taken.

**FR-REP-03:** A replacement is a one-way substitution, not a mutual date-for-date swap.

**FR-REP-04:** Mutual date-for-date swaps are excluded from the initial release (approved scope; see Decision Register Part F scope boundaries).

**FR-REP-05:** Handover is a separate operational information-transfer process and must not be conflated with replacement.

**FR-REP-06:** Approval is a separately scoped, time-bounded capability; no app role receives it by default. Requester, affected assignee and candidate cannot approve. (FDR-03)

### 5.8 Roster lifecycle and publication (FR-PUB)
- **FR-PUB-01:** Generation and manual editing operate on a draft version.
- **FR-PUB-02:** Draft assignments do not change effective published Primary workload credits.
- **FR-PUB-03:** Temporary draft allocations influence later allocations in the same generation run.
- **FR-PUB-04:** Publication requires authorised review and validation of staffing requirements and hard constraints.
- **FR-PUB-05:** Published roster versions are immutable. Post-publication changes create a new revision with reason and audit history.
- **FR-PUB-06:** A correction to any published period, including a closed period, creates a new immutable version with mandatory reason. An explicitly authorized `ROSTER.REVISE` actor initiates; a different `ROSTER.PUBLISH` actor validates and publishes. Prior versions remain traceable; effective credits are recalculated once per holiday/slot. (FDR-09)

### 5.9 Duty history and reporting (FR-REP-AN)
Authorized users receive separate, filterable measures for effective published Primary credits, future published Primary assignments, Standby designations, Standby activations, draft assignments, replaced assignment history, and cancelled assignments. Future published and draft views are explanatory/planning dimensions, not additional workload credits. Do not report actual completed/performed duties: the application does not verify performance or implement a completion/attendance workflow. (FDR-01)

### 5.11 Handover (FR-HO)
Handover is an assignment-linked informational report, separate from replacement. Submitted content is immutable; correction creates a linked addendum. Initial release has no receiver acknowledgement or mandatory recipient. Retain with roster/audit history; no automatic deletion absent a customer retention policy. (FDR-08)

### 5.12 Notifications and audit (FR-NOT / FR-AUD)
- Notify the authorised Manager of each replacement request.
- Notify relevant parties of approval/rejection and effective replacement.
- Notify operational owners of unresolved staffing gaps.
- Record delivery attempts and failures without rolling back committed business changes.
- Append audit events for account/role/authority changes, generation, manual assignment, fairness override, publication, availability, replacement request/decision, standby activation, assignment revision, holiday revision, and notification outcomes.
- Audit records capture actor, action, target, timestamp, reason, before/after reference and correlation/version identifiers as applicable.

### 5.13 Onboarding and Help Centre (FR-HELP)
- First-login onboarding must be role-aware and resumable.
- Every major screen provides contextual help.
- Searchable help content includes getting-started guides, task instructions, workflow explanations, glossary, FAQs and troubleshooting.
- Help content has ownership, visibility, publication state and version history.
- Draft or restricted content must not be exposed to unauthorised roles.

### 5.14 Account lifecycle (FR-IDENTITY)
- Admin creates an employee-linked account invitation; invite tokens are single-use and expire after 24 hours.
- User sets their initial password through the invitation flow; no shared/default temporary password is issued.
- Authenticated users can change their password after current-password verification. Password reset uses a single-use 30-minute token and a generic response that does not reveal account existence.
- Passwords require at least 12 characters and no more than 72 UTF-8 bytes; store BCrypt hashes with work factor 12 only.
- Deactivation, password reset, and role/permission changes revoke active sessions. Password change revokes other sessions.
- Invitation and reset delivery requires environment-configured email; the provider is not specified.

### 5.15 Notifications and operational reliability
- In-app notifications cover roster publication, replacement requests/decisions, unresolved gaps, and account workflow status.
- Configured email sends invitations, password resets, replacement approvals/decisions, unresolved gap notices, and publication notices.
- Outbox delivery uses idempotency by event/recipient/channel, retries after 1m, 5m, 30m, 2h and 12h, then marks FAILED and raises an operational alert; business transactions never roll back due to delivery failure.

## 6. Non-functional requirements

- **NFR-SEC-01:** Enforce authentication, role, permission, scope and resource-state checks on the backend.
- **NFR-SEC-02:** Apply secure password hashing, session security, CSRF protection, input validation and output encoding.
- **NFR-DATA-01:** Preserve assignment, approval and audit history; do not overwrite historical facts.
- **NFR-CON-01:** Use optimistic concurrency or equivalent conflict detection for concurrent roster changes.
- **NFR-TXN-01:** Publication and replacement approval are atomic business operations.
- **NFR-REL-01:** Notification failures must not undo committed roster changes; use reliable asynchronous delivery.
- **NFR-TIME-01:** Use organisation-local business dates and timezone-aware duty windows.
- **NFR-OBS-01:** Log and monitor generation, publication, approval, scheduled processing and notification failures.
- **NFR-USE-01:** Provide clear validation, conflict, permission and staffing-gap messages without exposing stack traces.
- **NFR-ARCH-01:** Use a modular monolith and the fixed stack: HTML5, CSS3, Vanilla JavaScript ES Modules, Java, Spring Boot, Spring Security, Spring Data JPA, Hibernate, Jakarta Validation, Spring Mail where appropriate, and MySQL.

No external ticketing API, integration metric or vendor is assumed.

### 7.4 Current development workflow

- **Frontend development:** Antigravity develops the approved HTML5, CSS3, Vanilla JavaScript ES6+ and ES Modules frontend.
- **Backend development:** OpenAI Codex develops the approved Java/Spring Boot backend.
- **Shared boundary:** Document 07 is the authoritative frontend/backend API contract.
- **Integration and end-to-end verification:** ownership is an implementation-setup decision; the shared repository/workspace handoff and final integration owner are not yet approved.

**Historical note:** v0/Replit and ARC-01 were part of an earlier workflow discussion and are superseded. They do not authorize a frontend framework change.

## 7. Acceptance criteria

| ID | Given / When | Then |
|---|---|---|
| AC-01 | Two holidays have different support needs | Each holiday stores and uses its own Primary and optional Standby requirements |
| AC-02 | A holiday requires only Primary coverage | No mandatory Standby is fabricated |
| AC-03 | Candidate pool spans teams | Same-team pairing is preferred only when it does not violate higher-priority fairness or hard constraints |
| AC-04 | A recent assignment exists | No fixed date cooldown blocks the employee |
| AC-05 | Several holidays are generated | Earlier temporary allocations influence later selections and final whole-roster fairness is validated |
| AC-06 | An earlier local choice causes avoidable global unfairness | The generator can reassign/backtrack and explain the final result |
| AC-07 | Identical generation inputs and policy version are supplied | The same full-roster fairness comparison and stable hash tie-break produce reproducible output |
| AC-08 | Manager manually selects an employee | Eligibility and availability are revalidated server-side |
| AC-09 | A Member reports unavailability for a published assignment | A replacement request is created; assignment remains unchanged |
| AC-10 | Eligible Standby exists | It is suggested first to the Manager |
| AC-11 | Manager approves a valid replacement | New assignment becomes effective and original history remains intact |
| AC-12 | Manager rejects replacement | Original assignment remains unchanged and issue remains unresolved |
| AC-13 | No eligible replacement exists | Visible unresolved staffing gap is raised |
| AC-14 | A Standby is designated or activated | No Primary workload credit is inferred from designation, activation, or claimed performance |
| AC-15 | An authorized replacement is published | The effective holiday/slot credit transfers to the new assignee exactly once; prior versions remain auditable |
| AC-16 | Draft roster is edited | Effective published Primary credit history does not change |
| AC-17 | Authorized user opens workload reporting | Published credits, future plan, Standby, activation, draft, replaced, and cancelled dimensions are distinct |
| AC-18 | A user searches normal ticket assignment | The application does not attempt to replace the ticketing platform |
| AC-19 | Any user attempts excluded leave/Comp-Off/attendance/payroll/ticket functionality | No such product capability is exposed |

## 8. Final decisions and remaining external dependencies

| ID | Decision | Impact | Blocks database design? |
|---|---|---|---|
| Decision | Final state | Remaining external setup |
|---|---|---|
| OD-01/16 | Resolved by FDR-03: three roles; scoped, time-bound `REPLACEMENT.APPROVE`; separation of duties; explicit customer-configured approver accounts | Customer must identify/grant named approver accounts before replacement operations are enabled |
| OD-02 | Resolved by FDR-04: explicit Primary ≥1, Standby ≥0, no defaults; counts bounded by eligible pool | None for specification |
| OD-03 | Resolved by FDR-05: availability effective on submit; published assignment remains unchanged and follows replacement workflow | None for specification |
| OD-04/06 | Resolved by FDR-02/06: zero history baseline and deterministic global lexicographic algorithm v1 | None for policy; implementation must execute documented algorithm |
| OD-05 | Resolved by FDR-07: one active team per employee/date; at most one active TL per team | Customer supplies actual employee/team assignments |
| OD-07 | Out of initial-release scope; mutual swap remains excluded | None |
| OD-08 | Superseded/out of initial-release scope by FDR-01; no duty completion or actual-performance confirmation | None |
| OD-09 | Out of initial-release scope by FDR-08; informational handover retained | Customer retention policy may supersede default before production |
| OD-10/11 | Resolved by FDR-09/10: immutable append-only revised version with reason and two-person publish; stable holiday identity/date history | None for specification |
| OD-12 | Out of initial-release scope; baseline credits begin from app-managed published assignment history | None |
| OD-13 | Resolved by FDR-14: Flyway versioned SQL, forward-only correction and backup-based recovery | Actual DB provisioning remains external |
| OD-14 | One organisation per deployment remains initial-release boundary | Revisit only if product scope changes |
| OD-15 | Logical email design resolved provider-neutrally by FDR-12 | SMTP/provider and credentials required for email delivery |

Decisions carry their provenance in register Part F and are not misrepresented as prior Product Owner decisions. Company-specific people and infrastructure values remain deployment configuration.

## 9. Release and phase gate

This v5.3 baseline is finalized under the authorized reconciliation. The specification set is ready for implementation. Integrated and production verification remain conditional on customer-populated employee/team/role data, named approver/publisher grants, SMTP/secret configuration, MySQL environments, and configured source handoff. Those external dependencies do not reopen the decisions above.
