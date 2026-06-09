/**
 * 実 API 優先モード — mock_fallback 表示・劣化スキップを抑制し Metro に [REAL_API_MODE] を出す。
 */
export const REAL_API_MODE = true;

let loggedBoot = false;

export function shouldPreferRealApiOverDegraded(): boolean {
  return REAL_API_MODE;
}

/** 起動・hybrid・実運用テストなどのコンテキストで 1 行ログ */
export function logRealApiMode(context: string, extra?: Record<string, unknown>): void {
  if (!REAL_API_MODE) return;
  console.log('[REAL_API_MODE]', { context, ts: new Date().toISOString(), ...extra });
}

export function logRealApiModeOnBoot(): void {
  if (!REAL_API_MODE || loggedBoot) return;
  loggedBoot = true;
  logRealApiMode('app_boot', { preferRealApi: true });
}
