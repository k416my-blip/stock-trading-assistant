/** Data Quality Score — 銘柄ごと 0–100（高いほど信頼） */

export const DATA_QUALITY_BASE = 100;

/** 致命的 — 価格欠損 */
export const DEDUCT_NULL_OR_INVALID_PRICE = 55;

/** 鮮度 */
export const DEDUCT_STALE_QUOTE = 25;
export const DEDUCT_STALE_NEWS = 12;

/** 整合性 */
export const DEDUCT_ABNORMAL_CHANGE_PCT = 20;
export const DEDUCT_BAD_TICK = 22;
export const DEDUCT_VOLUME_ANOMALY = 10;
export const DEDUCT_CONSENSUS_DIVERGENCE = 15;
export const DEDUCT_MARKET_CLOSED_MOVE = 18;

/** X / ニュース */
export const DEDUCT_X_LOW_RELIABILITY = 18;
export const DEDUCT_DUPLICATE_NEWS = 8;

/** グローバル API */
export const DEDUCT_API_DEGRADED = 12;
export const DEDUCT_STORAGE_CORRUPT = 20;

/** AI Input Gate — この値未満は強い判断禁止 */
export const AI_INPUT_GATE_MIN_SCORE = 45;

/** Reliability tier thresholds */
export const TIER_HIGH_MIN = 72;
export const TIER_MEDIUM_MIN = 45;

export const STALE_NEWS_MAX_AGE_SEC = 48 * 60 * 60;
export const ABNORMAL_CHANGE_PCT = 18;
export const BAD_TICK_CHANGE_PCT = 28;
export const CONSENSUS_DIVERGENCE_PCT = 6;
export const VOLUME_SURGE_BAD = 8;

export const DATA_RELIABILITY_REGULATORY_JA =
  'データ信頼性はルールベース検証。不確実時は判断保留・原因特定不能を優先します。';

export const DATA_RELIABILITY_AI_PROMPT_JA = `
【Data Reliability & Market Data Integrity】
- dataReliability.reliabilityBannerJa と dataQualityScore のみを根拠に鮮度・信頼を述べる。
- aiInputGateOpen=false のときは断定・強い売買推奨を禁止し、判断保留または原因特定不能を明示。
- 推測で価格・ニュースを補完しない。
`.trim();

export const DATA_RELIABILITY_UI_LABELS_JA = {
  panelTitle: 'Data Reliability & Integrity',
  banner: 'データ信頼度',
  globalScore: '総合 Data Quality',
  gate: 'AI Input Gate',
  lineage: 'データ系譜',
  apiHealth: 'API Health',
  issues: '検出問題',
} as const;
