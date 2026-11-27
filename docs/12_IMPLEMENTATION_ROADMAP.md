# 12 — Implementation Roadmap

| Field | Value |
|---|---|
| Document ID | ROSTER-ROADMAP-012 |
| Version | 1.0 |
| Date | 27 November 2026 |
| Status | Ready to sequence implementation against finalized specifications |
| Authority | Decision Register v1.1; Documents 02–11 current versions |

## 1. Handoff and ownership

Document 07 and `openapi.yaml` are the shared integration boundary. Antigravity owns HTML/CSS/Vanilla-JS ES-module frontend work. Codex owns Java/Spring Boot backend work and final source integration, API integration and E2E verification. Route defects to the owning layer; any contract change updates Document 07 and OpenAPI together. Until a shared repository is provisioned, exchange controlled bundles with source snapshot, changed-file manifest, commit/hash where available and contract version.

## 2. Sequence

1. **Provision project inputs:** repository or controlled bundle exchange; dev/test/prod configuration; timezone; initial employees, teams, role assignments, explicit approval grants and publishers; mail and secret configuration. Never commit secrets or fictional organization data.
2. **Backend foundation:** Maven/Spring Boot modular monolith, Spring Security/session/CSRF, Jakarta Validation, MySQL, Flyway, audit, idempotency and outbox. No destructive migration execution outside an isolated environment.
3. **Core domain/data:** employee/team history, holiday identity and explicit staffing, availability, roster versions/slots/assignments, generation snapshots, replacement grants/decisions, notifications, handover and audit.
4. **Scheduling/revision:** implement FDR-02 exact comparator and explanations, draft generation, manual candidate/assignment flow, publish, two-person reasoned revisions and closed-period updates.
5. **Account and operational flows:** invitation/password lifecycle, scoped approval-grant administration, replacement decision, notifications, onboarding/help and reports.
6. **Frontend:** implement the 31 screens from Document 08 against API v2.1; no client-side policy decisions; accessible responsive states.
7. **Integration and release readiness:** contract tests, QA strategy in Document 10, security review, migrations in isolated environments, backup/restore drill, deployment/runbook and E2E evidence.

## 3. Exit criteria

No manual spreadsheet of production assignments is loaded as historical fairness data. No deployment proceeds without named authority grants, publisher separation, TLS/secrets/mail configuration, backup evidence and an operations owner. Document the executed build/test commands and outcomes; this roadmap is not evidence of execution.
