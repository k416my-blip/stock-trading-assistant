# Android AAB Release Process

Status: production AAB/APK release process for `runtime-freeze-v1`

This process validates Android release generation without changing runtime semantics.

## Production AAB Readiness

Production profile:

```sh
eas build --platform android --profile production
```

Expected output:

- Android App Bundle (`.aab`)
- Store distribution artifact
- EAS-managed or configured signing certificate
- Auto-incremented `versionCode` after initial release setup

Current configuration evidence:

- `eas.json` production profile exists.
- `android.buildType` is `app-bundle`.
- `distribution` is `store`.
- `channel` is `production`.
- `appVersionSource` is `local`.

## APK Fallback Readiness

Preview/internal APK profile:

```sh
eas build --platform android --profile preview
```

Production-like APK profile:

```sh
eas build --platform android --profile apk
```

Expected usage:

- Device smoke testing.
- QA validation outside Play Store.
- Release candidate install checks.

## OTA Compatibility

Current OTA policy:

- `runtimeVersion.policy`: `appVersion`
- `updates.enabled`: `false`

This keeps production deployment deterministic until OTA rollout policy is explicitly enabled.

## Hermes Compatibility

Current runtime engine setting:

- `jsEngine`: `hermes`

Validation required on generated build:

- Confirm startup on Android production build.
- Confirm no Hermes-specific native module load error.
- Confirm source maps, if uploaded, match the generated Hermes bundle.

## Source Map Readiness

Release owner should decide one of:

- Upload production source maps to the chosen crash/observability backend.
- Retain source maps internally with restricted access.
- Disable public source map distribution.

No source map upload credentials are committed in this repository.

## Asset Bundling Integrity

Configured assets:

- `assets/icon.png`
- `assets/adaptive-icon.png`
- `assets/splash-icon.png`
- `assets/favicon.png`
- `assets/sounds/bell.wav`
- `assets/sounds/chime.wav`
- `assets/sounds/warning.wav`

These paths must remain present for production packaging.

## Pre-Build Verification

Run before EAS build:

```sh
npm run typecheck
npm run verify:critical
npm run verify:runtime-cross-layer
npm run verify:runtime-deployment-readiness
git diff --check
```

## Post-Build Verification

After generating AAB/APK:

- Install APK on a physical Android test device.
- Confirm cold start.
- Confirm notification permission flow on Android 13+.
- Confirm background/foreground resume.
- Confirm reconnect and offline recovery smoke path.
- Confirm no debug/development banner.
- Confirm package identity and version code in artifact metadata.
