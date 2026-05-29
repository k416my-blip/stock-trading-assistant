/** 開発ログは明示 opt-in のみ（Metro / Cursor OOM 対策） */
function envFlag(name: string): boolean {
  const v =
    typeof process !== 'undefined' ? process.env[name] : undefined;
  return v === '1' || v === 'true';
}

export const VERBOSE_DEV_LOGS = envFlag('EXPO_PUBLIC_VERBOSE_DEV_LOGS');
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
