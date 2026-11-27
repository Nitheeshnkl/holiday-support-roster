# 09 — In-App Onboarding and Help Specification

| Field | Value |
|---|---|
| Document ID | ROSTER-ONB-009 |
| Version | 1.0 |
| Date | 27 November 2026 |
| Status | Finalized under reconciliation authority |
| Authority | Decision Register v1.1; PRD v5.4; Documents 07 v2.1 and 08 v2.1 |

## 1. Purpose and scope

Provide role-matched first-use guidance and a searchable Help Centre for the existing roster workflows. This document does not add business capabilities. Walkthrough completion is informational and never grants permission or satisfies an approval.

## 2. Account first-use path

1. An authorized Admin creates an employee record and sends an invitation.
2. The account activation link contains a single-use token; only its hash is stored; it expires after 24 hours.
3. The user chooses a password satisfying 12 or more characters and at most 72 UTF-8 bytes. BCrypt cost 12 is used. No arbitrary composition rule is added.
4. The user signs in and sees a role-specific, dismissible walkthrough. Expired or consumed invitation tokens return a generic invalid-link message; an Admin can issue another invitation.
5. Authenticated users can change a password after verifying the current password, or request recovery. Reset links are single use and expire after 30 minutes. Responses do not disclose whether an account exists.

Email delivery depends on configured SMTP/provider credentials. The product behavior is specified; the provider is not presumed configured.

## 3. Walkthrough content and progress

| Audience | Walkthrough topics |
|---|---|
| Admin | Employees and teams; account invitations; holiday and explicit staffing setup; availability visibility; generate/review/publish; revision and audit; scoped approval-grant administration |
| Team Lead | Team roster context; availability coordination; replacement request/candidate visibility when explicitly authorized; handover information |
| Member | Sign-in/security; availability; published assignments; unavailability/replacement request; Standby designation; informational handover; notifications |

Walkthrough content is versioned and published through the existing Help/onboarding content model. Progress is per user and walkthrough version, can be resumed or skipped, and has no effect on access. Missing authored content produces a safe empty/help state; it does not block roster operations.

## 4. Help Centre rules

- Only published articles are visible; role visibility and server authorization are enforced.
- Admin authors may create/update articles through existing Help operations; edits create a new version.
- Render article and handover content as text or sanitized Markdown; never execute supplied HTML or scripts.
- Do not place credentials, production secrets, or personal data in help content.
- Accessibility: headings, keyboard operation, visible focus, descriptive link text, and screen-reader status announcements.

## 5. API and acceptance criteria

Use `getOnboardingProgress`, `updateOnboardingProgress`, `listHelpArticles`, `getHelpArticle`, `createHelpArticle`, and `updateHelpArticle`. Password operations use `activateAccount`, `changePassword`, `requestPasswordReset`, and `resetPassword`; see Document 07/OpenAPI v2.1. Verify role-filtering, versioned progress, token expiry/replay rejection, non-enumerating reset response, password bounds, and safe rendering in Document 10.
