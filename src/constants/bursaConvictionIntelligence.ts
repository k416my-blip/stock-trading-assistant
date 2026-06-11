import { AUDIT_VALUATION_GAP_STOCKS } from './bursaValuationGapIntelligence';
import type { ConvictionLevel, TrustedValuationSource } from '../types/bursaConvictionIntelligence';

/** Phase22.2 — 監査対象6銘柄 */
export const AUDIT_CONVICTION_STOCKS = AUDIT_VALUATION_GAP_STOCKS;

export const CONVICTION_SCORE_MIN = -20;
export const CONVICTION_SCORE_MAX = 20;

export const COVERAGE_HIGH_THRESHOLD = 15;
export const COVERAGE_LOW_THRESHOLD = 8;

export const TRUSTED_SOURCE_JA: Record<TrustedValuationSource, string> = {
  'Fair Value': 'Fair Value（モデル優先）',
  'Analyst Target': 'Analyst Target（アナリスト優先）',
  Blended: 'Blended（双方整合）',
  Unavailable: '判定不可',
};

export const CONVICTION_LEVEL_JA: Record<ConvictionLevel, string> = {
  'Strong Buy': 'Strong Buy（強気）',
  Buy: 'Buy（買い）',
  Hold: 'Hold（中立）',
  Reduce: 'Reduce（縮小）',
  Avoid: 'Avoid（回避）',
};

export function convictionLevelFromScore(score: number): ConvictionLevel {
  if (score >= 12) return 'Strong Buy';
  if (score >= 5) return 'Buy';
  if (score <= -12) return 'Avoid';
  if (score <= -5) return 'Reduce';
  return 'Hold';
}
