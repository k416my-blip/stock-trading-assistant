# Production Deployment Setup

Status: `runtime-freeze-v1 maintained`

Scope: deployment infrastructure only.

This setup adds Android production deployment configuration and placeholder release assets. It does not change runtime behavior, hydration semantics, replay semantics, orchestration, telemetry, providers, reducers, state machines, recommendation logic, execution logic, AI reasoning, or trading logic.

## EAS Production Setup

Added `eas.json` with three Android-ready profiles:

- `production`: store distribution, `app-bundle`, production channel, `autoIncrement` on `versionCode`.
- `preview`: internal APK for release validation without version auto-increment.
- `apk`: internal production-like APK profile for device smoke testing.

Signing readiness is delegated to EAS managed credentials or an explicitly documented EAS credentials setup. No keystore or signing secret was added to the repository.

## Android Release Configuration

Updated `app.json` for production release readiness:

- `android.package` remains `com.assistant.stocktrading`.
- `android.versionCode` is set to `1`.
- `jsEngine` is set to `hermes`.
- `runtimeVersion.policy` is set to `appVersion`.
- `updates.enabled` is set to `false` until production OTA policy is intentionally enabled.
- Existing adaptive icon, splash, and notification configuration remains consistent with the generated placeholder assets.

## Asset Completion

Completed production-safe placeholder assets referenced by `app.json`:

- `assets/icon.png`
- `assets/adaptive-icon.png`
- `assets/splash-icon.png`
- `assets/favicon.png`
- `assets/sounds/bell.wav`
- `assets/sounds/chime.wav`
- `assets/sounds/warning.wav`

These placeholders are intentionally replaceable. They unblock production build packaging while preserving the asset paths expected by Expo and Android build tooling.

## Android Release Readiness

Readiness checks now covered:

- Hermes is explicitly configured.
- Android package identity is stable.
- Android `versionCode` exists and can be auto-incremented by the production EAS profile.
- Local native module compatibility remains a production build validation item.
- Background/foreground, reconnect, long-session, and low-memory readiness continue to come from the existing cross-layer gate.

## Security Hardening Audit

Security posture remains deployment-only:

- No signing credentials were committed.
- `.gitignore` excludes signing keys and environment files.
- OTA updates are disabled until a production OTA policy is intentionally enabled.
- No development endpoint or debug flag was added.
- No runtime telemetry behavior was changed.

## Build Pipeline Setup

Build pipeline readiness now includes:

- EAS production AAB profile.
- EAS preview APK profile.
- EAS production-like APK profile.
- Local app version source with production `versionCode` auto-increment.
- Placeholder app assets for Expo packaging.

## Remaining Deployment Notes

Safe follow-up items:

- Replace placeholder app artwork and notification sounds with final brand assets.
- Run a real EAS production build on the target account.
- Configure Play Store listing metadata and privacy disclosures outside runtime code.
- Decide whether production OTA updates should remain disabled or be enabled with a documented rollout policy.
