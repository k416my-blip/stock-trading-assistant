import { AUDIT_ANALYST_TARGET_STOCKS } from './bursaAnalystTargetIntelligence';
import type { ValuationGapClassification } from '../types/bursaValuationGapIntelligence';

/** Phase22.1 — 監査対象6銘柄 */
export const AUDIT_VALUATION_GAP_STOCKS = AUDIT_ANALYST_TARGET_STOCKS;

export const VALUATION_GAP_SCORE_MIN = -10;
export const VALUATION_GAP_SCORE_MAX = 10;

/** Gap 分類閾値（%） */
export const GAP_STRONG_ANALYST_PREMIUM_PCT = 50;
export const GAP_ANALYST_PREMIUM_PCT = 20;
export const GAP_CONSENSUS_LOW_PCT = -20;

export const VALUATION_GAP_CLASSIFICATION_JA: Record<ValuationGapClassification, string> = {
  'Strong Analyst Premium': 'Strong Analyst Premium（アナリスト大幅上方）',
  'Analyst Premium': 'Analyst Premium（アナリスト上方）',
  Consensus: 'Consensus（概ね一致）',
  'Model Premium': 'Model Premium（モデル上方）',
  Unavailable: '分類不可',
};
