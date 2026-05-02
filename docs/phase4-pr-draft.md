# Phase 4 All-in-One PR Draft

This document provides a structured PR body for the Phase 4 MVP rollout (4.x): GDPR Cookie Consent, Admin 2FA, Session Management, and Audit Logs.

## Summary
- Implement Phase 4 MVP scaffolding for security/compliance features:
  - GDPR Cookie Consent banner (UI/UX scaffold)
  - Admin 2FA scaffolding (UI placeholders, no backend in MVP)
  - Session Management UI scaffold
  - Audit Logs UI scaffold
- Include global rendering hooks (Phase 4 layout) to surface GDPR banner across dashboards.
- Provide documentation and acceptance tests skeletons for reviewer guidance.

## Modules and Acceptance Criteria
- GDPR Cookie Consent
  - Banner shows at first load until user accepts
  - Acceptance persists in localStorage
  - Banner dismisses after acceptance
- Admin 2FA
  - UI to enable/disable 2FA for admin
  - Input for backup/code and basic save action (no real backend integration in MVP)
- Session Management
  - Display list of active/admin sessions with device, IP, lastActive
- Audit Logs
  - Display recent audit events with user, action, timestamp

## Patches Included
- src/components/GDPRCookieConsent.tsx
- src/components/Admin2FA.tsx
- src/components/SessionManagement.tsx
- src/components/AuditLogsEnhanced.tsx
- docs/phase4-pr-draft.md (PR body template)

## Testing Plan (Manual)
- Open Dashboard: ensure GDPR banner appears on first load and disappears after Accept.
- Navigate to Admin area: confirm 2FA scaffold renders and Save button works (local mock).
- Open Sessions page: verify sessions list renders correctly.
- Open Audit Logs page: verify logs list renders.

## Rollout Plan
- Target staging environment first; perform QA against Phase 4 MVP scope.
- Collect reviewer feedback and update docs accordingly.

---
End of draft
