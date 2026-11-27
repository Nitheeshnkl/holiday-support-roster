# 02_DOMAIN_AND_BUSINESS_RULES
## Holiday Support Roster Management System

| Field | Value |
|---|---|
| Document ID | ROSTER-DOM-002 |
| Version | 2.3 — Finalized under reconciliation authority |
| Date | 27 November 2026 |
| Status | Finalized under reconciliation authority — implementation baseline |
| Governing PRD | `Roster_Corrected_Final_PRD_v5.md`, v5.4 |
| Decision authority | `ROSTER_CONFIRMED_BUSINESS_DECISIONS.md` v1.1 — Parts A and F with provenance |
| Architecture | Modular monolith; no schema/DDL in this document |

## Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 26 Nov 2026 | Original domain proposal; Draft for Product-Owner Decision |
| 2.0 | 26 Nov 2026 | Reconciled configurable staffing, global fairness, same-team preference, no fixed cooldown, standby accounting, manual assignment and Manager-approved replacement |
| 2.1 | 27 Nov 2026 | Validated against initial decision register. |
| 2.2 | 27 Nov 2026 | Finalized workload basis, fairness comparator, authority, staffing, availability, team, revision, holiday and handover rules under reconciliation authority. |
| 2.3 | 27 Nov 2026 | Added explicit scheduling eligibility for Admins/Team Leads and synchronized final domain invariants to the implementation baseline. |

## 1. Purpose and authority

This document defines domain concepts, business invariants, entity responsibilities, relationships, lifecycle rules, workload semantics and allocation requirements. It is a logical domain specification, not a physical schema. It does not define tables, columns, SQL, JPA entities or API contracts.

Source authority used:
1. `ROSTER_CONFIRMED_BUSINESS_DECISIONS.md` v1.1; Part F decisions are finalized under reconciliation authority and supersede conflicting legacy text.
2. Existing PRD requirements that do not conflict with that register.
3. Existing Domain, Roles and Architecture specifications as supporting detail.
4. No unresolved policy placeholder is active for the initial release; external data/provider values are explicit dependencies.

The active rules below are consistent with register v1.1. Decision provenance is recorded in register Part F.

## 2. Domain glossary

| Term | Definition |
|---|---|
| Holiday | A business date on which holiday support may be required |
| Primary | Active support assignment expected to perform the duty |
| Standby | Backup designation; neither designation nor activation creates a Primary workload credit |
| Support requirement | Per-holiday configured count of Primary and optional Standby personnel |
| Assignment | A person's placement in a specific slot/version |
| Original assignee | Person first assigned to a slot; retained after changes |
| Current/effective assignee | Person currently responsible under the effective published version |
| Unavailability report | A Member's declaration that they cannot perform an existing assignment |
| Replacement request | Approval workflow to substitute another person for an assigned employee |
| Replacement | One-way substitution; not a mutual swap |
| Standby activation | Audited event recording that the designated backup was called; it does not assert performance |
| Published Primary workload credit | One credit for the effective published assignee of a unique holiday/slot |
| Future published assignment | Effective published Primary assignment; contributes one workload credit even when future-dated |
| Published Primary credit | Credit from the currently effective published Primary assignment for a unique holiday/slot |
| Draft assignment | Provisional assignment in an unpublished roster version |
| Generation run | A deterministic calculation over a frozen input snapshot |
| Roster version | A versioned plan; published versions are immutable |
| Handover | Operational information transfer, separate from assignment replacement |
| Manager approver | Account with explicit, scoped, time-bounded REPLACEMENT.APPROVE capability; conflicted participants are recused |
| Audit event | Append-only record of a material action or decision |

## 3. Domain entity inventory and responsibilities

The following is an entity inventory, not an instruction to create one table per item.

| Concept | Responsibility | Key relationships |
|---|---|---|
| Organisation Configuration | Organisation timezone, policy and operational settings | Holiday, employee, roster |
| Employee | Person eligible or potentially eligible for support | Account, membership, availability, assignment |
| User Account | Authentication and account lifecycle | Employee, role/permission grants |
| Team | Organisational grouping | Membership, Team Lead assignment |
| Team Membership | Effective-dated employee/team relationship | Employee, Team |
| Role Assignment | Effective-dated application role | Employee, role catalogue |
| Approval Authority Grant | Explicit scope to approve replacement | Approver, team/organisation, effective period |
| Holiday | Business date and holiday lifecycle | Support requirement, roster slots, availability |
| Holiday Support Requirement | Separate Primary and optional Standby counts for one holiday | Holiday |
| Availability Record | Availability/unavailability declaration | Employee, date/range, optional assignment |
| Roster Period | Planning interval | Holiday, roster version |
| Generation Run | Frozen inputs, algorithm version, output and explanation | Period, roster version |
| Roster Version | Draft/published snapshot and lineage | Period, slots, assignments |
| Roster Slot | A required Primary or Standby position | Holiday, version, assignment history |
| Assignment | Assignment fact and origin | Slot, employee, change history |
| Assignment Change | Append-only assignment transition | Original/new employee, request, actor |
| Replacement Request | Manager approval workflow | Original assignment, requester, approver, replacement candidate |
| Replacement Decision | Approve/reject decision and evidence | Request, approver |
| Standby Activation | Records activation request/action | Standby assignment, Primary slot, actor and timestamp |
| Handover Report/Item | Operational information transfer | Author, receiving role/person, assignment |
| Notification Intent/Delivery | Reliable notification lifecycle | Business event, recipient |
| Audit Event | Append-only provenance | Actor, target, action |
| Help Article/Category | Self-service content | Role visibility, version |
| Onboarding Progress | User onboarding completion | Employee/account, checklist |

## 4. Relationships and cardinalities

- One Holiday has exactly one effective support-requirement snapshot per roster version; every holiday requires explicit Primary (at least one) and Standby (zero or more) counts before generation.
- One Holiday may have zero or one active planning period association according to period policy; overlapping-period policy must be enforced.
- One Roster Period has one or more Roster Versions over its lifecycle.
- A Roster Version contains zero or more Roster Slots.
- Each Roster Slot belongs to one Holiday and one Roster Version and has a type: PRIMARY or STANDBY.
- A slot has an ordered history of Assignment facts; at most one assignment is effective for a slot in a given published version.
- An Employee may have many historical assignments.
- An Employee has at most one active Team Membership for any business date; intervals are non-overlapping and historical memberships remain.
- A Replacement Request relates to exactly one original assignment/slot and has one requester; it may have one suggested standby candidate and one selected replacement candidate.
- A Replacement Request has one or more decision-history entries only if resubmission/appeal is approved; otherwise one terminal Manager decision is expected.
- A Standby Activation links the designated Standby assignment to the Primary duty being covered and records the actor/time; it does not assert performance.
- There is no duty-completion event or actual-performer confirmation in the initial release.
- Handover Reports are associated with an assignment/duty but do not mutate assignment ownership.

## 5. Entity lifecycles

### 5.1 Holiday
`PLANNED -> ACTIVE_FOR_ROSTER -> CLOSED` or `CANCELLED`. Holiday identity is stable. A date/staffing change after publication requires a reasoned new roster version and two-person revise/publish authority; cancellation is a status transition, not deletion.

### 5.2 Roster Version
`DRAFT -> REVIEWED -> PUBLISHED -> SUPERSEDED` with immutable published snapshots. Any correction, including after period closure, creates a reasoned new version; `ROSTER.REVISE` initiator and a different `ROSTER.PUBLISH` actor are required. Previous versions remain immutable.

### 5.3 Assignment
`DRAFT -> PUBLISHED_CURRENT -> REPLACED / CANCELLED`. The original assignment remains historically visible. No completion state is recorded. Effective workload is one credit per holiday/slot, assigned only to the effective published employee.

### 5.4 Replacement Request
`SUBMITTED -> VALIDATING -> AWAITING_MANAGER_DECISION -> APPROVED / REJECTED`. If approved, the replacement becomes effective only within the successful approval transaction after final validation. If no valid candidate exists, it remains `UNRESOLVED_STAFFING_GAP` or an equivalent explicitly approved state. Rejection leaves the original assignment unchanged.

### 5.5 Standby
`DESIGNATED -> ACTIVATED` or `DESIGNATED -> NOT_ACTIVATED`. Activation is not evidence of performance and adds no Primary credit. An approved replacement changes the effective assignee and transfers that slot credit.

### 5.6 Handover
`DRAFT -> SUBMITTED -> ARCHIVED`. Submitted content is immutable; correction is a linked addendum. No receiver acknowledgement is in initial release. Submission must not change assignment ownership.

## 6. Business rules

Rule classes:
- **HARD:** mandatory eligibility/integrity rule.
- **SOFT:** preference only; never a hard exclusion.
- **DERIVED:** computed view/metric.
- **PERSISTED:** historical fact/event that must be retained.
- **DEFERRED:** outside initial release or external configuration, as stated explicitly.

### 6.1 Holiday staffing
- **BR-HOL-001 (HARD):** Staffing is configured separately for each holiday.
- **BR-HOL-002 (HARD):** Active Primary count and optional Standby count are distinct concepts.
- **BR-HOL-003 (HARD):** The system must not hardcode 2 Primary + 1 Standby.
- **BR-HOL-004 (HARD):** Primary ≥1 and Standby ≥0 are explicit per holiday with no defaults; combined counts cannot exceed active rotation-eligible employees for the date. Date-specific availability may still yield a reported generation gap.

### 6.2 Eligibility and availability
- **BR-ELG-001 (HARD):** Candidate must be active and eligible on the holiday's business date.
- **BR-ELG-002 (HARD):** Candidate must be available for the relevant duty window.
- **BR-ELG-003 (HARD):** No employee may occupy more than one slot on the same holiday.
- **BR-ELG-004 (HARD):** Manual and automatic assignment use the same hard eligibility and availability checks.
- **BR-AVL-001 (PERSISTED):** Availability/unavailability declarations retain actor, date/range, type, timestamp and change history.
- **BR-AVL-002 (HARD):** Availability is effective on submission for future generation/draft validation; it cannot mutate published assignment. Assignment-specific unavailability follows replacement approval.
- **BR-AVL-003 (HARD):** Reporting unavailability against a current assignment creates a replacement request; it does not silently remove the assignment.

### 6.3 Team membership and role
- **BR-TEAM-001 (HARD):** Team membership is organisational context, not an application permission grant.
- **BR-TEAM-002 (HARD):** Global fairness is calculated across all eligible employees; no team-wise quotas or fairness counters exist.
- **BR-TEAM-003 (SOFT):** Prefer same-team pairing for a holiday when feasible.
- **BR-TEAM-004 (SOFT):** If the team does not have enough eligible people, candidates from another team may be selected.
- **BR-TEAM-005 (HARD):** Same-team preference never overrides mandatory eligibility, availability or global fairness.
- **BR-TEAM-006 (HARD):** One active team membership per employee/date; one active Team Lead per team/date; histories are effective-dated.
- **BR-TEAM-007 (HARD):** Role does not exclude an employee from scheduling. Any active, rotation-eligible employee, including Admins and Team Leads, may be allocated unless explicitly ineligible or unavailable.

### 6.4 Fairness and cooldown
- **BR-FAR-001 (HARD):** Every effective published Primary assignment drives historical fairness; each unique holiday/slot contributes exactly one credit to its effective assignee. Authorized replacement transfers the credit; the original assignee does not retain it.
- **BR-FAR-002 (HARD):** Fairness scope is organisation-wide.
- **BR-FAR-003 (HARD):** No fixed 14-day cooldown exists.
- **BR-FAR-004 (SOFT):** Recent assignments may be considered only as a secondary consideration when historical workload is otherwise comparable.
- **BR-FAR-005 (HARD):** Draft assignments do not change published workload credits; proposed Primary assignments are temporary in-run credits only.
- **BR-FAR-006 (DERIVED):** Published credits, future published plan, Standby assignments/activations, draft, replaced and cancelled records are separately reported. The system does not collect or infer actual performance.
- **BR-FAR-007 (HARD):** Zero-history employees start at zero credits; policy v1 compares full allocation by lexicographic fairness vector, team pairing, recency, then stable hash (FDR-02/06).
- **BR-FAR-008 (HARD):** Implement the exact documented comparator; no alternate score/weights are permitted without versioned approval.

### 6.5 Sequential allocation and whole-roster validation
- **BR-ALG-001 (HARD):** Process selected holidays chronologically.
- **BR-ALG-002 (HARD):** Update temporary workload after each allocation; those temporary allocations influence later holidays in the same run.
- **BR-ALG-003 (HARD):** Evaluate candidate combinations, not just independent individual rankings.
- **BR-ALG-004 (HARD):** Validate fairness across the complete generated roster.
- **BR-ALG-005 (HARD):** Use controlled reassignment/backtracking when an earlier local choice creates avoidable global unfairness.
- **BR-ALG-006 (HARD):** Algorithm behaviour must be deterministic and explainable.
- **BR-ALG-007 (HARD):** Policy version 1 uses exhaustive deterministic branch-and-bound over feasible whole-period allocations and the lexicographic comparator in FDR-02; identical input fingerprints reproduce the same outcome.

### 6.6 Standby and workload
- **BR-STB-001 (HARD):** Standby is backup only, not active Primary support.
- **BR-STB-002 (HARD):** Standby designation alone does not count as completed duty.
- **BR-STB-003 (PERSISTED):** Standby assignment history is separate from Primary assignment history.
- **BR-STB-004 (PERSISTED):** Standby activation is a separate event.
- **BR-STB-005 (HARD):** Standby activation never asserts performance or transfers credit; only the approved published replacement changes the credited assignee.
- **BR-STB-006 (PERSISTED):** Original assignment and replacement/activation lineage are retained.
- **BR-WL-001 (DERIVED):** Report effective published Primary assignments separately from future published assignments, Standby assignments/activations, draft assignments, replaced assignments and cancelled assignments. No completion or actual-performer fact exists.
- **BR-WL-002 (HARD):** Do not combine these into an unqualified total.
- **BR-WL-003 (HARD):** Draft allocations affect temporary generation state but not official historical workload.

### 6.7 Manual assignment and overrides
- **BR-MAN-001 (HARD):** Manual assignment is supported.
- **BR-MAN-002 (HARD):** Manual assignment must revalidate eligibility, availability, uniqueness and roster-version state.
- **BR-MAN-003 (PERSISTED):** Assignment origin is recorded as AUTOMATIC or MANUAL.
- **BR-MAN-004 (PERSISTED):** Fairness override requires authorised actor, reason and audit record.
- **BR-MAN-005 (HARD):** Manual action cannot bypass hard eligibility or availability.

### 6.8 Replacement and approval
- **BR-REP-001 (HARD):** An assigned employee may report unavailability for the assigned holiday.
- **BR-REP-002 (HARD):** A replacement request is created and Manager approval is mandatory.
- **BR-REP-003 (HARD):** The designated Standby employee is suggested first if eligible and available.
- **BR-REP-004 (HARD):** Manager may approve the suggested Standby person or manually select another eligible and available employee.
- **BR-REP-005 (HARD):** Final eligibility and availability are revalidated at approval/commit time.
- **BR-REP-006 (HARD):** The effective assignment does not change before Manager approval.
- **BR-REP-007 (HARD):** If no eligible replacement exists, preserve the original assignment and show an unresolved staffing gap.
- **BR-REP-008 (PERSISTED):** Preserve requester, approver, decision, timestamp, reason, original employee, replacement employee and validation outcome.
- **BR-REP-009 (HARD):** One-way replacement is not a mutual date-for-date swap.
- **BR-REP-010 (OUT OF INITIAL RELEASE):** Mutual swaps are excluded.
- **BR-REP-011 (HARD):** Approver requires explicit scoped, time-bounded `REPLACEMENT.APPROVE`; no default Admin/TL authority. Requesters, affected assignees and proposed candidates are recused. Grants are administered with `ORG.AUTHORITY.MANAGE`; no self-grant. If no eligible approver is available, leave assignment unchanged and escalate the pending request.

### 6.9 Duty completion
- **BR-CMP-001 (OUT OF INITIAL RELEASE):** No duty-completion or actual-performance confirmation is collected.
- **BR-CMP-002 (HARD):** Do not introduce attendance management, completion events, evidence uploads, or post-holiday confirmation workflows.

### 6.10 Handover
- **BR-HO-001 (HARD):** Handover is operational information transfer, not assignment replacement.
- **BR-HO-002 (HARD):** Handover must not imply ticket management or external ticket API integration.
- **BR-HO-003 (HARD):** No acknowledgement or mandatory receiver in initial release; submitted content is immutable and corrections use linked addenda.

### 6.11 Publication, history and audit
- **BR-PUB-001 (HARD):** Draft and published assignment states remain distinct.
- **BR-PUB-002 (HARD):** Draft assignment changes do not alter published workload credits.
- **BR-PUB-003 (HARD):** Published versions are immutable; changes require a new revision.
- **BR-PUB-004 (PERSISTED):** Preserve original assignee and all assignment changes.
- **BR-PUB-005 (HARD):** Published and closed rosters are corrected only through an append-only new version, reason, separate initiator/publisher and full audit.
- **BR-HIST-001 (PERSISTED):** Retain original and replacement assignment facts; never overwrite them with only the latest assignee.
- **BR-AUD-001 (PERSISTED):** Material roster, availability, replacement, approval, standby activation, publication, manual override and revision actions are auditable.
- **BR-AUD-002 (PERSISTED):** Audit event identifies actor, action, target, timestamp, reason and relevant before/after references.

### 6.12 Ticketing platform and exclusions
- **BR-EXT-001 (HARD):** Existing ticketing platform continues normal ticket assignment and ticket operations.
- **BR-EXT-002 (HARD):** This application manages holiday support roster responsibilities only.
- **BR-EXT-003 (HARD):** No ticket ownership or shared ownership model is assumed.
- **BR-EXT-004 (HARD):** No ticketing API, endpoint, vendor, authentication method or payload is invented.
- **BR-EXC-001 (HARD):** No Comp-Off, compensatory leave, leave management, attendance management, payroll, ticket management or ticket replacement.

## 7. Allocation algorithm requirements

The engine receives a frozen input snapshot containing holiday order, explicit staffing requirements, eligible employees, effective team memberships, availability, effective published Primary credits, separate Standby history and policy version.

Required stages:
1. Validate input snapshot and holiday chronology.
2. Build eligible candidate sets using hard constraints.
3. Exclude unavailable, inactive, non-rotation or duplicate candidates.
4. Construct feasible candidate combinations for each holiday's Primary and optional Standby slots.
5. Apply same-team preference only as a soft criterion.
6. Use organisation-wide effective published Primary credits as the historical fairness basis; replacements transfer the slot credit.
7. Allocate holidays chronologically and update temporary projected workload after each holiday.
8. Evaluate whole-period distribution, not only local per-holiday rankings.
9. Reassign/backtrack where an earlier local choice causes avoidable global unfairness.
10. Produce a final roster, explanation per decision, fairness comparison, feasibility report and unresolved gaps.

Implement FDR-02 policy v1: (1) hard feasibility; (2) lexicographically minimize the descending vector of effective published credits plus proposed Primary allocation for employees eligible for at least one selected slot; (3) maximize same-team pairs among equal-fairness solutions; (4) maximize the ascending vector of days since last effective published Primary (no history = infinity); (5) stable hash of canonical input fingerprint, algorithm version, slot key and employee code. Return comparison and exception explanations.

## 8. Workload dimensions

| Dimension | Meaning | Fairness/history treatment |
|---|---|---|
| Effective published Primary credits | One credit per effective unique holiday/slot; replacement transfers it | Drives historical fairness |
| Future published Primary assignments | Future published responsibility | Report separately; exact future planning influence to be approved |
| Standby assignments | Backup designation | Separate; not completed Primary duty |
| Standby activations | Standby called to perform | Separate activation history |
| Actual duty completion | Not collected | No actual performer claim |
| Draft assignments | Unpublished plan | No official historical impact; temporary in-run influence |
| Replaced assignments | Original assignment no longer effective | Preserve history; credit current effective assignee only |
| Cancelled assignments | Assignment/holiday cancelled | Report separately; not actual completed duty |

## 9. Permission and approval domain rules

- Application roles, organisational membership and approval authority are separate concepts.
- The PRD baseline has Admin, Team Lead and Member only.
- Replacement requires a Manager approval decision.
- The Manager is a user with the explicit scoped, time-bounded `REPLACEMENT.APPROVE` capability; the application retains only Admin, Team Lead and Member roles.
- Approval is invalid if the actor lacks a live grant, acts outside its scope, granted themselves authority, or is a requester, affected assignee or proposed candidate.
- Admin may administer grants only through `ORG.AUTHORITY.MANAGE`; grants record scope, effective dates, grantor, reason and revocation. No eligible approver means pending/escalated; no assignment change.

## 10. Open decisions

| ID | Question | Affected concepts | DB impact |
|---|---|---|---|
| OD-01 | Resolved by FDR-03; explicit scoped capability and participant recusal | Replacement Decision | RESOLVED |
| OD-02 | Resolved by FDR-04; explicit counts/no defaults | Holiday, Support Requirement, Roster Slot | RESOLVED |
| OD-03 | Resolved by FDR-05; effective on submission; published roster protected | Availability lifecycle | RESOLVED |
| OD-04 | Resolved by FDR-06; zero historical credits; no imputation | Employee, workload baseline | RESOLVED |
| OD-05 | Resolved by FDR-07; one current team per employee, one active lead per team | Membership and leadership cardinality | RESOLVED |
| OD-06 | Resolved by FDR-02; policy v1 comparator | Generation Run, snapshots, explanation | RESOLVED |
| OD-07 | Mutual swaps in scope? | Swap request and approval | OUT OF INITIAL RELEASE |
| OD-08 | Superseded; completion/performance tracking excluded by FDR-01 | No completion entity | OUT OF INITIAL RELEASE |
| OD-09 | Resolved by FDR-08; acknowledgement deferred; linked addenda | Handover lifecycle | RESOLVED |
| OD-10 | Resolved by FDR-09; append-only two-person revision/publish | Roster Version | RESOLVED |
| OD-11 | Resolved by FDR-10; stable identity and date history | Holiday identity/history | RESOLVED |
| OD-12 | Out of initial release by FDR-11; no import data | Import lifecycle/history | OUT OF INITIAL RELEASE |
| OD-13 | Resolved by FDR-14; Flyway versioned SQL migrations | Deployment architecture | RESOLVED |
| OD-14 | Multi-organisation per deployment | Organisation boundary | Not blocking while single-org-per-deployment remains fixed |
| OD-15 | Critical notification secondary channel/provider | Notification delivery | Resolved provider-neutral email; configured provider/credentials remain external deployment dependency |
| OD-16 | Resolved by FDR-03; retain three roles plus scoped capability | Role catalogue/authorization | RESOLVED |

## 11. Source reconciliation notes

| Previous source rule | Reconciled treatment |
|---|---|
| PRD N=1 holiday cooldown | Removed as a hard/date eligibility rule; recent assignment may only be a secondary soft consideration |
| Cross-team diversity | Replaced by same-team pairing preference, subordinate to global fairness and hard constraints |
| Planned Load includes draft and published Primary assignments | Effective published Primary assignment credits drive fairness; drafts are temporary run-only projection |
| Standby included only after promotion in Planned Load | Standby assignment and activation are reported separately; approved replacement transfers the published slot credit |
| Attendance confirmation and WORKED/NOT_WORKED workflow | Duty completion and actual-performer tracking are excluded |
| Fixed 2+1 example | No hardcoded 2+1; per-holiday Primary and optional Standby counts |
| Handover/one-way transfer ambiguity | Replacement is a separate one-way approval workflow; Handover is information transfer |
| Swap approval model | Mutual swaps are excluded; do not merge with replacement |

## 12. Domain invariants checklist

- No fixed date cooldown.
- Global fairness only; no team fairness counters.
- Same-team pairing is soft and subordinate.
- Chronological generation plus whole-roster fairness validation.
- Standby is backup, not automatically completed duty.
- Only the currently effective published Primary assignee receives the slot credit; no actual performer is recorded.
- Draft does not alter official historical workload.
- Manual and automatic assignments share hard validation.
- Manager approval precedes effective replacement.
- Original assignment and approval history are immutable facts.
- Unresolved gaps remain visible.
- No ticket-management duplication or excluded product capabilities.

## 13. Final reconciliation authority

This is the active Domain v2.3 rule set under Register v1.1 Part F. Historical mentions of an open OD or actual completed duty elsewhere in the original proposal are superseded by the rules and table in this version. Official fairness is effective published Primary assignment credit, transferred on authorized replacement; no completion/actual-performer data is collected. `ROSTER.REVISE` plus a different `ROSTER.PUBLISH` actor is required for any published correction, including closed periods. Availability is immediately effective but never changes a published assignment. The precise fairness comparator is FDR-02 as stated in §7. Any earlier open-decision language is historical only.
