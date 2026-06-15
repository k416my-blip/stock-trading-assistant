/**
 * HyperOS / MIUI screen-off survival — partial wake lock + foreground service.
 * Screen keep-awake via expo-keep-awake is opt-in only (default off).
 */
import { Platform, NativeModules } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { TWELVE_HOUR_LOG_TAG } from '../constants/twelveHourTestMonitor';

const KEEP_AWAKE_TAG = 'sta-twelve-hour-monitor';

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

const NativeSta: NativeSurvivalModule | undefined =
  Platform.OS === 'android'
    ? (NativeModules.StaNativeRuntime as NativeSurvivalModule | undefined)
    : undefined;

let enabled = false;
let screenAwakeMode = false;

export function isLongRunSurvivalEnabled(): boolean {
  return enabled;
}

export async function getLongRunSurvivalStatus(): Promise<LongRunSurvivalStatus> {
  if (!NativeSta?.getSurvivalStatus) {
    return { wakeLockHeld: false, foregroundServiceRunning: false };
  }
  try {
    return await NativeSta.getSurvivalStatus();
  } catch {
    return { wakeLockHeld: false, foregroundServiceRunning: false };
  }
}

export async function enableLongRunSurvival(options?: {
  screenAwake?: boolean;
  notificationTitle?: string;
  notificationBody?: string;
}): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (enabled) return;

  enabled = true;
  screenAwakeMode = options?.screenAwake ?? false;

  try {
    await NativeSta?.acquirePartialWakeLock?.('sta-long-run');
    await NativeSta?.startLongRunForegroundService?.(
      options?.notificationTitle ?? '12時間監視',
      options?.notificationBody ?? 'バックグラウンド稼働中',
    );
    if (screenAwakeMode) {
      await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    }
  } catch (err) {
    console.warn(TWELVE_HOUR_LOG_TAG, 'survival_enable_failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  const status = await getLongRunSurvivalStatus();
  console.log(TWELVE_HOUR_LOG_TAG, 'survival_enabled', {
    screenAwake: screenAwakeMode,
    wakeLockHeld: status.wakeLockHeld,
    foregroundServiceRunning: status.foregroundServiceRunning,
  });
  console.log(TWELVE_HOUR_LOG_TAG, 'survival_status', status);
}

export async function disableLongRunSurvival(): Promise<void> {
  if (!enabled) return;
  enabled = false;

  if (screenAwakeMode) {
    try {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    } catch {
      /* optional */
    }
    screenAwakeMode = false;
  }

  try {
    await NativeSta?.stopLongRunForegroundService?.();
    await NativeSta?.releasePartialWakeLock?.();
  } catch {
    /* optional */
  }

  const status = await getLongRunSurvivalStatus();
  console.log(TWELVE_HOUR_LOG_TAG, 'survival_disabled', status);
}
