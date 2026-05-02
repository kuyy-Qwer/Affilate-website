Phase 4 MVP - GDPR Cookie Consent (4.1)

Goal
- Implement GDPR cookie consent dialog and store consent state to ensure compliant UX.

Patch Summary
- Add GDPRCookieConsent component and render in main layout (App or DashboardHeader).
- Persist consent in localStorage; show once per user/session until consent is given.
- Optional: log consent to backend via API for audit (stubbed in MVP).

Testing
- Open app; ensure consent bar appears on first load; click Accept; bar disappears and state persists across reloads.
