# HyperOS Power Restriction Audit

| Field | Value |
|-------|-------|
| runId | 20260616-062820 |
| device | FYRWXSNNAIOR9DCM |
| package | com.assistant.stocktrading |
| capturedAt | 2026-06-15T22:28:20.362Z |

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
         normal: -1d18h20m28s707ms (unlocked)
     light-idle: -1d15h18m7s961ms
    light-maint: -1d15h12m35s26ms
     light-idle: -1d15h12m29s926ms
    light-maint: -1d15h2m26s595ms
     light-idle: -1d15h2m20s531ms
         normal: -1d14h56m39s704ms (unlocked)
     light-idle: -1d14h25m40s780ms
         normal: -1d14h23m22s838ms (unlocked)
      deep-idle: -1d13h45m32s343ms
         normal: -1d12h53m5s162ms (unlocked)
      deep-idle: -1d12h39m4s875ms
         normal: -1d12h38m37s904ms (motion)
     light-idle: -1d12h32m1s230ms
         normal: -1d12h29m31s208ms (unlocked)
     light-idle: -1d11h23m43s13ms
    light-maint: -1d11h17m45s300ms
         normal: -1d11h17m39s568ms (unlocked)
     light-idle: -1d11h12m41s229ms
    light-maint: -1d11h7m40s174ms
     light-idle: -1d11h7m35s82ms
    light-maint: -1d10h57m31s107ms
     light-idle: -1d10h57m24s874ms
      deep-idle: -1d10h53m4s422ms
         normal: -1d10h52m11s479ms (motion)
     light-idle: -1d10h48m4s340ms
      deep-idle: -1d10h44m25s676ms
         normal: -1d10h27m3s505ms (motion)
     light-idle: -1d10h22m2s235ms
      deep-idle: -1d10h21m52s348ms
         normal: -1d10h21m31s640ms (motion)
      deep-idle: -1d10h18m36s313ms
         normal: -1d10h17m15s162ms (motion)
     light-idle: -1d10h12m21s180ms
    light-maint: -1d10h6m21s226ms
     light-idle: -1d10h6m16s154ms
      deep-idle: -1d10h1m0s612ms
         normal: -1d9h51m50s312ms (notification interaction)
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
  mNotifyLongScheduled=+30s268ms
  mNotifyLongDispatched=-29s756ms
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
  mLastWakeTime=317101742 (2759640 ms ago)
  mLastSleepTime=317122163 (2739219 ms ago)
  mLastSleepReason=timeout
  mLastGlobalWakeTimeRealtime=433034433 (in 113173051 ms)
  mLastGlobalSleepTimeRealtime=433054691 (in 113193309 ms)
  mLastInteractivePowerHintTime=317112162 (2749220 ms ago)
  mLastScreenBrightnessBoostTime=0 (319861382 ms ago)
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
