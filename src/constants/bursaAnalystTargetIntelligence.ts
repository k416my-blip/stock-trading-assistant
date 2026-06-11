import { AUDIT_FAIR_VALUE_STOCKS } from './bursaFairValueIntelligence';

/** Phase22 — 監査対象6銘柄（Phase20/21 と同一） */
export const AUDIT_ANALYST_TARGET_STOCKS = AUDIT_FAIR_VALUE_STOCKS;

export const ANALYST_TARGET_SCORE_MIN = -20;
export const ANALYST_TARGET_SCORE_MAX = 20;

/** Fair Value vs Analyst 乖離判定閾値（%） */
export const FV_VS_ANALYST_ALIGNED_THRESHOLD_PCT = 10;

export const TARGET_REVISION_TREND_JA: Record<string, string> = {
  Upgrade: 'Upgrade（上方修正）',
  Downgrade: 'Downgrade（下方修正）',
  Stable: 'Stable（横ばい）',
};

export const FV_VS_ANALYST_JUDGMENT_JA: Record<string, string> = {
  'Analyst Bullish': 'Analyst Bullish（アナリスト上方）',
  'Fair Value Bullish': 'Fair Value Bullish（モデル上方）',
  Aligned: 'Aligned（概ね一致）',
  Unavailable: '比較不可',
};
