/** Phase24 — Analyst Consensus Intelligence 定数 */

import type { AnalystConsensusRatingLabel } from '../types/bursaAnalystConsensusIntelligence';

export const AUDIT_ANALYST_CONSENSUS_STOCKS = [
  '1155',
  '1023',
  '1295',
  '5347',
  '4707',
  '6033',
] as const;

export const ANALYST_CONSENSUS_SCORE_MIN = -20;
export const ANALYST_CONSENSUS_SCORE_MAX = 20;

export const ANALYST_CONSENSUS_FIELDS_TOTAL = 14;

/** analystCount がこの値未満なら confidence 低下 */
export const ANALYST_CONSENSUS_MIN_COUNT_FOR_HIGH = 8;
export const ANALYST_CONSENSUS_MIN_COUNT_FOR_MEDIUM = 3;

/** consensusDispersion (0–100) がこの値超なら confidence 低下 */
export const ANALYST_CONSENSUS_HIGH_DISPERSION_THRESHOLD = 55;

/** updatedAt がこの日数より古いと stale_data */
export const ANALYST_CONSENSUS_STALE_DAYS = 30;

export const CONSENSUS_RATING_JA: Record<AnalystConsensusRatingLabel, string> = {
  'Strong Buy': 'Strong Buy（強気）',
  Buy: 'Buy（買い）',
  Hold: 'Hold（中立）',
  Sell: 'Sell（売り）',
  'Strong Sell': 'Strong Sell（強気売り）',
};

export const REVISION_DIRECTION_JA = {
  Upgraded: 'Upgraded（上方改定）',
  Stable: 'Stable（横ばい）',
  Downgraded: 'Downgraded（下方改定）',
} as const;

export const ANALYST_CONSENSUS_SCORE_THRESHOLDS = {
  strongPositive: 12,
  positive: 5,
  negative: -5,
  strongNegative: -12,
  buyRatioHigh: 0.65,
  sellRatioHigh: 0.35,
  upsideStrong: 15,
  upsideModerate: 5,
  downsideStrong: -15,
  downsideModerate: -5,
  targetRevisionStrong: 5,
  ratingRevisionBoost: 3,
} as const;
