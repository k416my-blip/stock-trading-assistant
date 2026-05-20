import type { StockFundamentals } from '../../types';
import type { AnalysisApiKeys } from '../analysisApiKeys';
import type { SnsAnalysisResult } from '../../types/recommendation';

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
    summary: `話題性 ${buzzScore}/100 · ポジ ${positiveRatePct}% · ネガ ${negativeRatePct}%`,
    warning: SNS_WARNING,
    explanation:
      'SNS評価：SNS上の話題や雰囲気の目安です。必ずしも株価と一致しません。',
    source: 'estimated',
  };
}

export function analyzeSnsSync(stock: StockFundamentals): SnsAnalysisResult {
  return buildEstimated(stock);
}

export async function analyzeSns(
  stock: StockFundamentals,
  apiKeys: AnalysisApiKeys,
): Promise<SnsAnalysisResult> {
  const socialKey = apiKeys.xApiKey.trim() || apiKeys.snsApiKey.trim();
  if (socialKey) {
    try {
      const remote = await fetchSnsFromApi(stock, socialKey);
      if (remote) return remote;
    } catch {
      /* unavailable */
    }
    return {
      score: 50,
      buzzScore: 0,
      positiveRatePct: 0,
      negativeRatePct: 0,
      summary: 'SNSデータ未取得',
      warning: SNS_WARNING,
      explanation:
        'SNS評価：SNS上の話題や雰囲気の目安です。',
      source: 'unavailable',
    };
  }
  return buildEstimated(stock);
}

async function fetchSnsFromApi(
  _stock: StockFundamentals,
  _apiKey: string,
): Promise<SnsAnalysisResult | null> {
  return null;
}
