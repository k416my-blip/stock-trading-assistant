/**
 * Bursa Phase 11 — 材料センチメント分類・スコアリング（実テキストのみ）
 */
import type {
  BursaMaterialItem,
  BursaMaterialScoreBreakdown,
  BursaMaterialSentiment,
  BursaMaterialSource,
  BursaStockMaterialAnalysis,
} from '../../types/bursaDisclosure';

export const MATERIAL_MISSING_JA = 'データ未取得';

const SOURCE_WEIGHT: Record<BursaMaterialSource, number> = {
  bursa_announcement: 1.5,
  news_api: 1.2,
  rss: 1.0,
  x: 0.85,
  reddit: 0.75,
};

const STRONG_POSITIVE =
  /\b(surge|rally|beat|record|upgrade|strong|growth|profit\s+(rise|up|growth)|dividend\s+(increase|raise|up)|buyback|acquisition|contract\s+win)\b|増配|増益|好調|上方修正|買い上げ/i;
const POSITIVE =
  /\b(growth|profit|gain|expand|positive|outperform|dividend|rebound|recovery)\b|利益成長|配当/i;
const STRONG_NEGATIVE =
  /\b(plunge|crash|miss|loss|lawsuit|downgrade|cut|bankruptcy|default|fraud|suspend|halt)\b|減配|急減|赤字|下方修正|訴訟/i;
const NEGATIVE =
  /\b(fall|drop|decline|weak|lower|reduce|decrease|negative|underperform)\b|減益|下落|低迷|原油安/i;

export type RawMaterialInput = {
  source: BursaMaterialSource;
  title: string;
  url: string | null;
  publishedAt: string | null;
  idSuffix?: string;
  id?: string;
  /** UI表示用ソース名（例: Reddit RSS） */
  sourceLabelJa?: string;
};

export function classifyMaterialSentiment(title: string): BursaMaterialSentiment {
  const t = title.trim();
  if (!t) return '中立';
  if (STRONG_POSITIVE.test(t) || (POSITIVE.test(t) && !NEGATIVE.test(t))) return '好材料';
  if (STRONG_NEGATIVE.test(t) || (NEGATIVE.test(t) && !POSITIVE.test(t))) return '悪材料';
  if (POSITIVE.test(t) && NEGATIVE.test(t)) return '中立';
  return '中立';
}

/** Phase 材料スコアから sentiment を決定（Phase15〜23 共通） */
export function materialSentimentFromScore(score: number): BursaMaterialSentiment {
  if (score > 8) return '好材料';
  if (score < -8) return '悪材料';
  return '中立';
}

export function withAdjustedMaterialScore(item: BursaMaterialItem, score: number): BursaMaterialItem {
  const clamped = Math.max(-100, Math.min(100, score));
  return {
    ...item,
    score: clamped,
    sentiment: materialSentimentFromScore(clamped),
  };
}

function keywordStrength(title: string, sentiment: BursaMaterialSentiment): number {
  if (sentiment === '中立') return 0.4;
  if (sentiment === '好材料') {
    if (STRONG_POSITIVE.test(title)) return 1.4;
    if (POSITIVE.test(title)) return 1.0;
    return 0.7;
  }
  if (STRONG_NEGATIVE.test(title)) return 1.4;
  if (NEGATIVE.test(title)) return 1.0;
  return 0.7;
}

function baseScore(sentiment: BursaMaterialSentiment): number {
  if (sentiment === '好材料') return 12;
  if (sentiment === '悪材料') return -12;
  return 0;
}

export function scoreMaterialItem(input: RawMaterialInput): BursaMaterialItem {
  const sentiment = classifyMaterialSentiment(input.title);
  const strength = keywordStrength(input.title, sentiment);
  const score =
    sentiment === '中立'
      ? 0
      : Math.round(baseScore(sentiment) * SOURCE_WEIGHT[input.source] * strength);

  const reasonJa =
    sentiment === '中立'
      ? `${input.source} — 中立材料`
      : `${input.source} — ${sentiment}（キーワード判定）`;

  return {
    id: `${input.source}-${input.idSuffix ?? input.title.slice(0, 24)}`,
    source: input.source,
    sourceLabelJa: input.sourceLabelJa,
    sentiment,
    title: input.title,
    score,
    reasonJa,
    publishedAt: input.publishedAt,
    url: input.url,
  };
}

export function clampMaterialScore(n: number): number {
  return Math.max(-100, Math.min(100, Math.round(n)));
}

export function aggregateMaterialScore(items: BursaMaterialItem[]): {
  total: number;
  breakdown: BursaMaterialScoreBreakdown[];
} {
  const scored = items.filter((i) => i.sentiment !== '中立' && i.score !== 0);
  const total = clampMaterialScore(scored.reduce((sum, i) => sum + i.score, 0));
  const breakdown = [...scored]
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 6)
    .map((i) => ({ labelJa: i.title, score: i.score }));
  return { total, breakdown };
}

export function buildMaterialSummaryLines(stock: Pick<
  BursaStockMaterialAnalysis,
  'materialScore' | 'positiveMaterials' | 'negativeMaterials' | 'scoreBreakdown'
>): [string, string, string] {
  const topPos = stock.positiveMaterials[0]?.title;
  const topNeg = stock.negativeMaterials[0]?.title;
  const line1 = topPos ? `好材料: ${topPos}` : '好材料: データ未取得または該当なし';
  const line2 = topNeg ? `悪材料: ${topNeg}` : '悪材料: データ未取得または該当なし';
  const sign = stock.materialScore > 0 ? '+' : '';
  const line3 = `材料スコア ${sign}${stock.materialScore} — ${
    stock.materialScore > 15
      ? '好材料優勢'
      : stock.materialScore < -15
        ? '悪材料優勢'
        : '好悪中立'
  }`;
  return [line1, line2, line3];
}

export function buildBuyReasonsToday(positive: BursaMaterialItem[]): string[] {
  return positive
    .filter((m) => m.score > 0)
    .slice(0, 4)
    .map((m) => `${m.title} (+${m.score})`);
}

export function buildSellReasonsToday(negative: BursaMaterialItem[]): string[] {
  return negative
    .filter((m) => m.score < 0)
    .slice(0, 4)
    .map((m) => `${m.title} (${m.score})`);
}
