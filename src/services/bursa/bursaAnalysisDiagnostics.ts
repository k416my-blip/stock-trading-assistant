/**
 * Bursa 解析エラー — Hermes ログ + ユーザー向けメッセージ
 */
export type BursaAnalysisScreenId =
  | 'AiNotifications'
  | 'MaterialAnalysis'
  | 'MarketMonitoring'
  | 'TodayTrading'
  | 'AssetManagement';

const SCREEN_LABEL_JA: Record<BursaAnalysisScreenId, string> = {
  AiNotifications: 'AI通知',
  MaterialAnalysis: '材料分析',
  MarketMonitoring: '市場監視',
  TodayTrading: '今日の売買',
  AssetManagement: 'AI資産運用',
};

const DEFAULT_MISSING_JA = 'Bursa データを取得できませんでした。設定から再取得するか、しばらく待ってください。';

export function isHermesUndefinedObjectError(message: string): boolean {
  return /cannot convert undefined value to object/i.test(message);
}

export function logBursaAnalysisError(
  screen: BursaAnalysisScreenId,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[BursaAnalysis:${screen}]`, msg, context ?? {}, stack ?? '');
  if (isHermesUndefinedObjectError(msg)) {
    console.warn(
      `[BursaAnalysis:${screen}] Hermes undefined-object — キャッシュ欠損フィールドの可能性`,
      context ?? {},
    );
  }
}

export function mapBursaAnalysisError(
  screen: BursaAnalysisScreenId,
  error: unknown,
  fallbackJa: string = DEFAULT_MISSING_JA,
): string {
  logBursaAnalysisError(screen, error);
  const msg = error instanceof Error ? error.message : String(error);
  if (isHermesUndefinedObjectError(msg)) {
    return `${SCREEN_LABEL_JA[screen]}: ${fallbackJa}`;
  }
  if (!msg || msg === '[object Object]') return fallbackJa;
  return msg;
}
