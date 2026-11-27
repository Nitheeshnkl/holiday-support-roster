# ROSTER_PROJECT_MASTER_MEMORY.md
## Holiday Support Roster Management System — Permanent Project Memory

| Field | Value |
|---|---|
| Memory Version | 1.9 |
| Last Updated | 2026-11-27 |
| Latest Completed Document | `ORGANIZATION_FOUNDATION_AUTHORIZED_DECISIONS_UPDATE_REPORT.md` v1.0; organization/security decisions synchronized, implementation not changed |
| Maintained By | EGM Synthesizer / Senior Architect |
| Primary Context For | All future AI agents and project conversations |

> [!IMPORTANT]
> This is the single cumulative project memory file. Future agents must read this first. Never create a separate memory file per document. Update this file after every approved milestone.

### Revision history

| Version | Date | Change |
|---|---|---|
| 1.6 | 27 Nov 2026 | Pre-final reconciliation state; documents and decisions still had blockers. |
| 1.7 | 27 Nov 2026 | Recorded final authorized reconciliation, current document versions, external setup dependencies and specification-vs-execution status. |
| 1.8 | 27 Nov 2026 | Refreshed final versions after contract, database history, workflow, and frontend mapping alignment; recorded final validation and readiness report. |
| 1.9 | 27 Nov 2026 | Recorded direct Product Owner decisions PO-01..12 and synchronized active organization/security contract versions; distinguished implementation blockers from settled business rules. |

**Current-memory rule:** Sections 1–17 retain cumulative historical context; any prior status, version, open-decision, workload or readiness statement that conflicts with §18 is superseded. Use §18 and the current decision register for implementation.

---

## 1. Project Identity

| Field | Value |
|---|---|
| Project Name | Holiday Support Roster Management System |
| Business Purpose | Plan and manage holiday support staffing fairly, maintain coverage when assigned personnel become unavailable, and preserve a complete, auditable history of assignments, decisions and approvals |
| Current Phase | Final specification baseline complete; CONDITIONAL GO pending external setup for integration/deployment |
| Product Scope | Internal web application for holiday support roster management only |
| Intended Users | Admin, Team Lead (TL), Member/Employee; replacement approver uses separately scoped `REPLACEMENT.APPROVE` capability |
| Current Development Objective | Implement the finalized baseline in the sequence specified by `12_IMPLEMENTATION_ROADMAP.md` |
| Technology Stack | HTML5, CSS3, Vanilla JavaScript ES6+ and ES Modules; Java, Spring Boot, Spring Security, Spring Data JPA, Hibernate, Jakarta Validation, MySQL, Maven and modular monolith |

---

## 2. Business Context

### 2.1 Existing operational process
- Holiday support scheduling is currently managed via spreadsheets and chat-based tools.
- Opaque allocation decisions, unowned coverage gaps, inconsistent availability handling, weak history, dependence on experienced colleagues for process knowledge.

### 2.2 Problem being solved
- Eliminate manual, ad-hoc holiday roster planning.
- Enforce fair, organisation-wide allocation based on effective published Primary assignment history.
- Enforce mandatory Manager approval before an existing assignment changes.
- Maintain immutable, auditable history of all assignments, replacements and decisions.

### 2.3 Expected application responsibilities
- Authentication and server-side role/permission enforcement.
- Dynamic employee/team administration with effective-dated history.
- Holiday calendar management and per-holiday staffing configuration.
- Employee availability and unavailability declarations.
- Automatic roster generation (global fairness, same-team soft preference, chronological allocation, whole-roster validation).
- Manual assignment with hard eligibility/availability enforcement.
- Draft/publication lifecycle with immutable published versions.
- Standby designation, activation tracking and actual-duty attribution.
- Manager-approved one-way replacement workflow.
- Unresolved staffing-gap visibility and escalation.
- Duty history and workload reporting with seven separately filterable dimensions.
- Handover as operational information transfer.
- Notifications, append-only audit log, role-aware onboarding and Help Centre.

### 2.4 Responsibilities that remain in the existing ticketing platform
- Normal ticket assignment and ticket operations.
- Ticket routing, ticket management, ticket replacement.
- Shared ticket ownership assumptions.
- Any existing ticketing API, vendor, payload or authentication.

### 2.5 Source-of-truth hierarchy

1. `ROSTER_CONFIRMED_BUSINESS_DECISIONS.md` — authoritative Product Owner decisions.
2. Latest reconciled PRD, Domain Rules, Roles/Workflows, Architecture, Database Design, Readiness Review and Backend Specification, in that order.
3. `07_API_CONTRACT_AND_OPENAPI_SPECIFICATION.md` and `openapi.yaml` — authoritative only for the approved/versioned HTTP contract; they cannot override higher business or architecture authority.
4. This memory — starting context and navigation aid; it never overrides the above sources.

If sources conflict, follow the higher source, record the impact, and do not silently resolve an unresolved decision.

---

## 3. Confirmed Product Scope

### 3.1 Included functionality
- Authentication, session management, password management.
- Role/permission administration.
- Employee and team lifecycle management (effective-dated).
- Holiday calendar and per-holiday Primary/Standby staffing configuration.
- Availability/unavailability declarations and history.
- Automatic roster generation engine (pure, deterministic, explainable).
- Manual assignment with server-side validation.
- Draft, review, publish and version roster lifecycle.
- Standby designation, activation and duty attribution.
- Manager-approved replacement workflow (one-way, mandatory approval).
- Duty history and reporting (seven separately labelled workload dimensions).
- Handover report creation and submission.
- Notifications (email via Spring Mail; transactional outbox).
- Append-only audit log.
- Role-aware in-app Help Centre and onboarding walkthroughs.

### 3.2 Explicit exclusions (must not be introduced)
- Comp-Off or compensatory leave/time off.
- Leave management or leave approval.
- Attendance management or attendance subsystem.
- Payroll processing.
- Ticket management, ticket assignment, ticket routing, ticket replacement.
- Shared ticket ownership assumptions.
- Assumed ticketing-platform APIs, vendor contracts or payloads.
- React, Angular, Vue, TypeScript frontend.
- Node.js or Python backend.
- MongoDB or alternative database.
- Microservices or distributed internal services.
- Skill-based scheduling (unless separately approved).
- Mutual date-for-date swaps (OD-07 — open decision; not in confirmed scope).

### 3.3 Initial release boundaries
- One organisation per deployment.
- Three confirmed application roles: Admin, Team Lead, Member.
- Manager approval represented as a delegated capability (role mapping open — OD-01/OD-16).
- One-way replacement only (no mutual swap).
- Handover as information transfer (acknowledgement policy open — OD-09).
- Help/onboarding persistence in-application (no external CMS).

### 3.4 Deferred functionality
- Mutual swaps — OD-07 (open, excluded from initial release).
- Historical import — OD-12 (conditional; excluded unless explicitly decided).
- Handover acknowledgement — OD-09 (deferred unless mandatory in initial release).
- Multiple organisations per deployment — OD-14 (non-blocking; deferred).
- Secondary notification channel — OD-15 (production configuration; deferred).

---

## 4. Approved Business Decisions

> [!NOTE]
> `ROSTER_CONFIRMED_BUSINESS_DECISIONS.md` v1.0 is the authoritative Product Owner decision register. It was incorporated on 27 November 2026 from `ROSTER-PO-DECISIONS-001`. The decisions below are a consolidated index only; consult the register for exact wording and open-decision boundaries.

| Decision ID | Decision | Status | Source |
|---|---|---|---|
| BD-001 | Staffing is configured separately per holiday; no hardcoded 2 Primary + 1 Standby | CONFIRMED | PRD FR-HOL-01..03; Domain BR-HOL-001..003 |
| BD-002 | Active Primary count and optional Standby count are distinct, separately configured concepts | CONFIRMED | PRD FR-HOL-02; Domain BR-HOL-002 |
| BD-003 | No fixed 14-day cooldown or other arbitrary date-based eligibility exclusion | CONFIRMED | PRD FR-GEN-04; Domain BR-FAR-003 |
| BD-004 | Same-team pairing is a soft preference only; it does not override eligibility, availability or global fairness | CONFIRMED | PRD FR-GEN-06; Domain BR-TEAM-003..005 |
| BD-005 | Fairness scope is organisation-wide; no team-wise fairness quotas or counters | CONFIRMED | PRD OBJ-01/FR-GEN-02; Domain BR-FAR-002 |
| BD-006 | Actual completed Primary duties (not draft or future published) drive historical fairness | CONFIRMED | PRD FR-GEN-03/FR-REP-AN; Domain BR-FAR-001 |
| BD-007 | Draft assignments influence temporary allocation order within a generation run but do not alter official historical workload | CONFIRMED | PRD FR-PUB-02..03; Domain BR-FAR-005 |
| BD-008 | Holidays processed chronologically; temporary workload updated after each allocation; whole-roster fairness validated | CONFIRMED | PRD FR-GEN-07..09; Domain BR-ALG-001..005 |
| BD-009 | Algorithm must be deterministic and explainable; identical inputs reproduce same result under approved deterministic tie-break | CONFIRMED | PRD FR-GEN-10; Domain BR-ALG-006 |
| BD-010 | No numeric formula, weight or tie-break may be invented without PO approval | CONFIRMED | PRD FR-GEN-11; Domain BR-FAR-008 |
| BD-011 | Manual assignment is supported; hard eligibility and availability checks cannot be bypassed | CONFIRMED | PRD FR-MAN-01..03; Domain BR-MAN-001..005 |
| BD-012 | Standby designation is backup only; not an active Primary assignment; not completed duty | CONFIRMED | PRD FR-STB-01..02; Domain BR-STB-001..002 |
| BD-013 | Standby activation history and actual-duty attribution to performer are separate persisted facts | CONFIRMED | PRD FR-STB-03..05; Domain BR-STB-004..005 |
| BD-014 | Manager approval is mandatory before an existing assignment is replaced | CONFIRMED | PRD OBJ-03/FR-REP-01; Domain BR-REP-002 |
| BD-015 | Effective assignment does not change before Manager approval; rejection leaves original assignment unchanged | CONFIRMED | PRD FR-REP-02; Domain BR-REP-005..006 |
| BD-016 | Designated Standby is suggested first if eligible and available; Manager may select another candidate | CONFIRMED | PRD FR-REP (steps 4-7); Domain BR-REP-003..004 |
| BD-017 | Final eligibility and availability revalidated at approval commit time | CONFIRMED | PRD FR-REP (step 8); Domain BR-REP-005 |
| BD-018 | No eligible replacement → preserve original assignment, display unresolved staffing gap | CONFIRMED | PRD FR-REP (step 10); Domain BR-REP-007 |
| BD-019 | Replacement audit preserves requester, approver, decision, timestamp, reason, original employee, replacement employee, holiday, slot, validation outcome, effective roster version | CONFIRMED | PRD FR-REP audit facts; Domain BR-REP-008 |
| BD-020 | One-way replacement; not a mutual date-for-date swap | CONFIRMED | PRD FR-REP-03; Domain BR-REP-009 |
| BD-021 | Published roster versions are immutable; post-publication changes create a new revision with reason and audit history | CONFIRMED | PRD FR-PUB-05; Domain BR-PUB-003 |
| BD-022 | Published revisions preserve parent version lineage; prior version is not overwritten | CONFIRMED | Architecture ADR-008; DB Design Section 3.2 |
| BD-023 | Actual duty is attributed to the person who actually performed it (not the original assignee) | CONFIRMED | PRD FR-STB-04; Domain BR-STB-005 |
| BD-024 | Existing ticketing platform retains ticket operations; this application does not duplicate or replace it | CONFIRMED | PRD 1.3/Section 4.2; Domain BR-EXT-001..004 |
| BD-025 | No Comp-Off, leave management, attendance management, payroll, ticket management or ticket replacement | CONFIRMED | PRD Section 4.2; Domain BR-EXC-001 |
| BD-026 | Manager approval capability is explicitly granted, not an automatic Admin or TL privilege | CONFIRMED | PRD FR-REP-06; Roles Section 3.4/Section 7 |
| BD-027 | Handover is operational information transfer, separate from replacement and mutual swap | CONFIRMED | PRD FR-REP-05; Domain BR-HO-001 |
| BD-028 | Workload reporting must provide seven separately filterable dimensions; no aggregate total may obscure categories | CONFIRMED | PRD FR-REP-AN; Domain BR-WL-001..002 |
| BD-029 | Notification failures must not undo committed roster changes; use reliable asynchronous delivery (transactional outbox) | CONFIRMED | PRD NFR-REL-01; Architecture Section 14 |
| BD-030 | Server-side authorization is mandatory for all protected operations; frontend visibility is not authorization | CONFIRMED | PRD NFR-SEC-01; Roles Section 1 |
| BD-031 | All material actions are audited with append-only records capturing actor, action, target, timestamp, reason, before/after references | CONFIRMED | PRD FR-AUD; Domain BR-AUD-001..002 |
| BD-032 | Use optimistic concurrency or equivalent conflict detection for concurrent roster changes | CONFIRMED | PRD NFR-CON-01; Architecture Section 11 |
| BD-033 | HTML5/CSS3/Vanilla JS ES Modules and Java/Spring Boot/Spring Security/Spring Data JPA/Hibernate/Jakarta Validation/MySQL/modular monolith are the approved stack | CONFIRMED | Architecture v2.2 Section 20.1 |
| BD-034 | No migration tool is selected; migration tooling requires a separate approved ADR (OD-13) | CONFIRMED | Architecture ADR-012 |

---

## 5. Business Rules

### 5.1 Holiday Staffing
- **BR-HOL-001 (HARD):** Staffing configured separately for each holiday.
- **BR-HOL-002 (HARD):** Active Primary count and optional Standby count are distinct concepts.
- **BR-HOL-003 (HARD):** No hardcoded 2 Primary + 1 Standby.
- **BR-HOL-004 (OPEN — OD-02):** Exact independent count configuration, holiday-type defaults and requirement snapshot rules require PO decision.

### 5.2 Employee Eligibility
- **BR-ELG-001 (HARD):** Candidate must be active and rotation-eligible on the holiday's business date.
- **BR-ELG-002 (HARD):** Candidate must be available for the relevant duty window.
- **BR-ELG-003 (HARD):** No employee may occupy more than one slot on the same holiday.
- **BR-ELG-004 (HARD):** Manual and automatic assignments share identical hard eligibility and availability checks.

### 5.3 Availability
- **BR-AVL-001 (PERSISTED):** Availability/unavailability declarations retain actor, date/range, type, timestamp and change history.
- **BR-AVL-002 (OPEN — OD-03):** Whether ordinary availability requires approval is undecided.
- **BR-AVL-003 (HARD):** Reporting unavailability against a current assignment creates a replacement request; it does not silently remove the assignment.

### 5.4 Fairness
- **BR-FAR-001 (HARD):** Actual completed Primary duties drive historical fairness.
- **BR-FAR-002 (HARD):** Fairness scope is organisation-wide; no team quotas.
- **BR-FAR-003 (HARD):** No fixed date cooldown.
- **BR-FAR-004 (SOFT):** Recent assignments are only a secondary consideration when workload is otherwise comparable.
- **BR-FAR-005 (HARD):** Draft assignments do not alter official historical workload.
- **BR-FAR-006 (DERIVED):** Workload dimensions separately calculated and reported.
- **BR-FAR-007 (OPEN — OD-04/OD-06):** Exact comparison order, normalization, new-joiner baseline and deterministic tie-break undecided.
- **BR-FAR-008 (HARD):** No numeric formula or weighting invented without PO approval.

### 5.5 Team Preferences
- **BR-TEAM-001 (HARD):** Team membership is organisational context only; not a permission grant.
- **BR-TEAM-002 (HARD):** Global fairness only; no team-wise quotas.
- **BR-TEAM-003 (SOFT):** Prefer same-team pairing for a holiday when feasible.
- **BR-TEAM-004 (SOFT):** Use another team when insufficient eligible employees on the preferred team.
- **BR-TEAM-005 (HARD):** Same-team preference never overrides mandatory eligibility, availability or global fairness.
- **BR-TEAM-006 (OPEN — OD-05):** Multiple simultaneous team memberships and multiple co-equal Team Leads undecided.

### 5.6 Automatic Allocation
- **BR-ALG-001 (HARD):** Process selected holidays chronologically.
- **BR-ALG-002 (HARD):** Update temporary workload after each allocation.
- **BR-ALG-003 (HARD):** Evaluate candidate combinations, not only independent individual rankings.
- **BR-ALG-004 (HARD):** Validate fairness across the complete generated roster.
- **BR-ALG-005 (HARD):** Use controlled reassignment/backtracking when an earlier local choice creates avoidable global unfairness.
- **BR-ALG-006 (HARD):** Algorithm must be deterministic and explainable.
- **BR-ALG-007 (OPEN — OD-06):** Exact global objective, stopping conditions, deterministic tie-break and algorithm-version contract undecided.

### 5.7 Manual Allocation
- **BR-MAN-001 (HARD):** Manual assignment is supported.
- **BR-MAN-002 (HARD):** Manual assignment must revalidate eligibility, availability, uniqueness and roster-version state.
- **BR-MAN-003 (PERSISTED):** Assignment origin recorded as AUTO or MANUAL.
- **BR-MAN-004 (PERSISTED):** Fairness override requires authorised actor, reason and audit record.
- **BR-MAN-005 (HARD):** Manual action cannot bypass hard eligibility or availability.

### 5.8 Primary and Standby
- **BR-STB-001 (HARD):** Standby is backup only, not active Primary support.
- **BR-STB-002 (HARD):** Standby designation alone does not count as completed duty.
- **BR-STB-003 (PERSISTED):** Standby assignment history is separate from Primary assignment history.
- **BR-STB-004 (PERSISTED):** Standby activation is a separate persisted event.
- **BR-STB-005 (HARD):** If Standby performs duty after activation, actual workload is attributed to the performer.
- **BR-STB-006 (PERSISTED):** Original assignment, replacement/activation lineage preserved.

### 5.9 Workload Accounting — Seven Dimensions (Must Remain Separate)
1. **Actual completed Primary duties** — drives historical fairness.
2. **Future published Primary assignments** — planning dimension; report separately.
3. **Standby assignments** — backup designation, separate from Primary.
4. **Standby activations** — separate event history.
5. **Duties performed after Standby activation** — attribute to actual performer.
6. **Draft assignments** — no official historical impact; temporary in-run influence.
7. **Replaced/cancelled assignments** — preserve history; not completed duty.

Do NOT combine into a single "total duty" figure.

### 5.10 Replacement Approval
- **BR-REP-001..011:** See Section 4 (BD-014 through BD-020) and Section 6.3 for full rules and open decisions.

### 5.11 Duty Completion
- **BR-CMP-001 (HARD):** Actual completed Primary duties drive historical fairness.
- **BR-CMP-002 (HARD):** No general attendance-management subsystem.
- **BR-CMP-003 (OPEN — OD-08):** Narrowly scoped completion event, authorised actor, evidence, correction policy and terminal states undecided.
- **BR-CMP-004 (PERSISTED):** Any approved completion/correction event preserves actor, timestamp, reason and prior value.

### 5.12 Handover
- **BR-HO-001 (HARD):** Handover is operational information transfer, not assignment replacement.
- **BR-HO-002 (HARD):** Handover must not imply ticket management or external ticket API.
- **BR-HO-003 (OPEN — OD-09):** Acknowledgement, receiver, edit/addendum and retention rules undecided.

### 5.13 Draft and Publication
- **BR-PUB-001 (HARD):** Draft and published assignment states remain distinct.
- **BR-PUB-002 (HARD):** Draft assignment changes do not alter actual completed-duty history.
- **BR-PUB-003 (HARD):** Published versions are immutable; changes require a new revision.
- **BR-PUB-004 (PERSISTED):** Preserve original assignee and all assignment changes.
- **BR-PUB-005 (OPEN — OD-10):** Closed-roster revision policy undecided.

### 5.14 Revision and Audit History
- **BR-HIST-001 (PERSISTED):** Retain original and replacement assignment facts; never overwrite with only the latest assignee.
- **BR-AUD-001 (PERSISTED):** Material roster, availability, replacement, approval, standby activation, publication, manual override and completion actions are auditable.
- **BR-AUD-002 (PERSISTED):** Audit event identifies actor, action, target, timestamp, reason and relevant before/after references.

---

## 6. Roles and Permissions

### 6.1 Approved Roles

| Role | Responsibilities | Key Permissions | Approval Authority | Boundaries |
|---|---|---|---|---|
| **Admin** | Org settings, employee/team lifecycle, holiday config, roster generation/publication, org-wide reporting, audit, Help Centre admin | ORG.USER.MANAGE, ORG.TEAM.MANAGE, CALENDAR.MANAGE, ROSTER.GENERATE, ROSTER.PUBLISH, AUDIT.READ, HELP.MANAGE | No automatic Manager approval authority | Cannot bypass hard eligibility; cannot approve replacement without explicit Manager grant |
| **Team Lead (TL)** | Team-scoped coordination, availability coordination, candidate identification if authorised | ROSTER.READ (team scope), AVAILABILITY.MANAGE_OWN, explicit grants for generation/manual assign | No automatic Manager approval authority | Cannot access unrelated team data; cannot approve replacement by virtue of being TL alone |
| **Member / Employee** | Own availability, own assignments, unavailability reporting, replacement participation, handover, onboarding | AVAILABILITY.MANAGE_OWN, REPLACEMENT.REQUEST_OWN, ROSTER.READ (own scope) | None | Cannot alter effective assignment; cannot approve own replacement |
| **Manager Approver** | Approve/reject replacement requests within explicit scope | REPLACEMENT.APPROVE, REPLACEMENT.REJECT, REPLACEMENT.SELECT_CANDIDATE | Explicit approval grant required; scope: ORG or TEAM | Not an established role; mapping to Admin/TL/new role is OD-01/OD-16 |

### 6.2 Key Permission Codes
- `REPLACEMENT.APPROVE` / `REPLACEMENT.REJECT` — Requires explicit Manager approval grant; not automatic.
- `ROSTER.PUBLISH` — Admin only; publication authority explicitly granted.
- `ROSTER.FAIRNESS_OVERRIDE` — Explicit grant; reason + audit mandatory; cannot bypass hard rules.
- `DUTY.COMPLETION.RECORD` — Completion actor policy open (OD-08).
- `DUTY.REPORT.READ` — Manager reporting requirement; named access boundary open.

### 6.3 Unresolved Authority Questions
- **OD-01:** Which named user/role/permission constitutes Manager approval authority? Delegation and self-approval rules?
- **OD-16:** Does the role model remain exactly Admin/TL/Member with Manager as a delegated capability, or is a fourth application role approved?
- **OD-05:** Can employees have multiple simultaneous team memberships? Can multiple Team Leads be co-equal?
- Until OD-01/OD-16 is resolved: no role receives Manager approval authority by inference; system must fail closed.

---

## 7. Approved Technical Architecture

| Component | Decision | Status |
|---|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript ES6+ / ES Modules | CONFIRMED |
| Backend | Java / Spring Boot | CONFIRMED |
| Security | Spring Security (server-side session, CSRF, password hashing) | CONFIRMED |
| Persistence | Spring Data JPA / Hibernate | CONFIRMED |
| Validation | Jakarta Validation | CONFIRMED |
| Database | MySQL 8.0.16+ / InnoDB / utf8mb4 | CONFIRMED |
| Email | Spring Mail where appropriate | CONFIRMED |
| Architecture Style | Single-deployable modular monolith | CONFIRMED |
| Build Tooling | Maven | APPROVED TECHNICAL DECISION |
| Concurrency | Optimistic concurrency (row_version); transaction-time revalidation | CONFIRMED |
| Notification | Transactional outbox pattern | CONFIRMED |
| Audit | Append-only audit events; same transaction as business action | CONFIRMED |
| Roster Versioning | Immutable published versions; revision lineage | CONFIRMED |
| Scheduling Engine | Pure, framework-free, deterministic, independently testable | CONFIRMED |
| Migration Tool | Not selected; requires separate ADR (OD-13) | OPEN |

### 7.1 Rejected Alternatives
- React, Next.js, TypeScript — not approved; no framework change is authorized.
- Node.js backend, Python backend — REJECTED.
- MongoDB or alternative database — REJECTED.
- Microservices or distributed internal services — REJECTED.
- Flyway/Liquibase not assumed (OD-13 open) — UNDECIDED.

### 7.2 Architecture Constraints
- No circular module dependencies.
- No direct cross-module repository access.
- Scheduling engine must not depend on Spring MVC, Spring Data, Hibernate, email or HTTP clients.
- No distributed transactions.
- No speculative external integration.
- Server-side authorization on every protected operation.

### 7.3 Current Development Workflow

| Stage | Confirmed tool | Required boundary |
|---|---|---|
| Frontend development | Antigravity | Develop HTML5/CSS3/Vanilla JS ES-module UI against Document 07. |
| Backend development | OpenAI Codex | Develop Java/Spring Boot backend against Document 07. |
| Shared integration boundary | Document 07 + `openapi.yaml` | Versioned authoritative API contract; changes require synchronized contract update before implementation handoff. |
| Integration and E2E verification | **Authorized:** OpenAI Codex | Codex integrates the shared handoff and executes API/E2E verification; Antigravity resolves frontend/UI integration defects. Repository/workspace/handoff mechanism remains SETUP-01. |

Document 07 is the API agreement between the Vanilla-JS frontend and Spring Boot backend.

### 7.4 SETUP-01 integration and handoff readiness

| Dimension | Status | Current record / required next action |
|---|---|---|
| Frontend responsibility | CONFIRMED | Antigravity develops the approved Vanilla-JS frontend against Document 07 and `openapi.yaml`. |
| Backend responsibility | CONFIRMED | OpenAI Codex develops the approved Java/Spring Boot backend against the same contract. |
| Final integration and API/E2E verification | PROPOSED — confirmation pending | Codex is proposed to integrate and execute API/E2E verification; Antigravity resolves frontend/UI integration defects. Project lead must confirm this ownership. |
| Shared handoff | OPEN | No Git worktree, remote, repository URL or controlled handoff configuration exists in this workspace. Select a shared repository or controlled handoff process; do not infer one. |
| Contract change control | CONFIRMED | Update Document 07 and `openapi.yaml` together before either implementation consumes a changed API contract. |
| Frontend backend base URL | CONFIRMED principle; configuration OPEN | Frontend reads environment/build configuration and must not hardcode the backend URL. Select and document the configuration mechanism per chosen handoff/deployment setup. |
| Integration defects | PROPOSED — confirmation pending | Codex triages backend/API/integration defects; Antigravity resolves frontend/UI integration defects; material contract defects return to Document 07 change control. |

**SETUP-01 status: PARTIALLY RESOLVED.** The operating model and non-hardcoding rule are documented; repository/handoff selection, environment configuration and project-lead confirmation remain external setup actions.

### 7.5 Document 07 verification record

- `07_API_CONTRACT_AND_OPENAPI_SPECIFICATION.md` v1.2 and `openapi.yaml` v1.2.0-draft remain unapproved draft contracts.
- Final structural validation: YAML 3.0.3 parse pass; 35 paths, 48 operations, 48 unique operationIds, 69 schemas, 257 resolvable local references, no duplicate keys, no path-parameter mismatch, all operations have responses, all screen-mapped operations exist. Full OpenAPI validator unavailable.
- Document 08 v1.2 maps 31 screens: 22 full, 3 partial, 5 conditional, 1 not required. Manual assignment operations remain supported; permission, eligibility, availability, DRAFT-only, If-Match and audit constraints are stated. Manager approval remains fail-closed pending OD-01/OD-16.
- Excluded Comp-Off, leave, attendance, payroll or ticket-management API behavior was not found. See the consolidated report v1.0 for the full audit and limits; no application/runtime test was performed.

---

## 8. Database Knowledge

**Source:** `05_DATABASE_DESIGN_AND_DATA_DICTIONARY.md` v1.2 — Design baseline for review; not implementation-approved.

### 8.1 Summary
- **Table count:** ~38 proposed tables.
- **Database:** MySQL 8.0.16+ / InnoDB / utf8mb4.
- **Status:** NO-GO for implementation pending PO approval and OD resolution.

### 8.2 Entity Groups

| Domain Area | Tables |
|---|---|
| Organisation & Identity | organisation_setting, employee, user_account, app_role, user_role_assignment, permission, role_permission |
| Teams & Approval Authority | team, team_membership, team_lead_assignment, approval_authority_grant |
| Calendar & Availability | holiday, holiday_staffing_requirement, availability_record |
| Roster & Generation | roster_period, roster_version, generation_run, generation_holiday_input, generation_candidate_input, roster_holiday_requirement_snapshot, roster_slot, assignment |
| Replacement & Duty | replacement_request, replacement_decision, assignment_change, standby_activation, duty_completion_event |
| Handover | handover_report, handover_item |
| Audit & Notification | audit_event, notification_outbox, notification_delivery |
| Help & Onboarding | help_category, help_article, help_article_role, walkthrough, walkthrough_step, user_onboarding_progress |

**Not modelled:** leave, leave balances, attendance, payroll, Comp-Off, ticket, ticket assignment, ticket ownership, external ticket payloads.

### 8.3 Persistence Principles
- All PKs: `BIGINT UNSIGNED AUTO_INCREMENT`.
- All FKs: `ON DELETE RESTRICT` for domain/historical references.
- Instant columns: `DATETIME(6)` UTC; business dates: `DATE`.
- Organisation timezone stored as IANA identifier.
- Optimistic concurrency: `row_version BIGINT UNSIGNED` on mutable aggregates.
- Append-only tables: no `updated_at_utc`; application/DB grants prevent UPDATE/DELETE.
- Draft mutable; published immutable; revisions append.
- No derived workload totals stored as authoritative facts.

### 8.4 Important Integrity Rules
- One employee per slot per published version: UNIQUE `(roster_slot_id, employee_id)`.
- One employee per holiday per version: UNIQUE `(roster_version_id, holiday_id, employee_id)`.
- Slot count must match snapshot counts (enforced in publication transaction; not by CHECK alone).
- Replacement request does not itself alter assignment; only approved + committed transaction does.
- Rejection has no `assignment_change` row.

### 8.5 Remaining Database Dependencies (Blockers)
OD-01/16 → role catalogue; OD-02 → staffing requirement structure; OD-03 → availability lifecycle; OD-04 → employee baseline; OD-05 → team_membership cardinality; OD-06 → generation snapshot schema; OD-08 → duty_completion_event semantics; OD-10 → roster_version states; OD-11 → holiday uniqueness; OD-13 → migration planning.

---

## 9. Important Technical Invariants

> [!CAUTION]
> These rules must NEVER be violated by any future implementation.

1. **Backend authorization is mandatory** — every protected operation enforces auth server-side.
2. **Manager approval precedes effective replacement** — assignment does not change before Manager approval commit.
3. **Draft allocations do not alter official historical workload** — draft assignments only affect temporary generation state within a run.
4. **Actual duty belongs to the person who performed it** — performer attribution, not original assignee.
5. **Standby designation is NOT completed Primary duty** — designation alone never counts as completed duty.
6. **Historical published records must be preserved** — published versions are immutable; prior versions preserved in full.
7. **No excluded functionality may be introduced** — no Comp-Off, leave, attendance, payroll, ticket management, mutual swap, external ticket API.
8. **No numeric formula or fairness weighting without PO approval** — do not invent a weighting scheme.
9. **Rejection of a replacement must not change the assignment** — only approval + successful validation creates an `assignment_change`.
10. **Audit records are append-only** — no UPDATE or DELETE on audit events.
11. **The scheduling engine must remain pure** — no repository reads, no persistence, no email, no HTTP inside the engine.
12. **No distributed transactions** — one database, one application, one transaction boundary per business operation.
13. **No hardcoded 2+1 staffing** — staffing is independently configured per holiday.
14. **No fixed date cooldown** — recent assignment is a soft secondary consideration only.
15. **Notification failures must not roll back committed business changes** — transactional outbox decouples delivery.

---

## 10. Terminology and Definitions

| Term | Definition |
|---|---|
| **Holiday** | A business date on which holiday support staffing may be required |
| **Roster** | The collective set of assignments for a roster period |
| **Roster Period** | A named planning interval grouping one or more holidays |
| **Roster Version** | A versioned snapshot of assignments for a period; DRAFT versions are mutable; PUBLISHED versions are immutable |
| **Primary** | An active support assignment where the assigned employee is expected to perform the duty |
| **Standby** | A backup designation; not performing active Primary duty unless activated and duty is subsequently performed |
| **Activation** | The event of calling the designated Standby to cover a Primary duty when the originally assigned employee is unavailable |
| **Actual Duty** | A Primary duty that was actually performed and confirmed by the approved completion event; drives historical fairness |
| **Assignment** | A specific employee's placement in a particular roster slot (Primary or Standby) within a roster version |
| **Replacement** | A Manager-approved one-way substitution of the employee responsible for a published assignment |
| **Swap** | A mutual date-for-date exchange between two employees; NOT in confirmed scope (OD-07) |
| **Handover** | Operational information transfer from the outgoing person to the incoming responsible party; NOT assignment replacement |
| **Availability** | An employee's declared availability or unavailability for a date or date range |
| **Eligibility** | Whether an employee meets hard criteria to be allocated: active employment, rotation-eligible status, available for duty window, not already assigned to same holiday |
| **Draft** | An unpublished roster version that is mutable; draft assignments do not affect official completed-duty history |
| **Published** | An immutable finalised roster version; subsequent changes require a new revision |
| **Revision** | A new roster version created after a prior version is published, preserving the prior version via parent lineage |
| **Generation Run** | One deterministic execution of the automatic allocation engine over a frozen input snapshot |

---

## 11. Current Documentation Inventory

| Document | Latest Version | Status | Authority |
|---|---|---|---|
| `ROSTER_CONFIRMED_BUSINESS_DECISIONS.md` | v1.0 | Authoritative Product Owner decision register | Highest authority |
| `Roster_Corrected_Final_PRD_v5.md` | v5.2 (reconciled draft) | Requires PO approval | Governing PRD |
| `02_DOMAIN_AND_BUSINESS_RULES.md` | v2.1 (reconciled draft) | Requires PO approval | Domain specification |
| `03_ROLES_PERMISSIONS_AND_WORKFLOWS.md` | v2.1 (reconciled draft) | Requires PO approval | Role/permission/workflow specification |
| `04_SYSTEM_ARCHITECTURE.md` | v2.2 (reconciled draft) | Requires PO/Architecture approval | Architecture specification |
| `05_DATABASE_DESIGN_AND_DATA_DICTIONARY.md` | v1.2 (design baseline for review) | NOT implementation-approved; NO-GO | Database design specification |
| `DATABASE_DESIGN_READINESS_REVIEW_v2.md` | v2.1 | NO-GO for implementation — blocking ODs listed | Readiness review |
| `SOURCE_BACKUP_MANIFEST.md` | v1.0 | Reference only | Preservation inventory |
| `ROSTER_PROJECT_MASTER_MEMORY.md` | v1.6 (this file) | Current | Consolidated project memory |
| `06_BACKEND_TECHNICAL_SPECIFICATION.md` | v1.2 | Implementation planning blueprint | Backend technical specification |
| `07_API_CONTRACT_AND_OPENAPI_SPECIFICATION.md` | v1.2 | Draft; response schemas and pagination reconciled; technical/PO review required | Shared frontend/backend API contract |
| `openapi.yaml` | OpenAPI 3.0.3, v1.2.0-draft | YAML parse/reference/operationId checks executed; full OpenAPI validator unavailable | Machine-readable API specification |
| `08_FRONTEND_ARCHITECTURE_AND_UI_UX_SPECIFICATION.md` | v1.2 | Draft; 31-screen reconciliation updated; PO approval pending | Frontend architecture and UX |
| `ROSTER_PRE_DEVELOPMENT_READINESS_AND_CLOSURE_REPORT.md` | v1.0 | Overall NO-GO; consolidated current audit | Readiness and closure report |

---

## 12. Current Project Progress

### 12.1 Completed Milestones
- Phase 1: Business requirements gathering and initial PRD (v4.0 baseline).
- Phase 1: Initial domain, roles and architecture specifications.
- Phase 1: Database Readiness Review v1 (NO-GO).
- Phase 2: Reconciliation of all source documents; PRD v5, Domain v2, Roles v2, Architecture v2 produced.
- Phase 2: Database Design Readiness Review v2 (NO-GO — blocking ODs remain).
- Phase 2: Document 05 — Database Design & Data Dictionary v1.0 produced.
- Phase 3 initiation: ROSTER_PROJECT_MASTER_MEMORY.md and Document 06 created.
- Document 07 and `openapi.yaml` created as the shared API contract; current workflow superseded v0/Replit with Antigravity frontend and Codex backend responsibilities.
- SETUP-01 assessed as partially resolved: workflow documented, but shared repository/handoff and environment configuration remain unconfigured in this workspace; Document 07/OpenAPI design validation re-run without contract change.
- Document 08 v1.0 drafted with 31 screen specifications, role-aware navigation, Vanilla-JS ES-module architecture, design tokens/components, workflow journeys, responsive/accessibility guidance, API operationId mapping, traceability and explicit contract gaps. No implementation or browser testing was performed.
- Reconciled Documents 07/OpenAPI/08 to v1.2 drafts: retained API-ROS-07/08 for approved manual candidate lookup and assignment into unfilled draft slots; expanded existing response schemas and pagination; added role audience and per-recipient read timestamp to proposed DB design v1.2; classified all 31 screen actions. No Product Owner decision register changes were made. Post-edit YAML parsing and structural checks are recorded in `ROSTER_PRE_DEVELOPMENT_READINESS_AND_CLOSURE_REPORT.md`; no full OpenAPI validator was available.

### 12.2 Current Milestone
- Documents 07 and 08 v1.2 and OpenAPI v1.2.0-draft are reconciled drafts. All 31 screens have operation/API mappings and coverage classifications: 22 full, 3 partial, 5 conditional, 1 not required. Manual assignment discovery/creation remains covered; response schemas for existing actions were completed. SETUP-01 and critical Product Owner decisions remain open; integrated implementation is not ready. See the consolidated readiness report for gate findings and executable validation limits.

### 12.3 Pending Milestones
- Product Owner approval of the five foundational documents.
- Resolution of implementation-blocking open decisions as categorized in the authoritative register/master memory.
- Shared repository/workspace or formal code-handoff mechanism (SETUP-01).
- Project-lead confirmation of the proposed Codex final-integration and E2E-verification owner (SETUP-01).
- Product Owner/technical review of Documents 07 and 08 and closure/contract treatment of documented partial coverage.
- Document 09 — Testing Strategy.
- Database Migration ADR (OD-13).
- Implementation phases.

### 12.4 Next Action
Use the consolidated readiness report to obtain decisions on blocking business policy and assign SETUP-01 actions; then close remaining implementation prerequisites before coding. Do not create Documents 09–13 automatically.

### 12.5 Work Explicitly Not Yet Started
- JPA entity source code.
- SQL migration scripts.
- REST controller implementations.
- Frontend implementation.
- Security penetration testing.
- Performance benchmarking.
- Production deployment configuration.

---

## 13. Open Decisions and Dependencies

> [!WARNING]
> These are genuinely unresolved. Do NOT reopen decisions listed in Section 4.

| ID | Issue | Current Status | Impact | Next Action |
|---|---|---|---|---|
| OD-01 | Manager approver identity: role mapping, scope, delegation, self-approval/recusal rules | OPEN — BLOCKER | Authorization design, replacement workflow, approval actor references in DB | PO decision required before finalising authorization model |
| OD-02 | Exact separate Primary and Standby count configuration; holiday-type defaults; snapshot rules | OPEN — BLOCKER | holiday_staffing_requirement structure, slot cardinality | PO decision; affects DB and generation engine inputs |
| OD-03 | Ordinary availability approval: immediate effect or approval-gated? | OPEN — BLOCKER | Availability lifecycle, actor/decision history columns | PO decision |
| OD-04 | New-joiner fairness baseline | OPEN — BLOCKER | Employee workload baseline, historical attribution | PO decision |
| OD-05 | Multiple simultaneous team memberships; multiple co-equal Team Leads | OPEN — BLOCKER | team_membership cardinality, generation_candidate_input schema | PO decision |
| OD-06 | Exact fairness comparison order, global objective, deterministic tie-break, algorithm version | OPEN — BLOCKER | Generation engine behaviour, reproducibility contract, snapshot schema | PO decision; no formula may be invented |
| OD-07 | Mutual date-for-date swaps in scope? | OPEN — NON-BLOCKING (excluded from initial release) | Swap workflow and relationships if included | PO decision before including |
| OD-08 | Narrowly scoped completion event without attendance management | OPEN — BLOCKER | duty_completion_event semantics, actual workload source of truth | PO decision; must not introduce attendance subsystem |
| OD-09 | Handover acknowledgement; mandatory or optional; retention/correction/addendum policy | OPEN — NON-BLOCKING (unless mandatory acknowledgement in initial release) | Handover lifecycle | PO decision |
| OD-10 | Closed roster revision/correction authority and mechanism | OPEN — BLOCKER | Roster version state transitions, post-publication permission model | PO decision |
| OD-11 | Holiday identity when a date changes: stable identity + date history, or cancel/recreate? | OPEN — BLOCKER | Holiday key, uniqueness constraints, historical references | PO decision |
| OD-12 | Historical import policy | OPEN — CONDITIONAL (non-blocking if import excluded from initial release) | Import provenance tables | PO decision |
| OD-13 | Database migration tooling | OPEN — NON-BLOCKING for conceptual model; BLOCKER for implementation | Migration planning, schema evolution | Separate ADR required before implementation |
| OD-14 | Multiple organisations per deployment | OPEN — NON-BLOCKING (one org per deployment assumed) | Tenant discriminator | Revisit only if multi-org is introduced |
| OD-15 | Notification secondary channel and provider | OPEN — NON-BLOCKING for logical model; BLOCKER for production | Notification delivery adapter | Production readiness decision |
| OD-16 | Three-role model vs fourth Manager application role | OPEN — BLOCKER | Role catalogue, permission mapping, authorization | PO decision; linked to OD-01 |
| ARC-01 | v0 default React/Next.js/TypeScript workflow conflict | SUPERSEDED — historical only | None in current workflow | No action; v0 and Replit removed from current workflow |
| SETUP-01 | Shared repository/handoff mechanism and frontend base-URL configuration | PARTIALLY RESOLVED — INTEGRATION BLOCKER | Integrated frontend/backend delivery | Project Owner / delivery lead confirms proposed Codex integration/E2E ownership, selects shared repository or controlled handoff, and documents environment base-URL configuration; no provider or URL is inferred |

---

## 14. Future Documentation Roadmap

| Sequence | Document | Prerequisite | Dependency |
|---|---|---|---|
| ✅ Done | 01 PRD (v5.1) | — | PO approval pending |
| ✅ Done | 02 Domain & Business Rules (v2.1) | PRD | PO approval pending |
| ✅ Done | 03 Roles, Permissions & Workflows (v2.1) | PRD, Domain | PO approval pending |
| ✅ Done | 04 System Architecture (v2.2) | PRD, Domain, Roles | Current workflow reconciled |
| ✅ Done | 05 Database Design & Data Dictionary (v1.2) | Architecture | NO-GO; PO approval and OD resolution pending |
| ✅ Done | 06 Backend Technical Specification (v1.2) | All above + this memory | Implementation planning only; not an implementation contract |
| ✅ Draft | 07 API Contract & OpenAPI Specification (v1.2) | Docs 01–06 | Reconciled with UI v1.2; draft; technical/PO review required |
| ⏳ Setup | Complete SETUP-01 | Document 07 | Required before integrated implementation; does not require a new technical document |
| ✅ Draft | 08 Frontend Architecture & UI/UX Specification (v1.2) | Doc 07 | 31 screens classified and mapped; conditional decisions recorded; PO approval pending |
| ✅ Done | Pre-development readiness and closure report (v1.0) | Docs 01–08 | NO-GO; consolidated findings and actions |
| ⏳ Future | 09 Testing Strategy | Docs 06, 07, 08 | Unit, integration, security, fairness, concurrency tests |
| ⏳ Future | Database Migration ADR | Doc 05 + OD-13 decision | Migration tool and governance |
| ⏳ Future | Implementation Phases | Docs 06-09 + all OD approvals | Actual implementation |

---

## 15. Instructions for Future AI Agents

> [!IMPORTANT]
> These instructions are mandatory for every AI agent working on this project.

1. **Read this memory file first.** Treat it as the consolidated project context. Do not restart the full source analysis.
2. **Read only the source documents essential to your assigned task.** Do not re-read all historical documents unless a specific conflict requires verification.
3. **Never reopen confirmed decisions.** Decisions in Section 4 are confirmed. Do not reopen them without new contradictory evidence from an authoritative source.
4. **Never silently change approved business rules.** If a rule must change, PO approval is required; document it explicitly.
5. **Never introduce excluded functionality.** No Comp-Off, leave, attendance, payroll, ticket management, mutual swap, external ticket API.
6. **Never invent a fairness formula or weighting.** OD-06 is open; no numeric formula may be introduced.
7. **Never assume every Admin or TL is a Manager approver.** OD-01/OD-16 is open; fail closed until resolved.
8. **Update this memory file** when a new decision is formally approved. Record it in Section 4 and update Sections 12/13 accordingly.
9. **Preserve historical decisions and identify superseded versions.** Mark superseded decisions clearly.
10. **Keep all project documents consistent.** If a downstream document contradicts an approved decision, flag it; do not silently accept the contradiction.
11. **Document unresolved dependencies honestly.** If a task cannot be completed without an open decision, say so explicitly and document it as an implementation dependency.
12. **Preserve approved boundaries during integration.** Antigravity may resolve defects, but may not alter frameworks, business rules, API contracts or database design without approved change control.
13. **Treat Document 07 and `openapi.yaml` as the shared integration boundary.** Update them together before either agent adopts a contract change.
14. **Document 05 remains the detailed database source.** Do not redesign the database without an approved design change.
15. **Document 06 is the backend technical blueprint.** Do not generate JPA entity code, SQL migrations or controllers.

---

## 16. Memory Maintenance Protocol

After every future milestone, update this file:

| Field | Action |
|---|---|
| Memory Version | Increment (1.1 → 1.2 → 2.0 for major milestones) |
| Last Updated | Update to the date of the milestone |
| Latest Completed Document | Update to the new document |
| Newly Approved Decisions | Add to Section 4; update status from OPEN to CONFIRMED |
| Superseded Decisions | Mark old decision in Section 4 with status SUPERSEDED and cross-reference |
| Changed Architecture | Update Section 7 if technology decisions change |
| New Technical Dependencies | Add to Section 13 if new blockers are identified |
| Current Next Action | Update Section 12.4 |

**ONE cumulative master memory file only.** Do not create `ROSTER_PROJECT_MASTER_MEMORY_v2.md` or similar. Maintain this single file.

---
*Memory Version 1.6 | Last updated: 2026-11-27 | Historical pre-final draft; superseded by §18*
## 18. Final authorized decisions — active baseline (27 November 2026)

The Product Owner explicitly authorized final policy and technical decisions within existing scope. `ROSTER_CONFIRMED_BUSINESS_DECISIONS.md` v1.2 Parts F and G are the active decision authority. Part F decisions retain `FINALIZED_UNDER_RECONCILIATION_AUTHORITY` provenance; Part G PO-01..12 are direct Product Owner decisions. Neither provenance is relabeled. Resolved historical open-decision passages are superseded.

- Fairness counts effective published Primary assignment slots; approved replacements transfer the one slot credit. No duty completion, attendance, or actual-performer workflow exists.
- FDR-02 comparator: hard feasibility; lexicographically minimize descending published credits plus full proposed Primary allocation across eligible employees; maximize same-team pairs among equals; maximize ascending days-since-last effective Primary vector (no history = infinity); stable canonical-input/version/slot/employee hash. No fixed cooldown.
- Staffing is explicit per holiday (Primary >= 1, Standby >= 0, no defaults; combined count bounded by active eligible pool). Availability is immediate but cannot alter published assignment; generation and publish revalidate.
- One active team per employee/date and one active TL/team/date. New/history-free employee begins at zero credits. Admins/TLs can be rostered when rotation-eligible.
- Replacement authority is an explicit scoped/time-bound grant, no self-grant, recusal of requester/assignee/candidates; no approver means pending escalation and no assignment mutation.
- Handover is informational, immutable once submitted, corrected with linked addendum; no acknowledgment. Published and closed-period correction uses reasoned child version, `ROSTER.REVISE` initiator, distinct `ROSTER.PUBLISH` actor and immutable prior version.
- Historical import, mutual swaps, duty completion, acknowledgement, Comp-Off, leave, attendance, payroll and ticket operations are excluded.
- Notifications: in-app plus configured provider-neutral email; retries 1m/5m/30m/2h/12h then failed/operations alert. Accounts: invitation 24h, reset 30m, both single-use hashed; BCrypt cost 12; 12 characters/72 UTF-8-byte maximum. Flyway is the selected forward-only migration tool.
- PO-01..12 settle employee write fields, effective rotation dates, unique mandatory email, Team Lead lifecycle/authority, trusted role-permission-scope resolution, one replacement approval permission, duty-history visibility, team-name limit, directory query scope and resource-level authorization.
- Runtime security remains a release blocker until authentication and effective resource-level authorization are implemented and validated; no account is granted access by default. User permission-grant provisioning has no approved grant actor and must remain denied until customer-controlled provisioning exists.
- Security and operations baselines are in Document 11. Codex owns backend and final integration/API/E2E; Antigravity owns frontend. Document 07/OpenAPI v3.0 is the shared contract.

Current document versions: PRD v5.5; Domain v2.4; Roles v2.4; Architecture v2.5; Database v1.5; Backend v1.5; API v3.0; OpenAPI 3.0.0; Frontend v3.0; Decision Register v1.2; Docs 09–13 v1.0; Database Readiness Review v3.1. Current update report is `ORGANIZATION_FOUNDATION_AUTHORIZED_DECISIONS_UPDATE_REPORT.md` v1.0; the earlier reconciliation report is retained as superseded history. Specification completeness is distinct from execution verification. External inputs still needed: repository/handoff provisioning, timezone and actual employee/team data, named approval/publisher appointments, SMTP credentials, hosting/TLS/secrets/base URLs, operations owner and RPO/RTO. No code, migration, deployment or runtime test was performed in the authorized decision-update documentation task. Existing implementation and initial migration status are outside this update.

