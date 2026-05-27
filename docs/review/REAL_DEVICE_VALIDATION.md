# Real Device Validation

Status: Redmi / physical Android validation plan for `runtime-freeze-v1`

Scope: real-device execution and install validation only. Runtime behavior, reducers, providers, orchestration, hydration, replay, telemetry behavior, recommendation logic, execution logic, and AI reasoning remain unchanged.

## Device Detection

Required command:

```powershell
adb devices
```

Expected authorized output:

```text
List of devices attached
<device-id>    device
```

Blocked states:

- `unauthorized`: accept USB debugging prompt on device.
- no device listed: check cable, USB mode, driver, and Developer Options.
- `offline`: restart adb server and reconnect device.

## Redmi Note 13 Pro Checks

Manual device requirements:

- Developer Options enabled.
- USB debugging enabled.
- Device unlocked during first authorization.
- Battery optimization settings visible for app after install.
- HyperOS/MIUI background restrictions reviewed after install.

## Local Execution Path

Preferred path after SDK setup:

```powershell
npx expo run:android
```

Fallback path after an APK exists:

```powershell
adb install -r path\to\app.apk
adb shell monkey -p com.assistant.stocktrading 1
```

## Runtime Startup Checks

Confirm on device:

- Hermes runtime starts without fatal error.
- Splash screen displays.
- App icon/adaptive icon renders correctly.
- Notification sounds are packaged.
- OTA remains disabled for the production setup.
- No Expo Go dependency is required for production/native runtime checks.

## Lifecycle Checks

Manual validation sequence:

1. Cold boot from force-stopped state.
2. Warm boot from launcher.
3. Background app for 1 minute and resume.
4. Background app for 15 minutes and resume.
5. Toggle network offline/online and confirm visible reconnect recovery.
6. Force kill and relaunch.
7. Confirm no blank screen, crash, ANR, or persistent loading dead-zone.

## Pass Criteria

Real-device validation passes when:

- Device is detected as authorized by adb.
- App installs or launches through `expo run:android`.
- Hermes startup succeeds.
- Background resume works.
- Reconnect recovery works after network toggle.
- Notification permission flow is acceptable on Android 13+.
- No critical crash or ANR is observed in adb diagnostics.

## Current Status

This document should be updated with the actual device ID, install result, and logcat summary after adb and SDK setup are fully available.

## Execution Result Update

Current real-device execution status:

- ADB server starts successfully.
- `adb devices -l` returns no connected device.
- Redmi Note 13 Pro was not detected in this run.
- Device install was not attempted because no authorized device was available.
- `expo run:android` was not executed to avoid generating native project files before a target device is available.

Local bundle validation result:

- `npx expo export --platform android --output-dir artifacts/local-android-export` succeeded.
- Hermes Android bytecode bundle generated successfully.
- Bundle size: approximately `8.65 MB`.
- Asset bundling completed successfully.

Next required action:

- Connect Redmi device via USB, enable USB debugging, accept authorization prompt, then rerun `adb devices -l`.
