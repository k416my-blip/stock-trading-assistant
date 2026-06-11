/**
 * Phase18.5 — News Impact Engine（Event分類・Impact Score・時間減衰）
 */
import type { NewsEventType, NewsSentiment } from '../../types/bursaNewsIntelligence';
import {
  tryExpandOtherEvent,
  EXPANSION_IMPACT_RANGES,
  eventDirectionSentimentHint,
} from './bursaNewsEventExpansionEngine';
import {
  validateNewsEventClassification,
  type ValidatedEventClassification,
} from './bursaNewsEventValidationEngine';

export type ValidatedEventWithExpansion = ValidatedEventClassification & {
  preExpansionEventType: NewsEventType;
};

export type NewsImpactRange = { min: number; max: number };

/** Event種別ごとの Impact Score レンジ（0〜100） */
export const EVENT_IMPACT_RANGES: Record<NewsEventType, NewsImpactRange> = {
  Earnings: { min: 70, max: 95 },
  'Guidance Raise': { min: 80, max: 100 },
  'Guidance Cut': { min: 80, max: 100 },
  'Contract Award': { min: 60, max: 90 },
  'Large Order': { min: 50, max: 80 },
  'Dividend Increase': { min: 40, max: 70 },
  'Dividend Cut': { min: 40, max: 70 },
  Acquisition: { min: 60, max: 90 },
  Disposal: { min: 40, max: 70 },
  'Regulatory Approval': { min: 50, max: 80 },
  'Regulatory Risk': { min: 50, max: 85 },
  'Management Change': { min: 35, max: 65 },
  'Product Launch': { min: 45, max: 75 },
  Expansion: { min: 40, max: 70 },
  Partnership: { min: 40, max: 70 },
  Regulatory: { min: 45, max: 75 },
  'M&A': { min: 60, max: 90 },
  'Analyst Upgrade': { min: 50, max: 80 },
  'Analyst Downgrade': { min: 50, max: 80 },
  'Share Buyback': { min: 45, max: 70 },
  'Capital Raising': { min: 40, max: 65 },
  Commodity: { min: 20, max: 50 },
  'Interest Rate': { min: 20, max: 50 },
  Currency: { min: 20, max: 50 },
  Other: { min: 0, max: 30 },
};

const INTENSITY_HIGH =
  /\b(record|surge|plunge|major|largest|significant|substantial|beat|miss|strong|weak)\b|大幅|急増|急減/i;
const INTENSITY_LOW = /\b(slight|minor|modest|steady|unchanged|maintain)\b|小幅|横ばい/i;

type EventClassifier = { type: NewsEventType; pattern: RegExp };

/** 具体パターンを優先（先頭マッチ勝ち） */
const EVENT_CLASSIFIERS: EventClassifier[] = [
  {
    type: 'Guidance Raise',
    pattern:
      /\b(raise|raised|raising|upgrade|lift|upward|stronger|improve).*(guidance|outlook|forecast)|guidance.*(raise|upgrade|lift|stronger)|outlook.*(raised|improved|higher)|上方修正/i,
  },
  {
    type: 'Guidance Cut',
    pattern:
      /\b(cut|lower|lowered|downgrade|slash|weak|reduce).*(guidance|outlook|forecast)|guidance.*(cut|lower|reduced|slashed)|outlook.*(cut|lowered|weaker)|下方修正/i,
  },
  {
    type: 'Dividend Increase',
    pattern:
      /\b(dividend|payout|distribution).*(raise|increase|hike|up|higher|special)|増配|special\s+dividend|interim\s+dividend/i,
  },
  {
    type: 'Dividend Cut',
    pattern:
      /\b((dividend|payout).*(cut|reduce|suspend|slash|omit|lower))|((cut|slash|reduce|suspend).*(dividend|payout))|減配|omit.*dividend|skip.*dividend/i,
  },
  {
    type: 'Contract Award',
    pattern: /\bcontract\s+(award|win|awarded)|awarded\s+(a\s+)?contract|受注|契約獲得/i,
  },
  {
    type: 'Large Order',
    pattern: /\blarge\s+order|major\s+order|bulk\s+order|record\s+order|megawatt\s+order|大口受注/i,
  },
  {
    type: 'Regulatory Approval',
    pattern:
      /\b(approval|approved|clearance|license\s+granted|regulatory\s+clearance|greenlight)|認可|承認|許可/i,
  },
  {
    type: 'Regulatory Risk',
    pattern:
      /\b(regulat.*(risk|probe|investigation|fine|penalty|violation|breach)|compliance\s+(issue|breach)|lawsuit|litigation|訴訟|規制.*リスク)/i,
  },
  { type: 'Acquisition', pattern: /\bacquisition|acquires|merger|takeover|買収|M&A|buyout/i },
  {
    type: 'Disposal',
    pattern: /\bdisposal|divest|divestiture|sell\s+(unit|stake|asset)|asset\s+sale|売却/i,
  },
  {
    type: 'Management Change',
    pattern:
      /\b(CEO|CFO|COO|director|chairman).*(resign|appoint|named|step\s+down|retire)|management\s+change|new\s+(CEO|CFO)|経営.*交代|社長.*就任/i,
  },
  {
    type: 'Earnings',
    pattern: /\bearnings|quarterly\s+results|net\s+profit|revenue|決算|業績|FY\d|Q[1-4]/i,
  },
  {
    type: 'Interest Rate',
    pattern: /\binterest\s+rate|central\s+bank|OPR|BNM\s+rate|monetary\s+policy|金利|金融政策/i,
  },
  {
    type: 'Currency',
    pattern: /\b(ringgit|forex|USD\/MYR|MYR\/USD|currency|為替|exchange\s+rate)/i,
  },
  {
    type: 'Commodity',
    pattern: /\b(oil|crude|palm\s+oil|commodity|natural\s+gas|LNG|原油|商品|CPKO)/i,
  },
];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Phase18.5 時間減衰: 24h=1.0 / 3d=0.7 / 7d=0.4 / 30d=0.1 */
export function newsImpactRecencyWeight(publishedAt: string | null, now = Date.now()): number {
  if (!publishedAt) return 0.35;
  const ageHours = (now - new Date(publishedAt).getTime()) / 3_600_000;
  if (ageHours <= 24) return 1;
  if (ageHours <= 72) return 0.7;
  if (ageHours <= 168) return 0.4;
  if (ageHours <= 720) return 0.1;
  return 0.1;
}

/** Stage1 — キーワード分類のみ（Phase18.6でStage2検証） */
export function classifyNewsImpactEventStage1(headline: string): NewsEventType {
  for (const row of EVENT_CLASSIFIERS) {
    if (row.pattern.test(headline)) return row.type;
  }
  if (/\bdividend|payout|配当/i.test(headline)) return 'Dividend Increase';
  return 'Other';
}

export function classifyNewsImpactEvent(headline: string): NewsEventType {
  return classifyValidatedNewsEvent(headline).eventType;
}

export function classifyValidatedNewsEvent(headline: string): ValidatedEventWithExpansion {
  const stage1 = classifyNewsImpactEventStage1(headline);
  let validated = validateNewsEventClassification(stage1, headline);
  const preExpansionEventType = validated.eventType;
  if (validated.eventType === 'Other') {
    const expanded = tryExpandOtherEvent(headline, stage1, preExpansionEventType);
    if (expanded) validated = expanded;
  }
  return { ...validated, preExpansionEventType };
}

/** Eventレンジ内で headline 強度により Impact Score を決定 */
export function computeEventImpactScore(eventType: NewsEventType, headline: string): number {
  const range = EXPANSION_IMPACT_RANGES[eventType] ?? EVENT_IMPACT_RANGES[eventType];
  const mid = (range.min + range.max) / 2;
  let score = mid;
  if (INTENSITY_HIGH.test(headline)) score = range.max - (range.max - range.min) * 0.15;
  else if (INTENSITY_LOW.test(headline)) score = range.min + (range.max - range.min) * 0.2;
  return clamp(Math.round(score), range.min, range.max);
}

/** 単一記事の材料寄与: Impact × Sentiment × 減衰（Neutral=0） */
export function articleMaterialContribution(input: {
  sentiment: NewsSentiment;
  impactScore: number;
  recencyWeight: number;
  eventType?: NewsEventType;
}): number {
  const sentiment = input.eventType
    ? eventDirectionSentimentHint(input.eventType, input.sentiment)
    : input.sentiment;
  if (sentiment === 'Neutral') return 0;
  const sign = sentiment === 'Bullish' ? 1 : -1;
  return sign * (input.impactScore / 100) * 20 * input.recencyWeight;
}

/** 集約材料スコア — 補助のみ・-20〜+20 */
export function aggregateNewsImpactMaterialScore(
  articles: Array<{
    sentiment: NewsSentiment;
    impactScore: number;
    recencyWeight: number;
    eventType?: NewsEventType;
  }>,
): number {
  let net = 0;
  for (const a of articles) {
    net += articleMaterialContribution(a);
  }
  return clamp(Math.round(net * 10) / 10, -20, 20);
}

export function buildEventTypeDistribution(
  articles: Array<{ eventType: NewsEventType }>,
): Partial<Record<NewsEventType, number>> {
  const dist: Partial<Record<NewsEventType, number>> = {};
  for (const a of articles) {
    dist[a.eventType] = (dist[a.eventType] ?? 0) + 1;
  }
  return dist;
}

export function buildImpactDistribution(articles: Array<{ impactScore: number }>): {
  low: number;
  mid: number;
  high: number;
  avg: number;
  max: number;
} {
  let low = 0;
  let mid = 0;
  let high = 0;
  let sum = 0;
  let max = 0;
  for (const a of articles) {
    sum += a.impactScore;
    max = Math.max(max, a.impactScore);
    if (a.impactScore < 40) low += 1;
    else if (a.impactScore < 70) mid += 1;
    else high += 1;
  }
  return {
    low,
    mid,
    high,
    avg: articles.length > 0 ? sum / articles.length : 0,
    max,
  };
}

/** 監査用: Stage2再適用一致率 */
export function measureEventClassificationAccuracy(
  articles: Array<{ headline: string; eventType: NewsEventType }>,
): number {
  if (articles.length === 0) return 1;
  let match = 0;
  for (const a of articles) {
    if (classifyValidatedNewsEvent(a.headline).eventType === a.eventType) match += 1;
  }
  return match / articles.length;
}
