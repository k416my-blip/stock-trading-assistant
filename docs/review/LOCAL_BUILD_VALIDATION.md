# Local Build Validation

Status: local Android build validation for `runtime-freeze-v1`

Scope: Expo local and Android local validation only. This document does not change runtime behavior or telemetry behavior.

## Local Toolchain Checks

Executed checks:

```sh
node --version
npm --version
npx expo --version
java -version
adb version
adb devices
sdkmanager --version
```

Results:

- Node is available: `v22.22.0`.
- npm is available: `11.12.1`.
- Expo CLI is available: `54.0.24`.
- Java is missing from PATH.
- adb is missing from PATH.
- sdkmanager is missing from PATH.
- `ANDROID_HOME` is unset.
- `ANDROID_SDK_ROOT` is unset.

## Expo Config Validation

Command:

```sh
npx expo config --type public
```

Result:

- Config resolved successfully.
- SDK version resolved as `54.0.0`.
- Hermes is configured.
- OTA updates are disabled.
- Runtime version policy is `appVersion`.
- Android package is `com.assistant.stocktrading`.
- Android versionCode is `2`.
- EAS project ID is present.

## Metro Bundle Validation

Command:

```sh
npx expo export --platform android --output-dir artifacts/local-android-export
```

Result:

- Android bundle generation succeeded.
- Hermes bytecode bundle generated.
- Bundle size: approximately `8.65 MB`.
- Export artifacts are in ignored `artifacts/local-android-export`.

## Expo Doctor Validation

Command:

```sh
npx expo-doctor
```

Result:

- 14/18 checks passed.
- 4 checks failed.

Detected risks:

- Metro config check warning.
- Missing `expo-font` peer dependency for `@expo/vector-icons`.
- Duplicate `expo-font` native module dependency in the installed dependency tree.
- `babel-preset-expo` version mismatch against Expo SDK expected version.

No dependency fixes were applied in this phase to avoid changing build/runtime dependency behavior without explicit approval.

## Local Build Capability

Current local capability:

- Expo config validation: ready.
- Metro Android export: ready.
- Android device install: blocked.
- Expo run Android: blocked.
- adb lifecycle validation: blocked.
- Gradle local build validation: blocked.

Required local setup before device validation:

- Install JDK compatible with Android/Expo builds.
- Install Android Studio or Android command-line tools.
- Install Android platform tools including `adb`.
- Configure `ANDROID_HOME` or `ANDROID_SDK_ROOT`.
- Confirm `adb devices` shows the target device.

## Verification Boundary

This local validation does not replace EAS production artifact validation. It confirms Metro/Hermes bundle integrity while cloud build quota is unavailable.
