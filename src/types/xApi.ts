import type { Market } from './index';
import type { XSentimentSnapshot } from './xSentiment';

export type XApiUsageKind = 'search' | 'verify';

export type XApiDailyUsage = {
  version: 1;
  dateKey: string;
  searchCalls: number;
  verifyCalls: number;
  creditsUsed: number;
  lastUpdatedAt: string;
};

export type XSymbolCacheEntry = {
  symbol: string;
  market: Market;
  companyName?: string;
  fetchedAt: string;
  expiresAt: string;
  postCount: number;
  /** 投稿全文は保存しない */
  summaryJa: string;
  buzzScore: number;
  positiveRatePct: number;
  negativeRatePct: number;
  fromCache: boolean;
  /** ルールベースセンチメント（取得データ由来） */
  sentiment?: XSentimentSnapshot;
  previousPostCount?: number;
  searchQuery?: string;
};

export type XPostsFetchResult = {
  ok: boolean;
  cacheHit: boolean;
  snapshot: XSentimentSnapshot | null;
  errorJa?: string;
  skippedReason?: XApiFetchResult['skippedReason'];
  httpStatus?: number;
};

export type XApiFetchResult = {
  ok: boolean;
  cacheHit: boolean;
  entry: XSymbolCacheEntry | null;
  errorJa?: string;
  skippedReason?:
    | 'no_key'
    | 'no_intent'
    | 'disabled'
    | 'optional_mode'
    | 'payment_required';
  httpStatus?: number;
};

export type XApiUsageDashboard = {
  dateKey: string;
  searchCalls: number;
  verifyCalls: number;
  creditsUsed: number;
  dailySoftLimit: number;
  remainingToday: number;
  monthlyBudget: number;
  projectedMonthCredits: number;
  forecastJa: string;
  conservationEnabled: true;
};
