/** Phase12.5 / 12h 長時間 stability test — APIキー警告UI抑制 */

import { TWELVE_HOUR_TEST_MONITOR_ENABLED } from './twelveHourTestMonitor';

export const API_KEY_MISSING_SUPPRESSED_WARNING_CODE = 'API_KEY_MISSING_SUPPRESSED_IN_TEST_MODE';

/** Preview APK / 12h monitor ビルド（EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1） */
export function isPhase125StabilityTestBuildEnabled(): boolean {
  return TWELVE_HOUR_TEST_MONITOR_ENABLED;
}
