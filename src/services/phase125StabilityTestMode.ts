import {
  API_KEY_MISSING_SUPPRESSED_WARNING_CODE,
  isPhase125StabilityTestBuildEnabled,
} from '../constants/phase125StabilityTest';
import { TWELVE_HOUR_LOG_TAG } from '../constants/twelveHourTestMonitor';
import type { PriceSyncStabilityMeta } from '../types/marketData';

/** long-run / preview APK stability test 中は APIキー未設定 UI を出さない */
export function shouldSuppressApiKeyMissingUi(): boolean {
  return isPhase125StabilityTestBuildEnabled();
}

/** 通常利用: APIキー未設定時に Alert を出す。stability test: false */
export function shouldBlockPriceRefreshForMissingApiKey(hasApiKey: boolean): boolean {
  if (hasApiKey) return false;
  return !shouldSuppressApiKeyMissingUi();
}

export function buildApiKeyMissingStabilityMeta(
  priceRefreshStatus: 'NOT_CONFIGURED' | 'WARN' | 'OK' = 'NOT_CONFIGURED',
): PriceSyncStabilityMeta {
  return {
    apiKeyMissing: true,
    provider: 'twelveData',
    warningCode: API_KEY_MISSING_SUPPRESSED_WARNING_CODE,
    priceRefreshStatus,
    uiBlocked: false,
  };
}

export function logApiKeyMissingSuppressed(context: string, extra?: Record<string, unknown>): void {
  const payload = {
    apiKeyMissing: true,
    provider: 'twelveData',
    warningCode: API_KEY_MISSING_SUPPRESSED_WARNING_CODE,
    uiBlocked: false,
    context,
    ...extra,
  };
  console.warn(TWELVE_HOUR_LOG_TAG, 'api_key_missing_suppressed', payload);
}
