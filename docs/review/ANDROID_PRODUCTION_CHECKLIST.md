# Android Production Checklist

Status: deployment checklist for `runtime-freeze-v1`

This checklist is readonly guidance for Android production release preparation.

## Release Build Readiness

Required before production deployment:

- Add `eas.json` with a production Android build profile.
- Confirm production build type, channel, and release profile.
- Confirm Hermes behavior in the generated Android production build.
- Run `npm run typecheck`, `npm run verify:critical`, `npm run verify:runtime-cross-layer`, and `npm run verify:runtime-deployment-readiness` before packaging.

## Signing And Integrity

Required before Play Store upload:

- Configure Android signing through EAS credentials or documented local signing.
- Keep keystores, service accounts, and credential JSON files out of Git.
- Confirm `.gitignore` continues to exclude `*.jks`, `*.p8`, `*.p12`, `*.pfx`, `credentials.json`, and `.env` files.
- Record build provenance for the release candidate.

## Expo/EAS Production Validation

Required checks:

- Create and review `eas.json` production profile.
- Set Android `versionCode` in app config.
- Keep Android package identity stable: `com.assistant.stocktrading`.
- Decide OTA update policy and configure `runtimeVersion` before enabling production OTA updates.
- Run an EAS production build and inspect final AAB/APK output.

## Asset Readiness

Required assets currently referenced by `app.json`:

- `./assets/icon.png`
- `./assets/splash-icon.png`
- `./assets/adaptive-icon.png`
- `./assets/favicon.png`
- `./assets/sounds/bell.wav`
- `./assets/sounds/chime.wav`
- `./assets/sounds/warning.wav`

Deployment blockers remain until required icon/splash/adaptive assets exist. Notification sounds can be removed from config or supplied before the production build, depending on the desired release behavior.

## Play Store Readiness

Required before submission:

- Confirm app name, package identity, version, and versionCode.
- Prepare Play Store listing, screenshots, feature graphic, short description, full description, and release notes.
- Complete content rating and target audience declarations.
- Prepare support contact and privacy policy URL.
- Confirm all permissions and SDK disclosures.

## Permission Review

Known permission disclosure candidates:

- Notifications via `expo-notifications`.
- Network access for market data and AI features.
- Secure local storage for keys/preferences.
- Runtime diagnostics and stability telemetry if included in production builds.

## Privacy Disclosure Candidates

Prepare disclosure for:

- Market data requests.
- AI/network requests and user-provided prompts/settings.
- Notification behavior.
- Local secure storage behavior.
- Diagnostics or crash/stability reporting behavior.

## Deployment Blockers

Current blockers from readonly audit:

- `eas.json` is missing.
- EAS production profile is unavailable.
- Android signing strategy is not documented in repo config.
- `android.versionCode` is missing.
- Required app icon/splash/adaptive image assets are missing.
- Play Store submission metadata is not present in repo evidence.

## Final Freeze Confirmation

This checklist does not authorize runtime expansion or behavior changes. Runtime behavior, hydration semantics, replay semantics, orchestration, AI reasoning, trading logic, recommendation logic, execution logic, providers, reducers, and state machines remain unchanged.
