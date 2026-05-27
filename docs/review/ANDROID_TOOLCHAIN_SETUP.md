# Android Toolchain Setup

Status: local Android toolchain recovery for `runtime-freeze-v1`

Scope: Windows Android execution environment only. This setup does not change runtime logic, reducers, providers, orchestration, hydration, replay, telemetry behavior, recommendation logic, execution logic, AI reasoning, or runtime semantics.

## Initial Environment

Initial checks showed:

- Node: `v22.22.0`
- npm: `11.12.1`
- Expo CLI: `54.0.24`
- `java`: not found
- `javac`: not found
- `adb`: not found
- `sdkmanager`: not found
- `ANDROID_HOME`: unset
- `ANDROID_SDK_ROOT`: unset
- `JAVA_HOME`: unset
- Gradle: not found globally

## Toolchain Recovery Actions

Performed recovery actions:

- Installed Eclipse Temurin JDK 17 through winget.
- Installed Android SDK Platform-Tools through winget.
- Started installation of Android SDK command-line tools into the user SDK path:
  - `C:\Users\k416m\AppData\Local\Android\Sdk`
- Target command-line tools package:
  - `commandlinetools-win-14742923_latest.zip`

## Required Environment Variables

Expected local settings after SDK install completes:

```powershell
setx ANDROID_HOME "$env:USERPROFILE\AppData\Local\Android\Sdk"
setx ANDROID_SDK_ROOT "$env:USERPROFILE\AppData\Local\Android\Sdk"
```

Expected PATH entries:

```text
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\cmdline-tools\latest\bin
```

Java PATH should point to the installed JDK 17 `bin` directory or be available through winget/app execution aliases.

## Required SDK Packages

Minimum SDK packages for local Android execution:

```powershell
sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

The local native module currently declares:

- `compileSdkVersion`: 35
- `targetSdkVersion`: 35
- `minSdkVersion`: 24

## Validation Commands

After environment setup, run:

```powershell
java -version
javac -version
adb version
sdkmanager --version
adb devices
npx expo run:android
```

## Current Blocker Notes

If `adb devices` returns no device:

- Enable Developer Options on the Redmi device.
- Enable USB debugging.
- Reconnect USB cable.
- Accept the RSA authorization prompt on device.
- Re-run `adb kill-server` and `adb start-server`.

## Freeze Integrity

This toolchain setup is deployment/local execution infrastructure only. It does not authorize runtime code changes.

## Recovery Result Update

Final toolchain state after recovery:

- Java 17 installed and verified: `openjdk 17.0.19`.
- `javac` verified: `17.0.19`.
- Android SDK root created at `C:\Users\k416m\AppData\Local\Android\Sdk`.
- `sdkmanager` verified: `20.0`.
- SDK packages installed:
  - `platform-tools` `37.0.0`
  - `platforms;android-35`
  - `build-tools;35.0.0`
- User environment variables configured:
  - `JAVA_HOME`
  - `ANDROID_HOME`
  - `ANDROID_SDK_ROOT`
- User PATH updated for JDK and Android SDK tools.

ADB result:

- ADB starts successfully.
- No device is currently listed by `adb devices -l`.

Remaining local blocker:

- Connect and authorize the Redmi device with USB debugging enabled.
