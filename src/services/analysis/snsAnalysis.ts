import type { StockFundamentals } from '../../types';
import type { AnalysisApiKeys } from '../analysisApiKeys';
import type { SnsAnalysisResult } from '../../types/recommendation';
import {
  analyzeXSentimentOnUserRequest,
  loadCachedXSentimentForStock,
  snapshotToSnsResult,
} from '../xSentimentAnalysis';

const SNS_WARNING = 'SNSの話題性は短期的に大きく変わります。参考程度に留めてください。';

function hashSymbol(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildEstimated(stock: StockFundamentals): SnsAnalysisResult {
  const h = hashSymbol(stock.symbol + stock.market);
  const buzzScore = 30 + (h % 70);
  const positiveRatePct = 25 + (h % 50);
  const negativeRatePct = Math.max(5, 100 - positiveRatePct - (20 + (h % 25)));
  const score = Math.round(
    buzzScore * 0.35 + positiveRatePct * 0.45 + (100 - negativeRatePct) * 0.2,
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    buzzScore,
    positiveRatePct,
    negativeRatePct,
    summary: `話題性 ${buzzScore}/100 · ポジ ${positiveRatePct}% · ネガ ${negativeRatePct}%（推定）`,
    warning: SNS_WARNING,
    explanation: 'SNS評価：自動読込では推定のみ。Xセンチメントは「取得」ボタンで分析してください。',
    source: 'estimated',
  };
}

/** 同期 — 常に推定（X APIを呼ばない） */
export function analyzeSnsSync(stock: StockFundamentals): SnsAnalysisResult {
  return buildEstimated(stock);
}

/** 銘柄詳細の自動読み込み — X API 呼び出し禁止・キャッシュ表示のみ */
export async function analyzeSns(
  stock: StockFundamentals,
  _apiKeys: AnalysisApiKeys,
): Promise<SnsAnalysisResult> {
  const cached = await loadCachedXSentimentForStock(stock);
  if (cached) {
    return snapshotToSnsResult({ ...cached, fromCache: true });
  }
  return buildEstimated(stock);
}

/** コンシェルジュ等 — ユーザー質問時 */
export async function analyzeSnsOnUserQuestion(
  stock: StockFundamentals,
  apiKeys: AnalysisApiKeys,
): Promise<SnsAnalysisResult> {
  return analyzeXSentimentOnUserRequest(stock, apiKeys, { forceRefresh: false });
}
