# Play Store Submission Guide

Status: `runtime-freeze-v1 maintained`

Scope: Play Console submission readiness only. This guide does not change runtime behavior, hydration, replay, orchestration, providers, reducers, recommendation logic, execution logic, AI reasoning, telemetry behavior, or state machines.

## Submission Artifact

Primary artifact:

- Android App Bundle generated from `eas build --platform android --profile production`.

Fallback/internal validation artifact:

- APK generated from `eas build --platform android --profile apk` or `eas build --platform android --profile preview`.

The production EAS profile uses `distribution: store`, `android.buildType: app-bundle`, and `autoIncrement: versionCode`.

## Package And Version Strategy

Current package identity:

- `com.assistant.stocktrading`

Current version values:

- `expo.version`: `1.0.0`
- `android.versionCode`: `1`

Release policy:

- Do not change package identity after Play Store publication.
- Let EAS production builds auto-increment `versionCode` after the first uploaded artifact.
- Increment `expo.version` for user-visible release lines.

## Play Console Checklist

Before submission:

- Upload the production AAB.
- Confirm package name and signing certificate in Play Console.
- Complete app name, short description, full description, category, contact, and screenshots.
- Complete content rating questionnaire.
- Complete target audience and ads declarations.
- Complete Data Safety form.
- Add privacy policy URL.
- Review notification permission rationale for Android 13+.

## Permission And Privacy Disclosure Candidates

Disclosure candidates:

- Notifications via `expo-notifications`.
- Network access for market data and AI services.
- Local secure storage for user preferences and API key handling.
- Runtime diagnostics and stability telemetry evidence if surfaced in production support flows.

## Android 13 Notification Readiness

The app config registers notification sounds through `expo-notifications`.

Submission notes:

- Prepare user-facing notification permission rationale.
- Confirm notification behavior on Android 13+ production builds.
- Keep placeholder sounds replaceable before public release.

## Submission Risks

Remaining non-runtime submission risks:

- Store listing metadata is not represented in repo files.
- Screenshots and feature graphics are not represented in repo files.
- Privacy policy URL and Data Safety answers must be completed in Play Console.
- Actual EAS cloud build and signing certificate verification must be performed by the release owner.
