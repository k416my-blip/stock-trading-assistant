# Android Release Pipeline

Status: deployment infrastructure for `runtime-freeze-v1`

This document describes the Android release pipeline prepared for production deployment. It is deployment infrastructure only and does not change runtime behavior.

## Release Profiles

`eas.json` defines:

- `production`: Android App Bundle for Play Store release.
- `preview`: internal APK for QA and release candidate validation.
- `apk`: production-channel APK for direct device smoke testing.

## Signing Readiness

Signing readiness is production-safe because no signing material is committed to the repository.

Before store upload:

- Configure EAS managed Android credentials or upload release credentials through EAS.
- Confirm keystore ownership and recovery process.
- Keep all keystores and service account files outside Git.
- Record build provenance for the release candidate.

## Build Commands

Recommended release commands:

```sh
eas build --platform android --profile preview
eas build --platform android --profile apk
eas build --platform android --profile production
eas submit --platform android --profile production
```

Run verification first:

```sh
npm run typecheck
npm run verify:critical
npm run verify:runtime-cross-layer
npm run verify:runtime-deployment-readiness
git diff --check
```

## OTA Safety

Current OTA safety policy:

- `runtimeVersion.policy` uses `appVersion`.
- `updates.enabled` is `false` for the current production setup.

This keeps production deployment deterministic until a formal OTA rollout policy is created.

## Asset Policy

The repository now contains production-safe placeholder assets for all paths referenced by `app.json`.

Before final public release, replace placeholders with final brand assets while preserving these paths unless app config is updated deliberately:

- `assets/icon.png`
- `assets/adaptive-icon.png`
- `assets/splash-icon.png`
- `assets/favicon.png`
- `assets/sounds/bell.wav`
- `assets/sounds/chime.wav`
- `assets/sounds/warning.wav`

## Play Store Release Checklist

Before submission:

- Confirm `android.package` remains `com.assistant.stocktrading`.
- Confirm `android.versionCode` increments beyond any previously uploaded artifact.
- Confirm signing credentials are controlled by the release owner.
- Upload AAB from the `production` profile.
- Prepare screenshots, descriptions, content rating, privacy policy, and Data Safety form.
- Review notification permission disclosure.
- Review market data, AI/network, diagnostics, and secure storage privacy disclosures.

## Runtime Freeze Confirmation

The release pipeline setup does not change runtime behavior, hydration semantics, replay semantics, orchestration, telemetry, providers, reducers, recommendation logic, execution logic, AI reasoning, or trading logic.
