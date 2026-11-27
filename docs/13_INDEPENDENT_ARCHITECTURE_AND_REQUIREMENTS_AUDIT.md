# 13 — Independent Architecture and Requirements Audit

| Field | Value |
|---|---|
| Document ID | ROSTER-AUDIT-013 |
| Version | 1.0 |
| Date | 27 November 2026 |
| Status | Desk audit of specification baseline; no independent human reviewer or running system implied |
| Scope | PRD, Domain, Roles, Architecture, DB, Backend, API/OpenAPI, Frontend, onboarding, QA and operations |

## 1. Findings and disposition

| Topic | Finding | Disposition |
|---|---|---|
| Fairness basis | Earlier specs described completed duties and actual performer attribution | Superseded by FDR-01: effective published Primary assignment history only |
| Allocation | Earlier fairness order and tie-break were incomplete | FDR-02 defines deterministic lexicographic policy v1; test oracle required |
| Authority | Three-role model had no safe Manager mapping | FDR-03 defines explicit scoped, time-bounded grants, recusal and separation of duties |
| Staffing/availability/team | Several lifecycle rules remained open | FDR-04..07 define explicit counts, effective availability, zero baseline and cardinality |
| Handover | Acknowledgement/retention scope ambiguous | FDR-08 informational immutable reports/addenda; acknowledgement excluded |
| Revision/holiday identity | Closed period and date changes undefined | FDR-09/10 append-only child version; reason and separate publisher |
| Import/notification/account | Initial release details incomplete | FDR-11..13 exclude historical import and define notification/account behavior |
| Migration/security/operations | Tooling and minimum operations undefined | FDR-14..17 establish Flyway, security, backups and external setup boundaries |
| API gaps | Account/password, grant administration and revision operations absent | Added operations to API/OpenAPI v2.1; no duty completion or acknowledgment operation |
| Frontend map | Screen map had conditional entries tied to now-finalized decisions | Updated Document 08; remaining conditional items are genuine setup/action constraints |

## 2. Scope and architecture audit

The system remains an internal holiday support roster manager. Ticket operations remain with the existing ticketing platform. Comp-Off, leave, attendance, payroll, ticketing, mutual swaps, duty completion and handover acknowledgment are excluded. Stack remains HTML/CSS/Vanilla JS ES modules, Java/Spring Boot/Spring Security/JPA/Hibernate/Jakarta Validation, MySQL, Maven, modular monolith.

Risk controls include explicit staffing, effective-dated team/role/grant history, transaction-time revalidation, optimistic concurrency, idempotency, append-only published versions, one credit per effective slot, two-person revision/publish, transactional notification outbox, and scoped server-side authorization.

## 3. Readiness conclusion

Specification baseline is ready for implementation under the authorized reconciliation. It is not execution-verified. External setup remains: shared repository or controlled handoff activation, organization timezone and initial data/appointments, SMTP credentials, hosting/TLS/secrets, environment URLs, named operations owner and customer-set RPO/RTO. No application code, migration, deployment or runtime test was performed in this audit.
