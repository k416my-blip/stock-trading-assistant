# ADB Runtime Diagnostics

Status: readonly adb diagnostics guide for `runtime-freeze-v1`

Scope: adb/logcat/memory diagnostics only. No runtime behavior or telemetry behavior changes are introduced.

## Basic Diagnostics

Device and package checks:

```powershell
adb devices
adb shell pm list packages | Select-String stocktrading
adb shell dumpsys package com.assistant.stocktrading
```

Startup diagnostics:

```powershell
adb logcat -c
adb shell am force-stop com.assistant.stocktrading
adb shell monkey -p com.assistant.stocktrading 1
adb logcat -d -v time > artifacts\adb-logcat-startup.txt
```

## Crash And Fatal Error Checks

Search logcat for:

- `FATAL EXCEPTION`
- `AndroidRuntime`
- `ANR`
- `ReactNativeJS`
- `JSApplicationIllegalArgumentException`
- `Hermes`
- `OutOfMemoryError`

Recommended command:

```powershell
adb logcat -d | Select-String "FATAL EXCEPTION|AndroidRuntime|ANR|ReactNativeJS|Hermes|OutOfMemoryError"
```

## Memory Diagnostics

Capture memory snapshots:

```powershell
adb shell dumpsys meminfo com.assistant.stocktrading > artifacts\meminfo-start.txt
```

After lifecycle loops:

```powershell
adb shell dumpsys meminfo com.assistant.stocktrading > artifacts\meminfo-after-lifecycle.txt
```

Review for:

- JS heap growth.
- Native heap growth.
- Graphics memory growth.
- Repeated process restarts.
- Unbounded memory accumulation across background/resume loops.

## Lifecycle Diagnostics

Suggested lifecycle loop:

```powershell
adb shell am force-stop com.assistant.stocktrading
adb shell monkey -p com.assistant.stocktrading 1
Start-Sleep -Seconds 30
adb shell input keyevent KEYCODE_HOME
Start-Sleep -Seconds 60
adb shell monkey -p com.assistant.stocktrading 1
adb logcat -d -v time > artifacts\adb-logcat-lifecycle.txt
```

## Network/Reconnect Diagnostics

Manual network toggle should be performed from device settings or quick settings.

After toggle:

```powershell
adb logcat -d | Select-String "network|offline|online|reconnect|retry|ReactNativeJS"
```

## ANR Risk Checks

Collect ANR traces if available:

```powershell
adb shell ls /data/anr
adb bugreport artifacts\bugreport.zip
```

Access may depend on device permissions and OS restrictions.

## Timer/Listener/Rerender Risk

Readonly checks:

- Watch for repeated identical `ReactNativeJS` logs.
- Compare memory snapshots before/after lifecycle loops.
- Watch for render/reconnect logs that repeat without user action.
- Do not add runtime instrumentation in this phase.

## Output Policy

Store local diagnostic artifacts under `artifacts/`, which is ignored by Git. Do not commit device logs if they may contain personal data or secrets.

## Diagnostics Result Update

Current adb diagnostics status:

- ADB executable verified through Android SDK platform-tools.
- ADB daemon starts successfully.
- No authorized Android device is currently connected.

Because no device is connected, these checks remain pending:

- adb logcat critical errors.
- JS fatal errors.
- Runtime crash count.
- ANR symptoms.
- Memory accumulation snapshots.
- Listener duplication evidence.
- Timer leakage evidence.
- React rerender storm evidence.

Current risk classification:

- Runtime crash count: not measured, no device artifact.
- ANR risk: not measured, no device artifact.
- Memory accumulation risk: not measured locally, still covered by existing readonly reports.
