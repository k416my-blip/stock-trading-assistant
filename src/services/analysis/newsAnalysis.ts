import type { StockFundamentals } from '../../types';
import type { AnalysisApiKeys } from '../analysisApiKeys';
import type { NewsAnalysisResult, NewsHeadline, NewsSentimentLabel } from '../../types/recommendation';

function hashSymbol(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildEstimatedHeadlines(stock: StockFundamentals): NewsHeadline[] {
  const h = hashSymbol(stock.symbol);
  const templates: NewsHeadline[] = [
    { title: `${stock.name}の四半期業績が市場の関心に`, sentiment: '中立' },
    { title: `${stock.symbol}：アナリスト評価が注目`, sentiment: 'ポジティブ' },
    { title: 'セクター全体の値動きが話題', sentiment: '中立' },
    { title: 'マクロ経済の影響が株価に波及する可能性', sentiment: 'ネガティブ' },
  ];
  const pick = (h % 3) + 2;
  return templates.slice(0, pick).map((t, i) => ({
    ...t,
    sentiment: (['ポジティブ', '中立', 'ネガティブ'] as NewsSentimentLabel[])[(h + i) % 3],
  }));
}

function sentimentToScore(sentiment: NewsSentimentLabel): number {
  if (sentiment === 'ポジティブ') return 78;
  if (sentiment === 'ネガティブ') return 32;
  return 55;
}

function aggregateScore(headlines: NewsHeadline[]): { score: number; sentiment: NewsSentimentLabel } {
  if (headlines.length === 0) return { score: 50, sentiment: '中立' };
  const scores = headlines.map((h) => sentimentToScore(h.sentiment));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const pos = headlines.filter((h) => h.sentiment === 'ポジティブ').length;
  const neg = headlines.filter((h) => h.sentiment === 'ネガティブ').length;
  const sentiment: NewsSentimentLabel =
    pos > neg ? 'ポジティブ' : neg > pos ? 'ネガティブ' : '中立';
  return { score: Math.round(avg), sentiment };
}

/** 外部ニュースAPI（任意）— キー未設定時は参考推定 */
export async function analyzeNews(
  stock: StockFundamentals,
  apiKeys: AnalysisApiKeys,
): Promise<NewsAnalysisResult> {
  const explanation =
    'ニュース評価：最近のニュースが株価に良い影響か悪い影響かを見る目安です。断定ではありません。';

  if (apiKeys.newsApiKey.trim()) {
    try {
      // 任意API：未実装エンドポイントは失敗扱いにし、クラッシュしない
      const headlines = await fetchNewsFromApi(stock, apiKeys.newsApiKey);
      if (headlines && headlines.length > 0) {
        const { score, sentiment } = aggregateScore(headlines);
        return {
          score,
          sentiment,
          headlines,
          summary: `ニュース評価：${sentiment}（${headlines.length}件）`,
          explanation,
          source: 'available',
        };
      }
    } catch {
      /* fall through to unavailable */
    }
    return {
      score: 50,
      sentiment: '中立',
      headlines: [],
      summary: 'ニュースデータ未取得',
      explanation,
      source: 'unavailable',
    };
  }

  const headlines = buildEstimatedHeadlines(stock);
  const { score, sentiment } = aggregateScore(headlines);
  return {
    score,
    sentiment,
    headlines,
    summary: `ニュース評価：${sentiment}（参考推定）`,
    explanation,
    source: 'estimated',
  };
}

/** 同期版（スクリーナー用） */
export function analyzeNewsSync(stock: StockFundamentals): NewsAnalysisResult {
  const headlines = buildEstimatedHeadlines(stock);
  const { score, sentiment } = aggregateScore(headlines);
  return {
    score,
    sentiment,
    headlines,
    summary: `ニュース評価：${sentiment}（参考推定）`,
    explanation:
      'ニュース評価：最近のニュースが株価に良い影響か悪い影響かを見る目安です。断定ではありません。',
    source: 'estimated',
  };
}

const NEWS_API_TIMEOUT_MS = 10_000;

function titleSentiment(title: string): NewsSentimentLabel {
  const POSITIVE = /\b(surge|rally|beat|growth|profit|upgrade|record|strong|上昇|好調|増益)\b/i;
  const NEGATIVE = /\b(fall|drop|miss|loss|downgrade|weak|lawsuit|cut|下落|減益|訴訟)\b/i;
  if (POSITIVE.test(title)) return 'ポジティブ';
  if (NEGATIVE.test(title)) return 'ネガティブ';
  return '中立';
}

async function fetchNewsFromApi(
  stock: StockFundamentals,
  apiKey: string,
): Promise<NewsHeadline[] | null> {
  const trimmed = apiKey.trim();
  if (!trimmed) return null;
  try {
    const { fetchNewsApiWithFallback } = await import('../newsApiClient');
    const fetched = await fetchNewsApiWithFallback(
      `${stock.symbol} ${stock.name}`.trim(),
      trimmed,
      6,
      NEWS_API_TIMEOUT_MS,
    );
    if (!fetched.ok || fetched.titles.length === 0) return null;
    return fetched.titles.slice(0, 6).map((title) => ({
      title,
      sentiment: titleSentiment(title),
    }));
  } catch {
    return null;
  }
}
