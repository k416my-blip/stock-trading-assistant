# Final Release Checklist

Status: final Android production release checklist for `runtime-freeze-v1`

This checklist is deployment-only and does not modify runtime semantics.

## Required Local Verification

Run:

```sh
npm run typecheck
npm run verify:critical
npm run verify:runtime-cross-layer
npm run verify:runtime-deployment-readiness
git diff --check
```

Required result:

- All commands pass.
- `git diff --check` has no whitespace errors.
- CRLF conversion warnings, if present, are treated as safe technical debt unless repository policy requires normalization.

## Required EAS Build Validation

Run with release-owner credentials:

```sh
eas build --platform android --profile preview
eas build --platform android --profile apk
eas build --platform android --profile production
```

Required result:

- Preview APK builds.
- Production-like APK builds.
- Production AAB builds.
- EAS credentials/signing are confirmed.

## Required Artifact Smoke Test

Install APK on a physical Android device and confirm:

- Cold start.
- Hermes startup.
- Splash/icon display.
- Android 13+ notification permission behavior.
- Background/foreground resume.
- Offline/online recovery smoke path.
- Reconnect smoke path.
- No debug/development banner.

## Required Play Console Preparation

Prepare:

- App listing name and descriptions.
- Screenshots and feature graphic.
- Privacy policy URL.
- Data Safety answers.
- Content rating.
- Target audience declaration.
- Release notes.
- Support contact.

## Required Signing Confirmation

Confirm:

- Package identity is `com.assistant.stocktrading`.
- `expo.version` is `1.0.0` for this release line.
- `android.versionCode` is valid and increments for subsequent uploads.
- EAS/Play signing certificate is correct.
- No signing secret is committed.

## Current Readiness Snapshot

Repository-side readiness:

- AAB profile exists.
- APK fallback profiles exist.
- Hermes is configured.
- OTA updates are disabled with appVersion runtime policy.
- App config assets are present.
- Security verify is part of critical verification.

Remaining external operational risks:

- Actual EAS cloud build must be run by the release owner.
- Play Console metadata and privacy forms are outside this repository.
- Signing credentials must be confirmed in EAS/Play Console.

## Final Freeze Confirmation

Runtime behavior, hydration, replay, orchestration, reducers, providers, recommendation logic, execution logic, AI reasoning, telemetry behavior, and state machines remain unchanged.
