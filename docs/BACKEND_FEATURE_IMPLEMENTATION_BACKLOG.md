# Backend Feature Implementation Backlog

This backlog is derived from `docs/openapi.yaml` v3.0.0, Documents 07/08, and the approved PO decisions. It does not add routes or business policy.

| Module | Contract operations / current state | Persistence and rules | Authorization, tests, dependencies |
|---|---|---|---|
| Organization and employees | V1/V2 employee, team, membership and Team Lead operations are implemented in the existing foundation; lifecycle/status and roles remain incomplete. | V2-V7 organization/account tables; inclusive membership and Team Lead intervals, optimistic versions, audit. | Scoped organization/team/own reads and management tests exist. Depends on real account authority resolution for production use. |
| Authentication and account lifecycle | Session CSRF bootstrap exists; login/logout/me, invite, activation, reset, password change and account-status APIs remain unimplemented. | `user_account`, `account_action_token`, roles and permissions exist. Must use one-time hashed tokens, password byte limits, session revocation and audit. | Deny by default. Requires trusted role/permission/scope resolution and tests for inactive/locked accounts and CSRF. |
| Employee availability | V2 list/create/update/withdraw implemented in this milestone. | V8 `availability_record`; inclusive interval, ACTIVE/CANCELLED lifecycle, immediate use for future draft/generation only. | Own-scope `AVAILABILITY.MANAGE_OWN`; on-behalf access requires approved explicit grant. Unit and MySQL schema tests added; add API and overlap-policy tests with real identities. |
| Holiday management | V2 list/create/update implemented in this milestone. | V8 `holiday`; unique date, explicit counts, duty window, optimistic version. Capacity cannot exceed active rotation-eligible pool. Published-revision restriction awaits roster persistence. | `CALENDAR.READ` and ORG-scoped `CALENDAR.MANAGE`; add controller and published-reference integration tests. |
| Schedule periods and rosters | Roster-period/version APIs not implemented. | Add forward-only period/version/snapshot/slot/assignment migrations. Preserve immutable published versions. | `ROSTER.*` scoped permissions; depends on calendar, eligibility, availability and authority resolution. |
| Draft assignments and publishing | Candidate/create/publish/revise operations not implemented. | Requires slots, assignment lineage, idempotency and transactional outbox. Enforce FDR-02 fairness and FDR-04 staffing. | Requires `ROSTER.MANUAL_ASSIGN`, `ROSTER.PUBLISH`, `ROSTER.REVISE`; depends on roster persistence. |
| Replacement requests | Operations not implemented. | Requires request/decision/assignment-change lineage. Do not overwrite original assignment. | Explicit time-bounded approval grants, recusal and scope checks; depends on assignments and authority grants. |
| Standby management | Operations not implemented. | Requires standby slots and activation history, distinct from Primary workload credit. | Roster/replacement permissions; depends on published assignments. |
| Shift notes and handovers | Operations not implemented. | Add immutable submitted report/item and supersession lineage. | Role/resource-scoped read/write; depends on published roster context. |
| Notifications | Append-only outbox/delivery persistence exists; delivery workflow/APIs are incomplete. | Preserve transactional outbox and restricted payloads. | Worker authorization/operational configuration; depends on account identity and feature events. |
| Audit history | Append-only audit persistence exists; history query API is incomplete. | No update/delete; source/actor/correlation retained. | `DUTY.REPORT.READ` and other approved visibility scopes; depends on feature event emission. |

## Sequencing

1. Complete real account lifecycle and server-side authority/scope resolution; retain fail-closed behavior until then.
2. Add API-level availability and holiday tests using authenticated account fixtures.
3. Implement roster-period/version/slot/assignment persistence, then draft/publish/revision workflow.
4. Implement replacement and standby lineage, followed by handover, notifications and audit/history queries.
