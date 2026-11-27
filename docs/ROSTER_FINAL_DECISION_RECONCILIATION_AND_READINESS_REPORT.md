# Roster Final Decision Reconciliation and Readiness Report

| Field | Value |
|---|---|
| Version | 1.0 |
| Date | 27 November 2026 |
| Authority | Product Owner final reconciliation authorization dated 27 November 2026 |
| Scope | Specification and contract reconciliation only; no application implementation, migration, deployment, or runtime testing |

## A. Final verdict

**CONDITIONAL GO — ONLY EXPLICIT EXTERNAL SETUP DEPENDENCIES REMAIN.** The initial-release policy and specification baseline are finalized under the authorized reconciliation. Antigravity and Codex may begin implementation against the current documents. Integration and production use still require real organization data, accounts/grants, repository or controlled handoff, provider credentials, and environments. No runtime execution is claimed.

## B. Decisions finalized

The current rules and provenance are recorded in Decision Register v1.1 Part F as `FINALIZED_UNDER_RECONCILIATION_AUTHORITY` (not mislabeled as previously approved PO decisions):

- **FDR-01:** Effective published Primary assignment slot is the official workload credit; replacement transfers the credit. No duty-completion, actual-performer or post-holiday attendance workflow.
- **FDR-02:** Deterministic versioned global lexicographic fairness comparator, same-team preference only after fairness, recency and stable canonical hash tie-breaks.
- **FDR-03:** Three application roles only; replacement approval is explicit scoped/time-bounded permission, no self-grant, recusal for requester/assignee/candidate, separate delegation, pending escalation if no approver.
- **FDR-04–07:** Explicit per-holiday staffing/no defaults and pool bounds; immediate availability with published-assignment protection; zero baseline for history-free joiners; one active team per employee and one active TL per team, with eligible Admins/TLs schedulable.
- **FDR-08–10:** Informational immutable handover with linked addenda and no acknowledgment; reasoned immutable revisions even after closure with distinct revision initiator/publisher; stable holiday identity, date/staffing/cancellation history.
- **FDR-11–14:** Historical import and mutual swaps excluded; provider-neutral notifications/retry policy; secure invitation/password lifecycle; Flyway forward-only migration and recovery strategy.
- **FDR-15–18:** Controlled integration handoff and ownership; security defaults; operations/backup expectations; implementation baseline finalized while external setup and runtime evidence remain outstanding.

Product scope, technology stack, replacement approval, draft/published distinction, Standby vs Primary, and ticketing/exclusion boundaries were preserved.

## C. Six reported gaps

| Reported gap | Final classification | Outcome |
|---|---|---|
| Password management | **FULLY SUPPORTED** | Added invitation, activation, password change, reset request/reset, and account status operations with token, hashing, expiry, revocation and non-enumeration rules. Email credentials are external setup. |
| Manual assignment candidate discovery | **FULLY SUPPORTED** | Existing API-ROS-07/08 and OpenAPI operations provide eligible candidate lookup and assignment into an empty draft slot; writes revalidate. No client fairness score. |
| Duty completion | **EXCLUDED** | No completion, evidence, actual-performer or attendance endpoint/table/UI. Workload follows effective published assignment lineage. |
| Handover acknowledgement | **EXCLUDED** | Handover remains informational. Submitted reports are immutable; correction uses a linked addendum. No acknowledgment operation. |
| Approval-grant administration | **FULLY SUPPORTED** | Added list/create/revoke approval-grant operations; explicit scope/validity, no self-grant and participant recusal. |
| Closed-period revision | **FULLY SUPPORTED** | Added reasoned child-version creation; separate `ROSTER.REVISE` initiator and `ROSTER.PUBLISH` actor; prior version immutable. |

## D. Files changed and created

### Updated

| File | Version | Change |
|---|---:|---|
| `ROSTER_CONFIRMED_BUSINESS_DECISIONS.md` | 1.1 | Added provenance-labeled final decisions and supersession rules; remains authoritative. |
| `ROSTER_PROJECT_MASTER_MEMORY.md` | 1.8 | Updated cumulative current state, active policy, document versions, setup dependencies, and execution status. |
| `Roster_Corrected_Final_PRD_v5.md` | 5.4 | Finalized workload, fairness, availability, staffing, authority, revision, account and release-readiness rules. |
| `02_DOMAIN_AND_BUSINESS_RULES.md` | 2.3 | Aligned workload, fairness, staffing, availability, role/team, replacement, handover and revision rules. |
| `03_ROLES_PERMISSIONS_AND_WORKFLOWS.md` | 2.3 | Finalized scoped approval authority, recusal, account and workflow boundaries. |
| `04_SYSTEM_ARCHITECTURE.md` | 2.4 | Finalized allocation, migration, security, notification, revision and integration decisions; ADR statuses updated. |
| `DATABASE_DESIGN_READINESS_REVIEW_v2.md` | 3.1 | Superseded historical NO-GO with current conditional GO and setup-only dependencies. |
| `05_DATABASE_DESIGN_AND_DATA_DICTIONARY.md` | 1.4 | Removed duty-completion/actual-performer data; specified token, grant, linked handover addendum and revision persistence. |
| `06_BACKEND_TECHNICAL_SPECIFICATION.md` | 1.4 | Added authoritative implementation addendum for FDR-01..17 and aligned to API/database baseline. |
| `07_API_CONTRACT_AND_OPENAPI_SPECIFICATION.md` | 2.1 | Added account/password, scoped grant, availability update and roster revision contract operations; clarified exclusions and authorization. |
| `openapi.yaml` | 2.1.0 | Synchronized operations/schemas for account lifecycle, grant administration, availability update, and closed-period revision; added employee email and handover addendum linkage. |
| `08_FRONTEND_ARCHITECTURE_AND_UI_UX_SPECIFICATION.md` | 2.1 | Updated all 31 screen mappings and statuses; added new operations and removed completion/acknowledgment actions. |

**Exact API/OpenAPI v2.1 changes:** Added account invitation/activation/password/reset/status operations; approval-grant list/create/revoke operations; availability update and holiday-change history alignment; effective-dated grant schemas; recusal and authorization error behavior; seven duty-history dimensions; approved-only Standby activation semantics; and reasoned child-roster revision with distinct revision and publication actors. Updated shared schemas, examples, response/error behavior and database mappings. No duty-completion, actual-performer, handover-acknowledgment or mutual-swap API was added.

### Created

| File | Version | Purpose |
|---|---:|---|
| `09_IN_APP_ONBOARDING_AND_HELP_SPECIFICATION.md` | 1.0 | First-use account experience, role walkthroughs and Help Centre rules. |
| `10_TESTING_AND_QA_STRATEGY.md` | 1.0 | Layered test strategy and critical acceptance matrix; execution remains outstanding. |
| `11_SECURITY_DEPLOYMENT_AND_OPERATIONS.md` | 1.0 | Security, environment, notification, backup and operations baseline. |
| `12_IMPLEMENTATION_ROADMAP.md` | 1.0 | Ownership, controlled handoff, implementation order and release gates. |
| `13_INDEPENDENT_ARCHITECTURE_AND_REQUIREMENTS_AUDIT.md` | 1.0 | Desk audit and disposition of material cross-document findings. |
| `ROSTER_FINAL_DECISION_RECONCILIATION_AND_READINESS_REPORT.md` | 1.0 | This consolidated completion report. |

Database additions were limited to identified persistence gaps: hashed account action tokens for the finalized lifecycle, linked handover addenda for immutable corrections, and append-only `holiday_change_history` for stable identity/date/staffing/cancellation revisions. No unrelated database redesign was made, and no migration was executed.

### Intentionally unchanged

`ROSTER_PRE_DEVELOPMENT_READINESS_AND_CLOSURE_REPORT.md`, `ROSTER_DOCUMENT_RECONCILIATION_AUDIT.md`, `ROSTER-PO-DECISIONS-001`, source backups/manifests, and the documentation reset clipping remain historical/source artifacts. The current decision register and this v3.1 database-readiness review supersede earlier readiness conclusions. No new competing decision register was created.

## E. Consistency and validation

- **PRD/domain/workflow:** Final policy is aligned to published Primary assignment credits, deterministic FDR-02, three roles plus scoped approval capability, immediate availability, no completion, no handover acknowledgment, and two-person revisions.
- **Database/backend:** Current model supports effective assignment lineage, grants, hashed one-time account tokens, immutable version history and linked handover addenda. Historical NO-GO findings in the DB review are expressly superseded by v3.1. Older schema-proposal text is historical where it conflicts with v1.4/Part F.
- **API/OpenAPI:** New API operations and schemas were synchronized. OpenAPI 3.0.3 version 2.1.0 parsed successfully; duplicate YAML keys, duplicate/missing operation IDs, unresolved local `$ref` pointers, and screen mapping references were checked.
- **Frontend/API:** 31 screen/action rows map to defined operation IDs: **28 FULLY SUPPORTED, 2 PARTIALLY SUPPORTED, 1 NOT REQUIRED, 0 CONDITIONAL, 0 MISSING API, 0 EXCLUDED screens**. Partial rows are dashboard aggregate metrics (not an approved requirement) and availability impact preview (not required). AUTH-03 is a client safe-state page.
- **Security/QA:** Password/session/token, CSRF, scopes, recusal, concurrency, audit and outbox behaviors are specified. Document 10 provides test cases; none were executed.
- **Integration:** Document 07/OpenAPI v2.1 is the contract boundary; Antigravity owns frontend, Codex backend and final integration/API/E2E. Controlled bundle exchange is specified if shared repository is not provisioned.

### Executed checks

Command: `python3 - <<'PY' ...` using PyYAML 6.0.3 SafeLoader with duplicate-key detection and a recursive local-reference/operation-ID/screen-map check. **Exit code 0.** Results: YAML parse PASS; 45 paths / 59 operations; operation IDs unique; every local `$ref` resolves; all 31 screen rows present; no mapped operation IDs missing.

This was executable YAML/reference validation. No full OpenAPI conformance validator was installed (`openapi_spec_validator`, `prance`, and `jsonschema` unavailable), so schema conformance beyond successful parse and reference checks is a design review, not validator evidence. No application build, automated test suite, browser/E2E test, database migration or deployment was run.

## F. Remaining external dependencies

| External input | Provider | Why / impact | Blocks specification? |
|---|---|---|---|
| Repository provisioning or activation of controlled handoff bundles | Project owner/engineering | Needed for shared source integration; independent frontend/backend work can begin | No |
| Company timezone and real employee/team/holiday staffing data | Customer/Admin | Needed to configure real calendars and initial roster; no company data is invented | No |
| Named scoped approval grantees and separate publishers | Customer/Admin | Required before replacement/revision workflows are enabled for actual users | No |
| SMTP provider and credentials | Customer/IT | Required for invitations, resets and email notices; in-app notices remain defined | No |
| Hosting/network/TLS, secret store and environment URLs | Customer/IT | Required for deployment and secure runtime configuration | No |
| Named operational owner and customer RPO/RTO | Customer/IT | Required for production operation and recovery ownership | No |

These are provisioning/configuration tasks, not unresolved initial-release policy decisions.

## G. Implementation handoff

**Implementation can begin** against these documents, in this order: decision register Part F and PRD; Domain and Roles; Architecture; Database and Backend; API plus OpenAPI; Frontend; Documents 09–11 for onboarding/QA/operations; Document 12 for sequence; Document 13 for audit traceability. Antigravity implements the frontend using the approved Vanilla JS stack. Codex implements the Java/Spring Boot backend and owns contract integration and E2E verification. Do not infer runtime verification from these specifications.

## H. Final recommendation

**Proceed with implementation planning and independent component implementation now.** Provision external setup inputs before integrated E2E or production deployment. This is a specification-ready, not execution-verified, baseline.
