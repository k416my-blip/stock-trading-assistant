# Internal Testing Guide

Status: internal distribution guide for `runtime-freeze-v1`

Scope: Android internal testing only. This guide does not change runtime behavior, providers, reducers, orchestration, hydration, replay, telemetry behavior, recommendation logic, execution logic, or AI reasoning.

## Build Artifacts

Primary internal artifact:

```sh
eas build --platform android --profile apk
```

Secondary QA artifact:

```sh
eas build --platform android --profile preview
```

Store candidate artifact:

```sh
eas build --platform android --profile production
```

The APK profiles are intended for installation testing. The production profile is intended for Play Console AAB upload.

## Tester Installation Steps

1. Download the APK artifact from the EAS build page.
2. Install on Android 13+ physical device.
3. Confirm package identity is `com.assistant.stocktrading`.
4. Launch the app from a cold start.
5. Grant or deny notification permission and verify the app remains usable.
6. Move app to background and return to foreground.
7. Toggle network offline/online and confirm visible recovery.
8. Validate no development banner or Expo Go dependency appears in the production artifact.

## Smoke Test Checklist

Required internal tester checks:

- Cold start succeeds.
- Splash and icon display without missing asset errors.
- Hermes production runtime starts.
- Background/foreground resume works.
- Offline/online recovery smoke path works.
- Reconnect smoke path works.
- Notification permission prompt is acceptable on Android 13+.
- No secrets or debug endpoints are visible.

## Release Notes Template

Internal testing release: `1.0.0` / Android versionCode `2`

Changes under test:

- Production Android build infrastructure.
- EAS production AAB profile.
- Internal APK fallback profile.
- Placeholder production assets and notification sounds.
- Runtime remains frozen under `runtime-freeze-v1`.

Known limitations:

- Current real cloud build attempt was blocked by EAS Android build quota before artifact generation.
- Play Console metadata and Data Safety forms remain external release-owner tasks.

## Feedback Template

Collect from testers:

- Device model and Android version.
- Install source and artifact profile.
- Startup success/failure.
- Notification permission behavior.
- Background resume behavior.
- Offline/reconnect behavior.
- Screenshots for any asset or layout issue.
