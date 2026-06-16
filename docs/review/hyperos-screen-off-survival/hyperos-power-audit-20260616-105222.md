# HyperOS Power Restriction Audit

| Field | Value |
|-------|-------|
| runId | 20260616-105222 |
| device | FYRWXSNNAIOR9DCM |
| package | com.assistant.stocktrading |
| capturedAt | 2026-06-16T02:52:22.424Z |

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
WAKE_LOCK: allow; time=+19m37s887ms ago (running)
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
         normal: -1d22h44m30s826ms (unlocked)
     light-idle: -1d19h42m10s80ms
    light-maint: -1d19h36m37s145ms
     light-idle: -1d19h36m32s45ms
    light-maint: -1d19h26m28s714ms
     light-idle: -1d19h26m22s650ms
         normal: -1d19h20m41s823ms (unlocked)
     light-idle: -1d18h49m42s899ms
         normal: -1d18h47m24s957ms (unlocked)
      deep-idle: -1d18h9m34s462ms
         normal: -1d17h17m7s281ms (unlocked)
      deep-idle: -1d17h3m6s994ms
         normal: -1d17h2m40s23ms (motion)
     light-idle: -1d16h56m3s349ms
         normal: -1d16h53m33s327ms (unlocked)
     light-idle: -1d15h47m45s132ms
    light-maint: -1d15h41m47s419ms
         normal: -1d15h41m41s687ms (unlocked)
     light-idle: -1d15h36m43s348ms
    light-maint: -1d15h31m42s293ms
     light-idle: -1d15h31m37s201ms
    light-maint: -1d15h21m33s226ms
     light-idle: -1d15h21m26s993ms
      deep-idle: -1d15h17m6s541ms
         normal: -1d15h16m13s598ms (motion)
     light-idle: -1d15h12m6s459ms
      deep-idle: -1d15h8m27s795ms
         normal: -1d14h51m5s624ms (motion)
     light-idle: -1d14h46m4s354ms
      deep-idle: -1d14h45m54s467ms
         normal: -1d14h45m33s759ms (motion)
      deep-idle: -1d14h42m38s432ms
         normal: -1d14h41m17s281ms (motion)
     light-idle: -1d14h36m23s299ms
    light-maint: -1d14h30m23s345ms
     light-idle: -1d14h30m18s273ms
      deep-idle: -1d14h25m2s731ms
         normal: -1d14h15m52s431ms (notification interaction)
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
  mBatteryLevel=96
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
  mNotifyLongScheduled=+18s804ms
  mNotifyLongDispatched=-42s249ms
  mNotifyLongNextCheck=(none)
  mRequestWaitForNegativeProximity=false
  mInterceptedPowerKeyForProximity=false
  mSandmanScheduled=false
  mBatteryLevelLow=false
  mLightDeviceIdleMode=false
  mDeviceIdleMode=false
  mDeviceIdleWhitelist=[1001, 2000, 6101, 6102, 10080, 10082, 10083, 10102, 10143, 10155, 10157, 10166, 10168, 10169, 10173, 10178, 10192, 10199, 10201, 10203, 10204, 10206, 10216, 10221, 10231, 10232, 10241, 10244, 10258, 10265, 10270, 10285, 10289, 10314, 10380, 10385, 10387, 10396, 10399]
  mDeviceIdleTempWhitelist=[]
  mLowPowerStandbyActive=false
  mLastWakeTime=333340023 (2363487 ms ago)
  mLastSleepTime=334519790 (1183720 ms ago)
  mLastSleepReason=timeout
  mLastGlobalWakeTimeRealtime=449272586 (in 113569076 ms)
  mLastGlobalSleepTimeRealtime=450452374 (in 114748864 ms)
  mLastInteractivePowerHintTime=334520829 (1182681 ms ago)
  mLastScreenBrightnessBoostTime=0 (335703510 ms ago)
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
  User 0 active services:
  * ServiceRecord{6246a46 u0 com.assistant.stocktrading/expo.modules.stanativeruntime.LongRunForegroundService c:com.assistant.stocktrading}
    intent={cmp=com.assistant.stocktrading/expo.modules.stanativeruntime.LongRunForegroundService}
    packageName=com.assistant.stocktrading
    processName=com.assistant.stocktrading
    targetSdkVersion=36
    baseDir=/data/app/~~KPtdl1lnBWfCRnm5CiCxtQ==/com.assistant.stocktrading-ukp7LrIi_CyvSGBVfZh9Cg==/base.apk
    dataDir=/data/user/0/com.assistant.stocktrading
    app=ProcessRecord{dc61e2e 27511:com.assistant.stocktrading/u0a396}
    useNewWiuLogic_forCapabilities()=true
    useNewWiuLogic_forStart()=true
    useNewBfslLogic()=true
    mAllowWiu_noBinding=PROC_STATE_TOP
    mAllowWiu_inBindService=DENIED
    mAllowWiu_byBindings=DENIED
    getFgsAllowWiu_legacy=PROC_STATE_TOP
    getFgsAllowWiu_new=PROC_STATE_TOP
    getFgsAllowWiu_forStart=PROC_STATE_TOP
    getFgsAllowWiu_forCapabilities=PROC_STATE_TOP
    allowUiJobScheduling=true
    recentCallingPackage=com.assistant.stocktrading
    recentCallingUid=10396
    mAllowStart_noBinding=PROC_STATE_TOP
    mAllowStart_inBindService=DENIED
    mAllowStart_byBindings=DENIED
    getFgsAllowStart_legacy=PROC_STATE_TOP
    getFgsAllowStart_new=PROC_STATE_TOP
    getFgsAllowStart=PROC_STATE_TOP
    startForegroundCount=1
    infoAllowStartForeground=[callingPackage: com.assistant.stocktrading; callingUid: 10396; uidState: TOP ; uidBFSL: [BFSL]; intent: Intent { cmp=com.assistant.stocktrading/expo.modules.stanativeruntime.LongRunForegroundService }; code:PROC_STATE_TOP; tempAllowListReason:<,reasonCode:SYSTEM_ALLOW_LISTED,duration:9223372036854775807,callingUid:-1>; allowWiu:12; targetSdkVersion:36; callerTargetSdkVersion:36; startForegroundCount:1; bindFromPackage:null: isBindService:false]
    isForeground=true foregroundId=9001 types=0x00000001 foregroundNoti=Notification(channel=long_run_survival shortcut=null contentView=null vibrate=null sound=null defaults=0 flags=ONGOING_EVENT|NO_CLEAR|FOREGROUND_SERVICE color=0x00000000 category=service vis=PRIVATE focusType=null)
    createTime=-1h40m29s432ms startingBgTimeout=--
    lastActivity=-1h36m22s354ms restartTime=-1h40m29s422ms createdFromFg=true
    startRequested=true delayedStop=false stopIfKilled=false callStart=true lastStartId=2
 startCommandResult=1
```
## proc_state

```
  *APP* UID 10396 ProcessRecord{dc61e2e 27511:com.assistant.stocktrading/u0a396}
    class=com.assistant.stocktrading.MainApplication
    dir=/data/app/~~KPtdl1lnBWfCRnm5CiCxtQ==/com.assistant.stocktrading-ukp7LrIi_CyvSGBVfZh9Cg==/base.apk publicDir=/data/app/~~KPtdl1lnBWfCRnm5CiCxtQ==/com.assistant.stocktrading-ukp7LrIi_CyvSGBVfZh9Cg==/base.apk data=/data/user/0/com.assistant.stocktrading
    packageList={com.assistant.stocktrading}
      - ServiceRecord{6246a46 u0 com.assistant.stocktrading/expo.modules.stanativeruntime.LongRunForegroundService c:com.assistant.stocktrading}
        -> ContentProviderRecord{243f267 u0 com.assistant.stocktrading/androidx.startup.InitializationProvider}
        -> ContentProviderRecord{d73c814 u0 com.assistant.stocktrading/expo.modules.filesystem.FileSystemFileProvider}
        -> ContentProviderRecord{4ba78bd u0 com.assistant.stocktrading/com.google.firebase.provider.FirebaseInitProvider}
      - 21f0714/com.android.providers.settings/.SettingsProvider->27511:com.assistant.stocktrading/u0a396 s1/1 u0/0 +1h40m40s785ms
      - ActivityRecord{217642954 u0 com.assistant.stocktrading/.MainActivity t3541}
      - Task{870b622 #3541 type=standard A=10396:com.assistant.stocktrading}
    Proc # 0: prcp   F/A/FGS  ---NFUAT  t: 0 27511:com.assistant.stocktrading/u0a396 (fg-service)
      proc=ProcessRecord{dc61e2e 27511:com.assistant.stocktrading/u0a396}
    #94: prcp   FGS  ---NFUAT 27511:com.assistant.stocktrading/u0a396 act:activities|recents
    Proc # 0: prcp   F/A/FGS  ---NFUAT  t: 0 27511:com.assistant.stocktrading/u0a396 (fg-service)
    PID #27511: ProcessRecord{dc61e2e 27511:com.assistant.stocktrading/u0a396}
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
  Charge counter: 4019000
  status: 2
  health: 2
  present: true
  level: 96
  scale: 100
  voltage: 4284
 Time when the latest updated value of the voltage was sent via battery changed broadcast: +5d5h14m54s181ms
 The last voltage value sent via the battery changed broadcast: 4276
  temperature: 307
  technology: Li-poly
  Charging state: 0
  Charging policy: 0
  Capacity level: 4
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
