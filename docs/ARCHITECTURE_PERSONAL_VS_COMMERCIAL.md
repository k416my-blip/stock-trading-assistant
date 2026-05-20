# Architecture: Personal Use Now, Commercial Later

## Current build (Personal Use)

This repository targets **private personal use** on a single device:

- Local-only storage (AsyncStorage + SecureStore)
- Mock/read-only AI Strategy Briefing on Home
- Manual and practice ledgers with execution safety gates
- No broker API, no order routing, no backend
- Kill switches, backup/export, health check, diagnostics

`APP_DEPLOYMENT_MODE` is fixed to `personal_use` in `src/constants/personalUse.ts`.

AI suggestions use safe labels only (`Suggested Buy`, `Suggested Reduce`, `Suggested Hold`, `Watch Closely`). They are **not** financial advice and **not** auto-executed.

## Future commercial version (not implemented)

A separate commercial distribution would require at minimum:

| Area | Requirement |
|------|-------------|
| Backend | User accounts, synced portfolio optional, rate-limited market data proxy |
| Auth | Sign-in, session refresh, device binding |
| Audit | Server-side execution / settings audit log (append-only) |
| Legal | Reviewed disclaimer, terms of use, privacy policy |
| Compliance | Jurisdiction-specific investment promotion rules |
| Ops | Remote crash reporting (e.g. Sentry), incident runbooks |
| QA | E2E tests on real devices, staged rollout |
| Product | No “personal use only” positioning; explicit non-advice + suitability flows |

Do **not** ship commercial features from this branch until the above are designed and reviewed.

## Code separation guidance

- Keep personal-only copy in `src/constants/personalUse.ts` and `src/constants/aiStrategyBriefing.ts`
- Keep commercial-boundary services behind interfaces before adding network calls
- Do not import `fs` / Node APIs into `src/services/` used by Expo runtime
- Verify scripts under `src/verify/` may use Node; app runtime may not

## What stays shared

Execution safety, portfolio integrity, market data queue, security storage, and diagnostics are valuable for both personal and future commercial builds. Extend them; do not bypass them for convenience.
