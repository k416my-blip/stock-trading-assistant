# Runtime Deployment Readiness

Status: `runtime-freeze-v1 maintained`

Scope: readonly deployment audit only.

This document prepares the current release candidate for Android production deployment review. It does not change runtime behavior, provider behavior, reducer behavior, hydration semantics, replay semantics, orchestration, telemetry, AI reasoning, trading logic, recommendation logic, or execution logic.

## Android Production Readiness Audit

Checked areas:

- release build readiness
- Hermes readiness
- memory profile safety
- Android lifecycle readiness
- background/foreground stability
- reconnect stability
- bundle size risk
- startup latency risk

Current deployment blockers include missing EAS production build configuration and missing configured startup assets referenced by `app.json`.

## Expo/EAS Audit

Checked areas:

- app.json/app.config consistency
- eas.json readiness
- production profile integrity
- Android package identity
- versioning readiness
- OTA update safety

Current notes:

- `app.json` exists and defines name, slug, version, and Android package identity.
- `eas.json` is missing, so production profile and signing strategy are not yet deployment-ready.
- `android.versionCode` is missing and must be set before Play Store submission.
- OTA/runtimeVersion policy is not configured and should be decided before production OTA usage.

## Dependency Audit

Checked areas:

- duplicated packages
- abandoned packages
- native module risk
- Expo compatibility
- React Native compatibility
- production instability risk

Current notes:

- React, React Native, and Expo dependencies are present.
- A local native module dependency exists and must be validated in EAS production build.
- No live registry abandonment check was performed by this readonly local audit.

## Asset Audit

Checked areas:

- oversized assets
- duplicate assets
- startup asset blocking
- image optimization candidates
- font loading risk

Current blockers:

- `./assets/icon.png` is referenced but missing.
- `./assets/splash-icon.png` is referenced but missing.
- `./assets/adaptive-icon.png` is referenced but missing.
- `./assets/favicon.png` is referenced but missing.
- Notification sound files referenced in `app.json` are missing.

## Build Audit

Checked areas:

- production TypeScript integrity
- Metro config safety
- Babel config safety
- environment variable integrity
- dead code candidates
- source map strategy

Current notes:

- TypeScript verification is available through `npm run typecheck`.
- `babel.config.js` uses `babel-preset-expo`.
- Metro config is absent, so Expo default Metro behavior is assumed.
- No local `.env` files were found in this audit.
- Source map upload/retention strategy should be tied to EAS production configuration once `eas.json` exists.

## Security Audit

Checked areas:

- accidental secret exposure
- debug flags
- development endpoints
- unsafe logging
- verbose production telemetry
- exposed API configuration

Current notes:

- `.gitignore` excludes `.env`, signing keys, and credential files.
- `verify:critical` includes security verification.
- Extensive readonly diagnostics remain in the repository and should be reviewed for production privacy disclosure, not runtime removal.

## Store Readiness Audit

Checked areas:

- Android release checklist
- Play Store submission readiness
- permission review
- privacy disclosure candidates
- network usage declarations

Current notes:

- Play Store readiness is blocked until EAS config, versionCode, production signing, and required assets are ready.
- `expo-notifications` is configured, so notification permission disclosure should be prepared.
- Market data, AI/network services, notifications, and diagnostics should be reflected in privacy and network-use disclosures.

## Operational Deployment Readiness

Checked areas:

- cold start readiness
- long-session readiness
- reconnect readiness
- offline recovery readiness
- Android low-memory readiness

Current notes:

- Cross-layer production gate reports release readiness for runtime behavior and Android operational evidence.
- Cold start remains at risk until missing startup assets are supplied.

## Readonly Deployment Audit Only

This phase adds only readonly deployment audit tooling, readonly verify, and readonly docs. It does not implement auto-fix runtime behavior, deployment mutation, telemetry mutation, provider changes, reducer changes, recommendation changes, execution changes, or trading logic changes.
