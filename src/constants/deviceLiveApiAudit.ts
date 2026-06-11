/** 実機ライブ API 監査 — SecureStore キーで NewsAPI / X / 6銘柄ニュース */

export const DEVICE_LIVE_API_AUDIT_LOG_TAG = '[DEVICE-LIVE-AUDIT]';

/** EXPO_PUBLIC_DEVICE_LIVE_API_AUDIT=1 で起動時に自動実行 */
export const DEVICE_LIVE_API_AUDIT_ENABLED =
  process.env.EXPO_PUBLIC_DEVICE_LIVE_API_AUDIT === '1';
