# Backend implementation progress

## Completed

- V1–V8 Flyway foundation, organization/team/Team Lead APIs, CSRF bootstrap, persisted-account login/logout/current-session, persisted role/permission and scope resolution, Holiday and Availability APIs.
- Disposable MySQL 9.7.1 validation previously passed for V1–V8; latest full test suite before authority-resolution wiring: 42 passed.

## Active implementation boundary

Account lifecycle is the next active slice. The contract requires hashed single-use invitation tokens (24h), hashed single-use reset tokens (30m), BCrypt-12 password validation (12–72 UTF-8 bytes), account status changes, session revocation, audit and no implicit authority grants.

## Next concrete tasks

1. Add V9 forward-only session/token lifecycle persistence and mapped account-action-token domain/repository.
2. Implement invitation, activation, password change/reset, account status and audit/outbox transactions for both V1/V2 contract paths.
3. Add authentication/session/CSRF/token-expiry/replay/deactivation integration tests using disposable MySQL.
4. Continue roster period/version/slot/assignment persistence and workflow implementation.
