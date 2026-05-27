# Device Lifecycle Audit

Status: local device lifecycle audit plan for `runtime-freeze-v1`

Scope: device lifecycle validation only. No runtime behavior, hydration semantics, replay behavior, reducers, providers, orchestration, telemetry behavior, recommendation logic, execution logic, or AI reasoning is changed.

## Toolchain Status

Current local blocker:

- `adb` is not available.
- Java/JDK is not available.
- Android SDK command-line tools are not available.

Lifecycle testing below can begin after Android platform tools and Java are installed and `ANDROID_HOME` or `ANDROID_SDK_ROOT` is configured.

## Cold Boot Validation

Goal:

- Confirm app launches from a stopped state.
- Confirm splash and icon assets render.
- Confirm no development banner appears.
- Confirm Hermes runtime starts.

Suggested commands after APK is available:

```sh
adb install -r path/to/app.apk
adb shell am force-stop com.assistant.stocktrading
adb shell monkey -p com.assistant.stocktrading 1
adb logcat -d
```

## Warm Boot Validation

Goal:

- Confirm returning to app after recent use works without duplicate listeners, timer spikes, or render storms.

Suggested checks:

- Open app.
- Home button.
- Reopen from launcher.
- Repeat five times.
- Capture `adb logcat -d` and `adb shell dumpsys meminfo com.assistant.stocktrading`.

## Background Resume Validation

Goal:

- Confirm AppState transition and foreground recovery remain stable.

Manual steps:

- Launch app.
- Send to background for 1 minute.
- Resume app.
- Repeat after 5 minutes and 15 minutes.
- Watch for blank screen, delayed interaction readiness, or reconnect stall.

## Long Idle Recovery

Goal:

- Confirm long idle resume stability.

Manual steps:

- Launch app.
- Background for 30 minutes or longer.
- Resume.
- Confirm navigation, chat open, dashboard usable, and portfolio refresh visibility.

## Reconnect Behavior

Goal:

- Confirm network toggle recovery.

Suggested steps:

- Launch app on Wi-Fi.
- Disable network.
- Wait 30 seconds.
- Re-enable network.
- Confirm visible recovery and no repeated retry storm.

## Hydration Consistency

Goal:

- Confirm deferred UI surfaces become visible in expected order.

Manual checks:

- Open dashboard panels.
- Open chat and proactive suggestions.
- Navigate between screens.
- Confirm no hidden interaction blocking or visual hydration starvation.

## Android Vendor Risks

Vendor-specific risks to validate on Android 13+ and HyperOS/MIUI devices:

- Background activity restrictions.
- Battery optimization killing background work.
- Notification permission prompt behavior.
- Network reconnect after radio toggle.
- App restore after force kill.

## Pass Criteria

Lifecycle audit passes when:

- Cold boot succeeds.
- Warm boot succeeds repeatedly.
- Background resume succeeds after short and long idle.
- Reconnect recovery is visible and bounded.
- Hydration ordering remains consistent.
- No memory or listener accumulation is observed during repeated lifecycle transitions.

## Freeze Integrity

All lifecycle checks are external validation steps. They do not authorize runtime changes.
