# 10 — Testing and QA Strategy

| Field | Value |
|---|---|
| Document ID | ROSTER-QA-010 |
| Version | 1.0 |
| Date | 27 November 2026 |
| Status | Finalized test strategy; execution not performed |
| Authority | Decision Register v1.1; PRD v5.3; Documents 02–08 current baseline |

## 1. Test layers

- Domain unit tests for fairness comparator, eligibility, staffing, state transitions, recusal and revision rules.
- Service/transaction tests against isolated MySQL for optimistic locking, idempotency, assignment/version lineage, permission checks and outbox behavior.
- API contract tests validating DTOs, status codes, OpenAPI examples, authorization and errors.
- Frontend component/flow tests for all 31 screens, loading/empty/error/success states, role and permission visibility, keyboard access and responsive behavior.
- End-to-end tests on isolated integration environment for invitation/login, availability, generation, manual assignment, publication, replacement, revision, notification and handover.
- Security tests for session/CSRF, object-level authorization, non-enumeration, token replay, injection/XSS, rate limits and audit protection.

## 2. Critical rule test matrix

| Area | Required cases |
|---|---|
| Staffing | Primary <1 rejected; Standby <0 rejected; combined count above active eligible pool rejected; explicit counts required; date-specific infeasibility returned and publication blocked |
| Fairness FDR-02 | Exact lexicographic order; replacement credit transfers once; draft and Standby do not earn Primary credit; zero-history is zero; same-team preference never beats fairness; no fixed cooldown; hash stability for identical canonical inputs; fairness exception explained |
| Generation | Multi-holiday global comparison; backtracking/branch-and-bound reproducibility; stale source snapshot detection; repeated generation creates a distinct draft without changing official published history |
| Availability | Effective on submission; update invalidates draft snapshot; generation and publish revalidate; published assignment unchanged; assignment conflict requires replacement workflow |
| Replacement | Standby suggested first if valid; alternative candidate validated; requester/assignee/candidate recused; no self-grant; grant scope/time honored; no approver keeps request pending with escalation; no assignment mutation before decision; duplicate request/idempotency and concurrent decisions safe |
| Publication/revision | Draft not effective; publish all-or-nothing; reason required; closed-period revision allowed; previous version immutable; initiator cannot publish own revision; distinct publisher required; date/staffing/cancellation history preserved; one effective credit per slot |
| Account security | Invite/reset tokens hashed, single-use and expiry enforced; reset response does not enumerate; BCrypt; password bounds; reset/deactivation/role change revokes sessions; 10 consecutive failed logins cause 15-minute lock |
| Notifications | Per-event/recipient/channel deduplication; retry schedule; failure does not rollback; terminal failure alert and authorized retry; in-app record retained |
| Exclusions | No completion/actual-performer, acknowledgment, attendance, swaps, leave, payroll, Comp-Off, or ticketing endpoints/tables/flows |

## 3. Release gates

No release is considered verified until all automated suites pass in CI, critical security findings are resolved, migration and backup restore drills succeed, and the named operational owner signs the runbook. This specification exercise executed no application tests or migrations. Record command, commit, environment and exit code in the release evidence when execution occurs.
