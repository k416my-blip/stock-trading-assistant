# HyperOS Power Restriction Audit

| Field | Value |
|-------|-------|
| runId | 20260616-062822 |
| device | FYRWXSNNAIOR9DCM |
| package | com.assistant.stocktrading |
| capturedAt | 2026-06-15T22:28:22.204Z |

## deviceidle_whitelist

```
whitelisted=true
user,com.assistant.stocktrading,10396
```
## standby_bucket

```
10
```
## background_restricted

```
Command failed: adb -s FYRWXSNNAIOR9DCM shell cmd activity get-background-restriction-exemption com.assistant.stocktrading
```
## appops_run_any

```
RUN_ANY_IN_BACKGROUND: allow
```
## appops_wakelock

```
No operations.
Default mode: allow
```
## power_doze

```
Flags:
    com.android.server.deviceidle.use_cpu_time_for_temp_allowlist=true
    com.android.server.deviceidle.remove_idle_location=true

  Settings:
    flex_time_short=+1m0s0ms
    light_after_inactive_to=+4m0s0ms
    light_idle_to=+5m0s0ms
    light_idle_to_initial_flex=+1m0s0ms
    light_max_idle_to_flex=+15m0s0ms
    light_idle_factor=2.0
    light_idle_increase_linearly=true
    light_idle_linear_increase_factor_ms=300000
    light_idle_flex_linear_increase_factor_ms=60000
    light_max_idle_to=+30m0s0ms
    light_idle_maintenance_min_budget=+1m0s0ms
    light_idle_maintenance_max_budget=+5m0s0ms
    min_light_maintenance_time=+5s0ms
    min_deep_maintenance_time=+30s0ms
    inactive_to=+15s0ms
    sensing_to=+15s0ms
    locating_to=+5s0ms
    location_accuracy=20.0m
    motion_inactive_to=+30s0ms
    motion_inactive_to_flex=+1m0s0ms
    idle_after_inactive_to=+15s0ms
    idle_pending_to=+5m0s0ms
    max_idle_pending_to=+10m0s0ms
    idle_pending_factor=2.0
    quick_doze_delay_to=+1m0s0ms
    idle_to=+1h0m0s0ms
    max_idle_to=+6h0m0s0ms
    idle_factor=2.0
    min_time_to_alarm=+10m0s0ms
    max_temp_app_allowlist_duration_ms=+3m0s0ms
    mms_temp_app_allowlist_duration_ms=+1m0s0ms
    sms_temp_app_allowlist_duration_ms=+20s0ms
    notification_allowlist_duration_ms=+30s0ms
    wait_for_unlock=true
    use_window_alarms=true
    use_mode_manager=false
  Idling history:
         normal: -1d18h20m30s544ms (unlocked)
     light-idle: -1d15h18m9s798ms
    light-maint: -1d15h12m36s863ms
     light-idle: -1d15h12m31s763ms
    light-maint: -1d15h2m28s432ms
     light-idle: -1d15h2m22s368ms
         normal: -1d14h56m41s541ms (unlocked)
     light-idle: -1d14h25m42s617ms
         normal: -1d14h23m24s675ms (unlocked)
      deep-idle: -1d13h45m34s180ms
         normal: -1d12h53m6s999ms (unlocked)
      deep-idle: -1d12h39m6s712ms
         normal: -1d12h38m39s741ms (motion)
     light-idle: -1d12h32m3s67ms
         normal: -1d12h29m33s45ms (unlocked)
     light-idle: -1d11h23m44s850ms
    light-maint: -1d11h17m47s137ms
         normal: -1d11h17m41s405ms (unlocked)
     light-idle: -1d11h12m43s66ms
    light-maint: -1d11h7m42s11ms
     light-idle: -1d11h7m36s919ms
    light-maint: -1d10h57m32s944ms
     light-idle: -1d10h57m26s711ms
      deep-idle: -1d10h53m6s259ms
         normal: -1d10h52m13s316ms (motion)
     light-idle: -1d10h48m6s177ms
      deep-idle: -1d10h44m27s513ms
         normal: -1d10h27m5s342ms (motion)
     light-idle: -1d10h22m4s72ms
      deep-idle: -1d10h21m54s185ms
         normal: -1d10h21m33s477ms (motion)
      deep-idle: -1d10h18m38s150ms
         normal: -1d10h17m16s999ms (motion)
     light-idle: -1d10h12m23s17ms
    light-maint: -1d10h6m23s63ms
     light-idle: -1d10h6m17s991ms
      deep-idle: -1d10h1m2s449ms
         normal: -1d9h51m52s149ms (notification interaction)
```
## power_summary

```
POWER MANAGER (dumpsys power)

Power Manager State:
  Settings power_manager_constants:
    no_cached_wake_locks=true
  mDirty=0x0
  mWakefulness=Dozing
  mWakefulnessChanging=false
  mIsPowered=true
  mPlugType=2
  mBatteryLevel=100
  mDreamsBatteryLevelDrain=0
  mDockState=0
  mStayOn=false
  mProximityPositive=false
  mBootCompleted=true
  mSystemReady=true
  mEnhancedDischargeTimeElapsed=0
  mLastEnhancedDischargeTimeUpdatedElapsed=0
  mEnhancedDischargePredictionIsPersonalized=false
  mUseAutoSuspend=true
  mHalAutoSuspendModeEnabled=true
  mHalInteractiveModeEnabled=false
  mWakeLockSummary=0x41
  mNotifyLongScheduled=+28s447ms
  mNotifyLongDispatched=-31s576ms
  mNotifyLongNextCheck=(none)
  mRequestWaitForNegativeProximity=false
  mInterceptedPowerKeyForProximity=false
  mSandmanScheduled=false
  mBatteryLevelLow=false
  mLightDeviceIdleMode=false
  mDeviceIdleMode=false
  mDeviceIdleWhitelist=[1001, 2000, 6101, 6102, 10080, 10082, 10083, 10102, 10143, 10155, 10157, 10166, 10168, 10169, 10173, 10178, 10192, 10199, 10201, 10203, 10204, 10206, 10216, 10221, 10231, 10232, 10241, 10244, 10258, 10265, 10270, 10285, 10289, 10314, 10380, 10385, 10387, 10396, 10399]
  mDeviceIdleTempWhitelist=[1000, 10176]
  mLowPowerStandbyActive=false
  mLastWakeTime=317101742 (2761460 ms ago)
  mLastSleepTime=317122163 (2741039 ms ago)
  mLastSleepReason=timeout
  mLastGlobalWakeTimeRealtime=433034433 (in 113171230 ms)
  mLastGlobalSleepTimeRealtime=433054691 (in 113191488 ms)
  mLastInteractivePowerHintTime=317112162 (2751041 ms ago)
  mLastScreenBrightnessBoostTime=0 (319863203 ms ago)
  mScreenBrightnessBoostInProgress=false
  mHoldingWakeLockSuspendBlocker=true
  mHoldingDisplaySuspendBlocker=false
  mLastFlipTime=0
  mIsFaceDown=false

Settings and Configuration:
  mDecoupleHalAutoSuspendModeFromDisplayConfig=true
  mDecoupleHalInteractiveModeFromDisplayConfig=true
  mWakeUpWhenPluggedOrUnpluggedConfig=true
  mWakeUpWhenPluggedOrUnpluggedInTheaterModeConfig=false
  mTheaterModeEnabled=false
  mKeepDreamingWhenUnplugging=false
  mSuspendWhenScreenOffDueToProximityConfig=true
  mDreamsSupportedConfig=false
  mDreamsEnabledByDefaultConfig=true
  mDreamsActivatedOnSleepByDefaultConfig=false
  mDreamsActivatedOnDockByDefaultConfig=true
  mDreamsActivatedWhilePosturedByDefaultConfig=false
  mDreamsEnabledOnBatteryConfig=false
  mDreamsBatteryLevelMinimumWhenPoweredConfig=-1
  mDreamsBatteryLevelMinimumWhenNotPoweredConfig=15
  mDreamsBatteryLevelDrainCutoffConfig=5
  mDreamsEnabledSetting=false
  mDreamsActivateOnSleepSetting=false
  mDreamsActivateOnDockSetting=true
  mDreamsActivateWhilePosturedSetting=false
  mDozeAfterScreenOff=true
  mBrightWhenDozingConfig=false
  mMinimumScreenOffTimeoutConfig=6000
  mMaximumScreenDimDurationConfig=18000
  mMaximumScreenDimRatioConfig=0.29999995
  mAttentiveTimeoutConfig=-1
  mAttentiveTimeoutSetting=-1
  mAttentiveWarningDurationConfig=30000
  mScreenOffTimeoutSetting=600000
  mSleepTimeoutSetting=-1
```
## activity_services

```
ACTIVITY MANAGER SERVICES (dumpsys activity services)
  (nothing)
```
## proc_state

```

```
## battery_properties

```
Current Battery Service state:
  AC powered: false
  USB powered: true
  Wireless powered: false
  Dock powered: false
  Max charging current: 500000
 Time when the latest updated value of the Max charging current was sent via battery changed broadcast: +4d14h33m12s309ms
  Max charging voltage: 5000000
  Charge counter: 4260000
  status: 5
  health: 2
  present: true
  level: 100
  scale: 100
  voltage: 4302
 Time when the latest updated value of the voltage was sent via battery changed broadcast: +5d0h27m12s322ms
 The last voltage value sent via the battery changed broadcast: 4327
  temperature: 301
  technology: Li-poly
  Charging state: 0
  Charging policy: 0
  Capacity level: 5
MiuiBatteryService first usage time:
  mSetBatteryUsageTimeCount=0
  mNtpTime=-1
  mParseNtpTime=
```
## miui_powerkeeper

```
PROVIDER ContentProviderRecord{b7d61a9 u0 com.miui.powerkeeper/.provider.PowerKeeperConfigureProvider} pid=8961
    Client:
      nothing to dump
```
## Applied mitigations

- deviceidle whitelist +
- RUN_ANY_IN_BACKGROUND allow
