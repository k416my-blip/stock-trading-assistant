/**
 * HyperOS / MIUI screen-off survival — partial wake lock + foreground service.
 * Screen keep-awake via expo-keep-awake is opt-in only (default off).
 */
import { Platform, NativeModules, PermissionsAndroid } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { TWELVE_HOUR_LOG_TAG } from '../constants/twelveHourTestMonitor';

const KEEP_AWAKE_TAG = 'sta-twelve-hour-monitor';
const SURVIVAL_HEALTH_MS = 3 * 60 * 1000;

export type LongRunSurvivalStatus = {
  wakeLockHeld: boolean;
  foregroundServiceRunning: boolean;
};

type NativeSurvivalModule = {
  acquirePartialWakeLock?: (tag: string) => Promise<void>;
  releasePartialWakeLock?: () => Promise<void>;
  startLongRunForegroundService?: (title?: string, body?: string) => Promise<void>;
  stopLongRunForegroundService?: () => Promise<void>;
  getSurvivalStatus?: () => Promise<LongRunSurvivalStatus>;
};

function getNativeSta(): NativeSurvivalModule | undefined {
  if (Platform.OS !== 'android') return undefined;
  try {
    return requireNativeModule<NativeSurvivalModule>('StaNativeRuntime');
  } catch {
    return NativeModules.StaNativeRuntime as NativeSurvivalModule | undefined;
  }
}

let enabled = false;
let screenAwakeMode = false;
let notificationTitle = '12時間監視';
let notificationBody = 'バックグラウンド稼働中';
let healthTimer: ReturnType<typeof setInterval> | null = null;

export function isLongRunSurvivalEnabled(): boolean {
  return enabled;
}

export async function getLongRunSurvivalStatus(): Promise<LongRunSurvivalStatus> {
  const native = getNativeSta();
  if (!native?.getSurvivalStatus) {
    return { wakeLockHeld: false, foregroundServiceRunning: false };
  }
  try {
    return await native.getSurvivalStatus();
  } catch {
    return { wakeLockHeld: false, foregroundServiceRunning: false };
  }
}

async function ensureNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (Platform.Version >= 33) {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (!granted) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
  }
}

async function applySurvivalStack(): Promise<LongRunSurvivalStatus> {
  await ensureNotificationPermission();
  const native = getNativeSta();
  await native?.acquirePartialWakeLock?.('sta-long-run');
  await native?.startLongRunForegroundService?.(notificationTitle, notificationBody);
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (screenAwakeMode) {
    await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
  }
  return getLongRunSurvivalStatus();
}

async function repairSurvivalIfNeeded(): Promise<void> {
  if (!enabled) return;
  const before = await getLongRunSurvivalStatus();
  if (before.wakeLockHeld && before.foregroundServiceRunning) {
    console.log(TWELVE_HOUR_LOG_TAG, 'survival_health_ok', before);
    return;
  }
  console.warn(TWELVE_HOUR_LOG_TAG, 'survival_health_degraded', before);
  try {
    const after = await applySurvivalStack();
    console.log(TWELVE_HOUR_LOG_TAG, 'survival_repaired', { before, after });
    console.log(TWELVE_HOUR_LOG_TAG, 'survival_status', after);
  } catch (err) {
    console.warn(TWELVE_HOUR_LOG_TAG, 'survival_repair_failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

function startSurvivalHealthWatch(): void {
  if (healthTimer) return;
  healthTimer = setInterval(() => {
    void repairSurvivalIfNeeded();
  }, SURVIVAL_HEALTH_MS);
}

function stopSurvivalHealthWatch(): void {
  if (!healthTimer) return;
  clearInterval(healthTimer);
  healthTimer = null;
}

export async function enableLongRunSurvival(options?: {
  screenAwake?: boolean;
  notificationTitle?: string;
  notificationBody?: string;
}): Promise<void> {
  if (Platform.OS !== 'android') return;

  enabled = true;
  screenAwakeMode = options?.screenAwake ?? false;
  notificationTitle = options?.notificationTitle ?? notificationTitle;
  notificationBody = options?.notificationBody ?? notificationBody;

  try {
    const status = await applySurvivalStack();
    console.log(TWELVE_HOUR_LOG_TAG, 'survival_enabled', {
      screenAwake: screenAwakeMode,
      wakeLockHeld: status.wakeLockHeld,
      foregroundServiceRunning: status.foregroundServiceRunning,
    });
    console.log(TWELVE_HOUR_LOG_TAG, 'survival_status', status);
    startSurvivalHealthWatch();
  } catch (err) {
    console.warn(TWELVE_HOUR_LOG_TAG, 'survival_enable_failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function disableLongRunSurvival(): Promise<void> {
  if (!enabled) return;
  enabled = false;
  stopSurvivalHealthWatch();

  if (screenAwakeMode) {
    try {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    } catch {
      /* optional */
    }
    screenAwakeMode = false;
  }

  try {
    const native = getNativeSta();
    await native?.stopLongRunForegroundService?.();
    await native?.releasePartialWakeLock?.();
  } catch {
    /* optional */
  }

  const status = await getLongRunSurvivalStatus();
  console.log(TWELVE_HOUR_LOG_TAG, 'survival_disabled', status);
}

/** @internal test-only */
export function resetLongRunSurvivalForTest(): void {
  stopSurvivalHealthWatch();
  enabled = false;
  screenAwakeMode = false;
}
