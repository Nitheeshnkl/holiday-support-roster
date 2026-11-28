# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary day-to-day users are roster operators: Administrators and Managers with the relevant explicit permissions. Team Leads and Employees are secondary audiences with role- and scope-appropriate workflows. Manager approval authority is a separate, explicitly granted capability—not an application role. Source: confirmed user direction and `docs/03_ROLES_PERMISSIONS_AND_WORKFLOWS.md`.

## Product Purpose

Roster is an internal Holiday Support Roster Management System for organizing holiday coverage, maintaining availability, generating and reviewing roster drafts, managing replacement requests, publishing immutable roster versions, and supporting scoped operational reporting. Success means authorized users can understand current coverage and complete their permitted work while preserving assignment, approval, and audit rules. Source: `README.md`, `docs/02_DOMAIN_AND_BUSINESS_RULES.md`, and `docs/08_FRONTEND_ARCHITECTURE_AND_UI_UX_SPECIFICATION.md`.

## Positioning

Holiday duty allocation is managed as a versioned operational workflow: eligibility and availability inform drafts, authorized people review them, and publication creates a distinct official version. Product authority does not permit the UI to invent fairness calculations or imply that planned assignments represent completed work.

## Operating Context

Users coordinate organization-wide or team-scoped holiday coverage. Administrators and authorized operators work across calendar setup, people and teams, roster generation/review/publication, replacement escalation, history, and audit. Team Leads coordinate only within assigned scope. Employees manage their own availability, assignments, requests, and notifications. All client operations use the existing Vanilla JavaScript API client and current OpenAPI contract.

## Capabilities and Constraints

Preserve the existing HTML5, CSS3, and Vanilla JavaScript ES Modules stack, routes, feature set, API client and contracts, authentication, role/permission/scope checks, validation, and business rules. This is a frontend UI/UX redesign only: no backend, schema, new API calls, integrations, fake persistence, or new business workflows. Navigation is permission-derived but never a substitute for server authorization. Onboarding/guide access must remain optional and user-initiated, not an automatic Overview interruption. Source: confirmed project brief and repository specifications.

## Brand Commitments

The product is named Roster. The confirmed direction is premium, modern, professional, clean, confident, minimal, organized, data-focused, and enterprise-ready, with a sophisticated neutral base, restrained blue/indigo accent, legible typography, subtle borders, controlled elevation, and strong whitespace. Linear, Stripe Dashboard, Vercel Dashboard, and Notion are craft references only; do not copy their interfaces.

## Evidence on Hand

Repository source, route implementations, tests, README, `docs/02_DOMAIN_AND_BUSINESS_RULES.md`, `docs/03_ROLES_PERMISSIONS_AND_WORKFLOWS.md`, `docs/07_API_CONTRACT_AND_OPENAPI_SPECIFICATION.md`, `docs/08_FRONTEND_ARCHITECTURE_AND_UI_UX_SPECIFICATION.md`, and `docs/openapi.yaml`. No customer proof or marketing claims are supplied; do not fabricate them.

## Product Principles

- Show users the next relevant action and why unavailable actions are gated.
- Preserve role, permission, scope, and resource boundaries throughout navigation and presentation.
- Distinguish draft, published, historical, Primary, and Standby data explicitly.
- Keep the browser client compatible with the existing backend contract.
- Make optional guidance available without interrupting operational work.
