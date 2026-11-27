# 06_BACKEND_TECHNICAL_SPECIFICATION.md
## Holiday Support Roster Management System

| Field | Value |
|---|---|
| Document ID | ROSTER-BACKEND-006 |
| Version | 1.4 |
| Date | 2026-11-27 |
| Status | Finalized backend implementation specification under authorized reconciliation |
| Governing Decision Register | `ROSTER_CONFIRMED_BUSINESS_DECISIONS.md` v1.1 Part F |
| Governing Memory | `ROSTER_PROJECT_MASTER_MEMORY.md` v1.8 |
| Governing PRD | `Roster_Corrected_Final_PRD_v5.md` v5.4 |
| Domain Source | `02_DOMAIN_AND_BUSINESS_RULES.md` v2.3 |
| Roles Source | `03_ROLES_PERMISSIONS_AND_WORKFLOWS.md` v2.3 |
| Architecture Source | `04_SYSTEM_ARCHITECTURE.md` v2.4 |
| Database Source | `05_DATABASE_DESIGN_AND_DATA_DICTIONARY.md` v1.4 |
| Author | Senior Enterprise Software Architect |
| Implementation Authority | Granted by final reconciliation authorization; external setup dependencies remain |

> **Authority:** This finalized backend blueprint authorizes implementation against the approved baseline. It does not itself execute code generation, database migration or deployment. Historical open-decision passages are superseded by Decision Register v1.1 Part F; external setup dependencies remain tracked separately.

---

## 1. Document Control and Status

### 1.1 Purpose
Translate the confirmed business requirements, approved architecture, domain rules, role/permission model and database design into a detailed, implementation-oriented Java Spring Boot backend specification. This document describes what the backend must do, how it must be structured, what validations and transactions are required, and what unresolved decisions remain. It does not produce source code, SQL DDL or API contracts.

### 1.2 Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-27 | Initial backend specification; retains all confirmed business directions; explicitly documents blocking ODs as implementation dependencies |
| 1.1 | 2026-11-27 | Incorporated authoritative decision register and confirmed Replit backend workflow; made API client references framework-neutral pending ARC-01. |
| 1.2 | 2026-11-27 | Superseded Replit/ARC-01 workflow references; OpenAI Codex is the backend development tool and Document 07 is the shared integration contract. |
| 1.3 | 2026-11-27 | Finalized workload, allocation, authorization, account, notification, revision, migration and operations rules; aligned API contract v2.1. |
| 1.4 | 2026-11-27 | Updated source versions and added holiday change-history persistence and final domain/architecture invariants. |

### 1.3 Status Semantics
- **CONFIRMED** — explicitly approved; must be implemented.
- **APPROVED TECHNICAL DECISION** — technically sound; not contested by any source document.
- **IMPLEMENTATION DEPENDENCY** — cannot be finalised until a specific OD is resolved; design placeholder provided.
- **OPEN** — genuinely undecided; no implementation assumption made.

---

## 2. Purpose and Scope

The backend provides:
- Secure authentication and server-side authorisation for all three application roles and Manager approval capability.
- Domain logic for holiday planning, roster generation, manual assignment, publication, replacement, standby, duty tracking, handover, audit and notification.
- RESTful HTTP APIs consumed by the independently developed HTML5/CSS3/Vanilla-JS frontend. Same-origin delivery remains the existing baseline.
- Persistence of all business data via Spring Data JPA/Hibernate to a single MySQL database.
- Reliable notification delivery via transactional outbox and Spring Mail.
- Scheduled background processing for outbox dispatching, job monitoring and maintenance.

The backend does **not** produce JPA entity source, SQL migrations, frontend code or ticket management functionality. Document 07 is the shared client-facing API contract.

---

## 3. Source Documents and Traceability

| Requirement Area | Primary Source | Memory Section |
|---|---|---|
| Product scope and functional requirements | PRD v5 Sections 1–9 | Memory §3, §4 |
| Business rules and domain invariants | Domain v2 Sections 5–12 | Memory §5, §9 |
| Roles, permissions, workflows | Roles v2 Sections 1–13 | Memory §6 |
| Technology stack and architecture | Architecture v2 Sections 1–22 | Memory §7 |
| Database entities and relationships | DB Design v1 Sections 5–28 | Memory §8 |
| Open decisions and dependencies | All sources; Readiness Review v2 | Memory §13 |
| Authoritative confirmed decisions | Decision Register v1.0 | Memory §4 |

**Traceability policy:** Every service method or significant design decision in this document should be traceable to at least one PRD functional requirement or confirmed business rule. Where an open decision creates a design placeholder, the OD ID is stated.

---

## 4. Backend Architecture Overview

### 4.1 Architectural style
Single-deployable Spring Boot modular monolith. One JVM process, one MySQL database, one Maven multi-module or package-module build artefact. The same application serves the frontend at the same origin.

### 4.1.1 Development and integration contract
OpenAI Codex is the backend development tool. It implements the approved Java/Spring Boot, Maven, Spring Security, JPA/Hibernate and MySQL architecture without substituting a backend stack. Document 07 is the versioned HTTP contract shared with Antigravity's approved Vanilla-JS frontend.

Antigravity and Codex do not automatically share a workspace or execution environment. **Authorized ownership:** Codex owns final integration and end-to-end verification using the selected shared repository/handoff; Antigravity resolves frontend/UI integration defects. Before integration work begins, the project must select a shared repository or explicit handoff mechanism and configure the frontend's backend base URL per environment. No provider, repository URL or deployment platform is assumed.

### 4.2 Layered architecture within each module
## Final reconciliation addendum (v1.4; authoritative over historical draft text)

Implementation may begin against this finalized specification. Historical passages that label ODs open, describe actual completed-duty fairness, duty-completion events, unresolved role mapping, or approval/availability/revision policy are superseded by this addendum and Decision Register v1.1 Part F.

- Fairness input is effective published Primary slot credit; authorized replacement transfers the credit. No duty completion, actual performer, attendance evidence, or post-holiday workflow is implemented.
- Implement exact FDR-02 deterministic lexicographic comparator, policy version 1, over a frozen snapshot. Eligibility/availability feasibility precedes fairness; compare descending effective credits plus proposed Primary load; then same-team pairings; then recency vector with no-history as infinity; then canonical stable hash. Explain the comparison and exceptions.
- Replacement uses explicit scoped/time-bounded `REPLACEMENT.APPROVE`; Admin authority is never implicit. `ORG.AUTHORITY.MANAGE` grantors cannot self-grant; requester/assignee/candidate recusal is mandatory. No eligible approver means pending escalation without assignment change.
- Availability is effective immediately, cannot mutate published assignment, invalidates stale draft inputs, and is revalidated on generation/write/publication. Explicit Primary >=1 and Standby >=0 counts are required and bounded by active eligible pool.
- Accounts follow invitation/activation, login, change/reset, deactivation and role-change session revocation; tokens are hashed/single-use; password minimum 12 chars, max 72 UTF-8 bytes, BCrypt cost 12.
- Handover is immutable after submission; addendum links to prior report; no acknowledgment. Closed or open published periods use reasoned child roster version and distinct revise/publish actors. No previous version is overwritten.
- Migration tooling is Flyway with forward-only migrations; backup/corrective migration is recovery. Notifications use transactional outbox and provider-neutral email with defined retries.
- The API v2.1/OpenAPI operations define invite/password/grant/revision behavior, validation, authorization and errors. Database design v1.4 is the required persistence baseline. External configuration/appointments are in Documents 11–12.
