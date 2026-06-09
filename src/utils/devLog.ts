/** 開発ログは明示 opt-in のみ（Metro / Cursor OOM 対策） */
function envFlag(name: string): boolean {
  const v =
    typeof process !== 'undefined' ? process.env[name] : undefined;
  return v === '1' || v === 'true';
}

export const VERBOSE_DEV_LOGS = envFlag('EXPO_PUBLIC_VERBOSE_DEV_LOGS');
/** [APP MEM] スナップショット — 既定 OFF。有効化: EXPO_PUBLIC_APP_MEM_LOGS=1 */
export const APP_MEM_LOGS = envFlag('EXPO_PUBLIC_APP_MEM_LOGS');
/** [ACTION_CENTER] 診断 — 既定 OFF。有効化: EXPO_PUBLIC_ACTION_CENTER_LOGS=1 */
export const ACTION_CENTER_LOGS = envFlag('EXPO_PUBLIC_ACTION_CENTER_LOGS');
export const RENDER_DIAG_FLAG = envFlag('EXPO_PUBLIC_RENDER_DIAG');
export const WDYR_ENABLED = envFlag('EXPO_PUBLIC_WDYR');

export function devLog(...args: unknown[]): void {
  if (!VERBOSE_DEV_LOGS) return;
  console.log(...args);
}

export function devWarn(...args: unknown[]): void {
  if (!VERBOSE_DEV_LOGS) return;
  console.warn(...args);
}
