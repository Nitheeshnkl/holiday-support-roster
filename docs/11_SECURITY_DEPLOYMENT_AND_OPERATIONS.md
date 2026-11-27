# 11 — Security, Deployment, and Operations

| Field | Value |
|---|---|
| Document ID | ROSTER-OPS-011 |
| Version | 1.0 |
| Date | 27 November 2026 |
| Status | Finalized baseline; hosting/provider configuration external |
| Authority | Decision Register v1.1 FDR-12..17; Architecture and Backend specs |

## 1. Security baseline

- Spring Security username/email plus password; BCrypt cost 12; minimum 12 characters and maximum 72 UTF-8 bytes.
- Same-origin session cookie: HttpOnly, Secure in deployed environments, SameSite=Lax; rotate session ID at login; 30-minute idle and 12-hour absolute expiry; CSRF protection on every mutation.
- Generic authentication/reset responses; rate-limit by account and source; lock account for 15 minutes after 10 consecutive failed logins. Reset, deactivation, and role/permission changes revoke all active sessions.
- Invitation tokens expire after 24 hours; reset tokens after 30 minutes; random, single-use, hashed at rest, and excluded from logs.
- Enforce role, permission, resource scope, current state and recusal on the server. Keep three roles only; approval authority is a separate scoped grant.
- Jakarta Validation and allowlisted DTOs; parameterized persistence; output encoding/sanitization for help and handover; strict same-origin CORS; CSP, HSTS/TLS and standard security headers.
- Secrets are environment-injected or held in a secret manager; no secret in source, image, logs or browser storage. Minimize PII and restrict approval reasons, availability notes and handover content.
- Audit events are append-only to application roles, with narrowly controlled database operator access. Capture actor, time, action, target, reason, correlation ID and before/after references.

## 2. Environments and deployment

Maintain isolated development, test and production MySQL databases and credentials. The deployment artifact is immutable and environment-neutral; inject base URL, timezone, database, mail and secret configuration at runtime. Require TLS at the public/internal ingress and same-origin application/API hosting. No hosting vendor or production URL is selected.

Startup applies Flyway versioned migrations in order and fails on schema drift. Back up before each production migration. Migrations are forward-only; repair through a corrective migration. Application rollback is allowed only when the prior artifact is schema-compatible; otherwise roll forward.

## 3. Notifications and operational monitoring

Create transactional outbox intents after business commit. In-app is the durable user-facing channel. Email uses provider-neutral Spring Mail/SMTP configuration for invitation, reset, replacement requests/decisions, staffing gaps, and publication. Deduplicate by business event, recipient and channel. Retry at 1m, 5m, 30m, 2h and 12h; after five failures mark failed, retain intent, create an operations alert, and allow an authorized retry. Delivery failure never rolls back business state.

Log structured JSON with correlation IDs and no credentials/tokens. Expose liveness/readiness without sensitive details. Monitor application, DB, SMTP, outbox backlog, generation/publication failures, unresolved staffing gaps, authentication throttling and backup status.

## 4. Backup, restore, incident handling

Nightly encrypted database backup with 30-day retention; quarterly restore drill and evidence. Operations owner is designated by the customer. On suspected compromise, revoke affected sessions/grants, preserve audit/log evidence, rotate credentials, restore only from verified backup, and use corrective forward migrations. Recovery targets (RPO/RTO) must be set by the customer before production; they are not fabricated here.

## 5. External deployment inputs

Required before live deployment: hosting/network/TLS, secret store, SMTP provider credentials, organization timezone and initial users/teams/approver and publisher appointments, environment-specific base URL, named operations owner, and customer-approved RPO/RTO. These are deployment dependencies; they do not leave a product-policy decision open.
