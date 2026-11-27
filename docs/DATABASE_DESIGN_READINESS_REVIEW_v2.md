# DATABASE DESIGN READINESS REVIEW
## Holiday Support Roster Management System

| Field | Value |
|---|---|
| Document ID | ROSTER-DB-READINESS-002 |
| Version | 3.1 |
| Date | 27 November 2026 |
| Status | **CONDITIONAL GO — specification baseline ready; external setup remains** |
| Reviewed documents | Decision Register v1.1; PRD v5.4; Domain v2.3; Roles v2.3; Architecture v2.4; Database v1.4; Backend v1.4; API v2.1/OpenAPI 2.1.0; Frontend v2.1; Docs 09–13 v1.0 |
| Review scope | Logical/physical database readiness only; no schema or DDL produced |

## 1. Executive conclusion

### Current determination (v3.1)

The earlier NO-GO assessments below are retained as historical review evidence and are superseded. The Product Owner explicitly authorized final decisions; Part F of the current decision register closes the product-policy and technical design items. Database design is complete enough to begin implementation. External environment data, access, credentials, repository/handoff provisioning and operations appointments remain necessary before integrated or production use. No schema migration or runtime operation has been executed.

### Historical assessment (v2.1; superseded)

<badge>NO-GO — Database design must not begin</badge>

The documentation has been reconciled against the confirmed business rules supplied in the current instructions. The new requirements materially improve the definition of staffing, fairness, standby, manual assignment, replacement approval and duty reporting.

(This paragraph is part of the superseded v2.1 historical assessment; current authority and status are stated above.)

No conceptual schema, ERD, SQL DDL, JPA entity, repository, API or implementation should be created until the blocking decisions below are resolved and the Product Owner issues a GO decision.

## 2. Source audit and authority

| Source | Located | Version/status evidence | Finding |
|---|---|---|---|
| `Roster_Corrected_Final_PRD_v4.md` | Yes, Project Library | v4.0 corrected final baseline; states no implementation is authorised by that audit | Reconciled into v5 draft; formal PO approval not evidenced |
| `02_DOMAIN_AND_BUSINESS_RULES.md` | Yes, Project Library | v1.0 Draft for Product-Owner Decision | Reconciled into v2 draft |
| `03_ROLES_PERMISSIONS_AND_WORKFLOWS.md` | Yes, Project Library | v1.0 source-aligned; approval required where source leaves policy open | Reconciled into v2 draft |
| `04_SYSTEM_ARCHITECTURE.md` | Yes, Project Library | v1.0 Architecture proposal for review; not approved for implementation | Reconciled into v2 draft |
| `Database_Readiness_Report.md` | Yes, Project Library | Phase 1 audit; NO-GO | Reassessed here |
| `ROSTER_CONFIRMED_BUSINESS_DECISIONS.md` | **Not located** | No exact file in Project Library listing or search results | Current pasted rules applied; original register not preserved/verified |

The original source files remain in the Project Library and were not overwritten. Raw-byte backup copies could not be created because these Library-backed Project files expose retrieval-only content, not an authorised raw-file materialization path. See `SOURCE_BACKUP_MANIFEST.md`.

## 3. Confirmed directions applied

- Per-holiday configurable active Primary staffing and separately optional Standby staffing; no fixed 2+1.
- No fixed 14-day cooldown or arbitrary date-based eligibility ban.
- Organisation-wide fairness; no team-wise quotas/counters.
- Same-team pairing as a soft preference subordinate to eligibility, availability and global fairness.
- Chronological generation with temporary workload updates, combination evaluation, whole-roster validation and controlled backtracking/reassignment.
- Standby is backup only; designation is not completed duty; actual duty attributed to performer after activation.
- Separate accounting for actual completed duties, future published assignments, Standby, activations, performed duties after activation, drafts, replacements and cancellations.
- Actual completed Primary duties drive historical fairness; drafts do not alter official historical workload.
- Automatic and manual assignment; manual assignment uses mandatory eligibility/availability validation.
- Manager-approved replacement; Standby suggested first if eligible/available; assignment unchanged until approval; unresolved gap when no valid candidate exists.
- Preserve requester, approver, decision, timestamp, reason, original employee and replacement employee.
- One-way replacement is not mutual swap; Handover remains separate.
- Existing ticketing platform continues ticket operations; no duplicate ticket management or invented API.
- Explicit exclusions preserved: Comp-Off, compensatory leave, leave management, attendance management, payroll, ticket management and ticket replacement.

## 4. Material source contradictions corrected

| Topic | Previous baseline | Reconciled documents | Result |
|---|---|---|---|
| Staffing | Configurable per holiday type with overrides; examples often 2+1 | Separate Primary and optional Standby counts per holiday; no hardcoded 2+1 | Requirement corrected; exact defaults/snapshot remain open |
| Cooldown | N=1 holiday default | No fixed date cooldown; recent assignment only secondary soft consideration | Old hard/date exclusion removed |
| Team pairing | Cross-team diversity | Same-team preference | Reversed as explicit new direction |
| Fairness | Planned Load included draft and published Primary slots | Actual completed Primary duties drive historical fairness; drafts separate | Workload dimensions separated |
| Generation | Chronological local allocation | Chronological allocation plus combination evaluation and whole-roster validation/backtracking | Global validation made mandatory |
| Standby | Separate Standby Load; promotion changes treatment | Backup-only; separate activation and performer attribution | History semantics strengthened |
| Attendance | Attendance subsystem with WORKED/NOT_WORKED states | Attendance management excluded; minimal completion evidence unresolved | No attendance subsystem; completion event remains blocking |
| Replacement | Cover/swap/handover ambiguity | Manager-approved one-way replacement; Handover separate | Workflow clarified; authority mapping remains open |
| Roles | Three roles: Admin, TL, Member | Manager approval mandated but not mapped to existing roles | Explicitly unresolved; no automatic Admin privilege |
| Ticketing | External ticketing platform context | Ticket platform retains ticket operations; no API assumptions | Scope boundary clarified |

## 5. Reassessment of previous DR-01 through DR-10

| Previous issue | Current status | Evidence in regenerated documents | Resolved? | DB blocker? |
|---|---|---|---|---|
| DR-01 Fixed 2+1 vs configurable staffing | Partly resolved | PRD FR-HOL-01..06; Domain BR-HOL-001..004 | Policy direction resolved; exact separate counts/default hierarchy open | YES |
| DR-02 14-day vs N=1 holiday cooldown | Resolved as to no fixed date cooldown | PRD FR-GEN-04..05; Domain BR-FAR-003..004 | Yes; no date-based prohibition. No residual N=1 hard cooldown | No, subject to fairness approval |
| DR-03 Cooldown hard/soft | Resolved as no hard cooldown | Domain BR-FAR-003..004 | Yes for current rule | No |
| DR-04 Skills in scope | Resolved by existing PRD exclusion retained | PRD exclusions; Domain Section 6.12 | Yes; skill scheduling excluded | No |
| DR-05 Standby counts equally to Primary | Resolved | PRD FR-STB; Domain BR-STB; workload dimensions | Yes; separate facts, actual performer attribution | No, completion event still blocks actual-duty model |
| DR-06 Official load for draft assignments | Partly resolved | PRD FR-GEN/FR-AN; Domain BR-FAR/WL | Draft excluded from official historical workload; precise published future ranking influence open | YES through OD-06 |
| DR-07 One-way replacement vs Handover | Resolved semantically | PRD FR-REP-03..05; Domain BR-REP-009..011 | Yes: replacement and Handover separate | No, Manager authority remains separate blocker |
| DR-08 Manager approval authority | New issue introduced by mandatory replacement | PRD OD-01/OD-16; Roles Sections 1, 7, 13; Architecture Sections 9, 10 | No | YES |
| DR-09 Team pairing preference | Resolved | PRD FR-GEN-06; Domain BR-TEAM-003..005 | Yes: same-team soft preference | No |
| DR-10 Global fairness vs team fairness | Resolved | PRD OBJ-01/FR-GEN; Domain BR-TEAM-002, BR-FAR | Yes: global only | No; exact fairness objective OD-06 remains |

## 6. Remaining database-blocking decisions

| ID | Decision | Database impact | Blocking reason |
|---|---|---|---|
| OD-01 | Manager approval identity, role mapping, scope, delegation and self-approval | Role/permission grants, approval actor references, workflow ownership | Mandatory approval cannot be modelled safely without authoritative actor model |
| OD-02 | Separate Primary and Standby count configuration, defaults, requirement snapshots | Holiday/support requirement/slot cardinality | Determines required slot types and counts |
| OD-03 | Ordinary availability approval | Availability states, actor/decision history | Determines lifecycle and relationship cardinality |
| OD-04 | New-joiner fairness baseline | Employee baseline/adjustment provenance | Changes workload inputs and persisted history |
| OD-05 | Multiple team memberships and multiple co-equal Team Leads | Membership and leadership cardinality/effective dating | Determines relationships and scope resolution |
| OD-06 | Exact fairness objective, comparison order, deterministic tie-break, algorithm version | Generation snapshot, fairness explanation and reproducibility records | Determines persisted inputs/results and reproducibility contract |
| OD-08 | Duty completion event without attendance management | Actual duty fact, performer attribution, correction history | Actual completed duty drives fairness but source event is undefined |
| OD-10 | Closed roster revision/correction | Version lineage, state transitions, historical references | Determines whether closed versions can be revised or corrected |
| OD-11 | Holiday identity after date change | Holiday identity and uniqueness constraints | Determines whether references remain stable or records are replaced |
| OD-16 | Three-role model vs separate Manager application role | Role catalogue, permission mapping, authorization | Determines actor identity and approval authority |

Conditional blockers:
- **OD-12 historical import:** blocks if historical import is included in initial release; otherwise defer explicitly.
- **OD-13 migration tooling:** does not block conceptual modelling, but blocks implementation migration planning.
- **OD-09 handover acknowledgement:** blocks only if mandatory acknowledgement is in initial release.
- **OD-07 mutual swaps:** non-blocking if excluded from initial release.
- **OD-15 secondary notification provider:** not a logical model blocker; production readiness dependency.

## 7. Entity and relationship decisions requiring approval

1. Holiday identity and date-change history.
2. Holiday-to-support-requirement snapshot cardinality and versioning.
3. Employee-to-team membership cardinality and overlapping effective intervals.
4. Team-to-Team Lead assignment cardinality.
5. Manager approval authority representation and scope.
6. Replacement request to original assignment, candidate and approval decision cardinality.
7. Standby activation relationship to the original Primary slot and actual performer.
8. Duty completion event and correction history.
9. Roster period/version lineage and closed-period revision rules.
10. Handover report acknowledgement and retention if in scope.
11. Historical import provenance and partial/all-or-nothing acceptance if in scope.

These are logical domain decisions, not a proposed schema.

## 8. Lifecycle completeness review

| Lifecycle | Current definition | Remaining issue |
|---|---|---|
| Holiday | Planned/active/closed/cancelled concept | Date change identity OD-11 |
| Support requirement | Per-holiday separate Primary/Standby counts | Defaults/snapshot OD-02 |
| Availability | Declaration; assigned unavailability creates replacement | Ordinary approval OD-03 |
| Roster version | Draft, reviewed, published, superseded; published immutable | Closed revision OD-10 |
| Assignment | Draft/published/current/replaced/cancelled/completed concepts | Completion source OD-08 |
| Replacement | Submitted, awaiting Manager, approved/rejected, unresolved gap | Manager authority OD-01/16 |
| Standby | Designated, activated, performed or not activated | Activation authorization and completion semantics |
| Handover | Draft, submitted, optional acknowledged | OD-09 |
| Duty completion | Actual performed duty drives fairness | OD-08 |
| Historical import | Existing PRD supports import | OD-12 |

## 9. Data integrity requirements

Before schema design, the approved domain must preserve:
- no employee assigned twice on the same holiday;
- assignment eligibility and availability at commit time;
- valid Primary/Standby slot type and configured count;
- effective-dated employment, membership and role history;
- no effective assignment change before Manager approval;
- original assignment and replacement lineage;
- distinct Standby designation, activation and actual performed duty;
- immutable published roster versions and parent revision references;
- no draft contribution to official completed-duty history;
- append-only approval and audit facts;
- idempotent generation, approval and notification intents;
- stable holiday references after date corrections;
- referential retention when employees/teams are deactivated.

## 10. Transaction and concurrency requirements

- Replacement approval must revalidate current candidate eligibility, availability and roster version inside the commit transaction.
- Rejection must not mutate the effective assignment.
- No-candidate result must persist a gap without assigning an invalid candidate.
- Publication must atomically transition the roster version and create notification intents.
- Generation must persist its frozen input fingerprint, algorithm version and output explanation.
- Concurrent manual edits must detect stale roster versions and prevent lost updates.
- Notification delivery must be decoupled using an outbox or equivalent approved reliable mechanism.
- Do not implement distributed transactions for the modular monolith.

## 11. Architecture readiness

Stable technical direction:
- Existing HTML5/CSS3/Vanilla JavaScript ES Modules baseline, pending ARC-01 because v0 defaults to React/Next.js/TypeScript.
- Java/Spring Boot/Spring Security/Spring Data JPA/Hibernate/Jakarta Validation.
- MySQL.
- Single-deployable modular monolith.
- Pure allocation engine.
- Server-side authorization.
- Transaction-time validation and optimistic concurrency.
- Immutable published versions and audit history.
- Transactional notification outbox proposal.

Open architecture decisions:
- Migration tool (OD-13).
- Authentication/session proposal approval.
- Manager authority model (OD-01/16).
- Completion event (OD-08).
- Exact generation objective (OD-06).
- Notification provider/secondary channel (OD-15).
- Frontend framework compatibility with the confirmed v0 workflow (ARC-01; not a database-design blocker).

## 12. Cross-document consistency check

| Area | PRD | Domain | Roles | Architecture | Review |
|---|---|---|---|---|---|
| Configurable staffing | Pass | Pass | Pass | Pass | Reviewed; counts open |
| Global fairness | Pass | Pass | Pass | Pass | Pass |
| Same-team preference | Pass | Pass | Pass | Pass | Pass |
| No fixed cooldown | Pass | Pass | Pass | Pass | Pass |
| Sequential allocation/global validation | Pass | Pass | Pass | Pass | Fairness objective open |
| Standby accounting | Pass | Pass | Pass | Pass | Completion event open |
| Manual allocation | Pass | Pass | Pass | Pass | Pass |
| Manager-approved replacement | Pass | Pass | Pass | Pass | Role mapping blocks |
| Duty history | Pass | Pass | Pass | Pass | Completion event blocks |
| Draft/published lifecycle | Pass | Pass | Pass | Pass | Closed revision open |
| Audit history | Pass | Pass | Pass | Pass | Pass |
| Project exclusions | Pass | Pass | Pass | Pass | Pass |

“Pass” means the requirement is substantively represented, not that the open decisions are approved.

## 13. Readiness verdict

<badge color="danger">NO-GO</badge>

**Blocking issues:** OD-01, OD-02, OD-03, OD-04, OD-05, OD-06, OD-08, OD-10, OD-11 and OD-16. OD-12 additionally blocks if historical import remains in the initial release.

**Non-blocking if explicitly deferred:** OD-07 mutual swaps, OD-09 handover acknowledgement, OD-13 migration tool for conceptual modelling, OD-15 notification secondary channel for logical data modelling.

**Evidence:** These questions change domain cardinalities, actor authority, lifecycle states, historical workload facts, roster versioning and identity/uniqueness rules. They cannot safely be treated as implementation details.

## 14. Phase 3 recommendation

Do not begin database implementation. The Product Owner must resolve the blocking decisions and approve the foundational baseline. The authoritative decision register is already supplied and reconciled. Re-run this review after approval. A future GO must be evidence-based; document regeneration alone is not sufficient.
