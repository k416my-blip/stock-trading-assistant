/**
 * Phase 11.6 — 材料データ品質・ソース別スコア・API接続表示
 */
import type {
  BursaMaterialItem,
  BursaMaterialSource,
  BursaMaterialSourceStatus,
  BursaStockMaterialAnalysis,
} from '../../types/bursaDisclosure';

export const SOURCE_SHORT_LABEL: Record<BursaMaterialSource, string> = {
  bursa_announcement: 'Bursa',
  news_api: 'News',
  rss: 'RSS',
  x: 'X',
  reddit: 'Reddit',
};

export const PAID_API_SOURCES = ['news_api', 'x', 'reddit'] as const;
export type PaidApiSource = (typeof PAID_API_SOURCES)[number];

export const PAID_API_UI_LABEL: Record<PaidApiSource, string> = {
  news_api: 'News API',
  x: 'X API',
  reddit: 'Reddit API',
};

export type MaterialDataQuality = {
  stars: string;
  labelJa: string;
  connectedLabels: string[];
};

export type SourceScoreRow = {
  sourceJa: string;
  scoreJa: string;
  score: number;
};

export function isSourceConnected(status: BursaMaterialSourceStatus): boolean {
  return status === 'ok' || status === 'partial';
}

/** News / X / Reddit の接続済み・未接続 */
export function formatPaidApiConnection(status: BursaMaterialSourceStatus): '接続済み' | '未接続' {
  return isSourceConnected(status) ? '接続済み' : '未接続';
}

/** Reddit — RSS 接続時は OAuth 未設定でも接続済み表示 */
export function formatRedditApiConnection(
  status: BursaMaterialSourceStatus,
  fetchMethod?: 'rss' | 'oauth' | 'none',
): 'Reddit RSS接続' | '接続済み' | '未接続' {
  if (!isSourceConnected(status)) return '未接続';
  if (fetchMethod === 'rss') return 'Reddit RSS接続';
  return '接続済み';
}

export function scoreBySource(items: BursaMaterialItem[]): Record<BursaMaterialSource, number> {
  const out: Record<BursaMaterialSource, number> = {
    bursa_announcement: 0,
    news_api: 0,
    rss: 0,
    x: 0,
    reddit: 0,
  };
  for (const item of items) {
    if (item.sentiment === '中立') continue;
    out[item.source] += item.score;
  }
  return out;
}

export function buildSourceScoreBreakdown(stock: BursaStockMaterialAnalysis): SourceScoreRow[] {
  const items = [
    ...(stock.positiveMaterials ?? []),
    ...(stock.negativeMaterials ?? []),
    ...(stock.neutralMaterials ?? []),
  ];
  const bySource = scoreBySource(items);
  const order: BursaMaterialSource[] = [
    'bursa_announcement',
    'rss',
    'news_api',
    'x',
    'reddit',
  ];
  return order.map((src) => {
    const score = bySource[src];
    const sign = score > 0 ? '+' : score < 0 ? '' : '+';
    return {
      sourceJa: SOURCE_SHORT_LABEL[src],
      scoreJa: score === 0 ? '+0' : `${sign}${score}`,
      score,
    };
  });
}

export function computeMaterialDataQuality(
  sourceStatus: Record<BursaMaterialSource, BursaMaterialSourceStatus> | null | undefined,
): MaterialDataQuality {
  const status = sourceStatus ?? ({} as Record<BursaMaterialSource, BursaMaterialSourceStatus>);
  const has = {
    bursa: isSourceConnected(status.bursa_announcement),
    rss: isSourceConnected(status.rss),
    news: isSourceConnected(status.news_api),
    x: isSourceConnected(status.x),
    reddit: isSourceConnected(status.reddit),
  };

  const parts: string[] = [];
  if (has.bursa) parts.push('Bursa');
  if (has.rss) parts.push('RSS');
  if (has.news) parts.push('News');
  if (has.x) parts.push('X');
  if (has.reddit) parts.push('Reddit');

  if (has.bursa && has.rss && has.news && has.x && has.reddit) {
    return { stars: '★★★★★', labelJa: 'Bursa+RSS+News+X+Reddit', connectedLabels: parts };
  }
  if (has.bursa && has.rss && has.news) {
    return { stars: '★★★★☆', labelJa: 'Bursa+RSS+News', connectedLabels: parts };
  }
  if (has.bursa && has.rss) {
    return { stars: '★★★☆☆', labelJa: 'Bursa+RSS', connectedLabels: parts };
  }
  if (has.rss && !has.bursa && !has.news && !has.x && !has.reddit) {
    return { stars: '★★☆☆☆', labelJa: 'RSSのみ', connectedLabels: parts };
  }
  if (parts.length === 0) {
    return { stars: '★☆☆☆☆', labelJa: 'データ不足', connectedLabels: [] };
  }
  return { stars: '★★★☆☆', labelJa: parts.join('+'), connectedLabels: parts };
}

export function materialQualityForStock(
  stocks: BursaStockMaterialAnalysis[],
  stockCode: string | null,
): MaterialDataQuality | null {
  if (!stockCode) return null;
  const row = stocks.find((s) => s.stockCode === stockCode);
  if (!row) return null;
  return computeMaterialDataQuality(row.sourceStatus);
}
