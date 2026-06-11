/** Phase23 — Earnings Revision Intelligence 定数 */

import type { EarningsRevisionDirection } from '../types/bursaEarningsRevisionIntelligence';

export const AUDIT_EARNINGS_REVISION_STOCKS = [
  '1155',
  '1023',
  '1295',
  '5347',
  '4707',
  '6033',
] as const;

export const EARNINGS_REVISION_SCORE_MIN = -20;
export const EARNINGS_REVISION_SCORE_MAX = 20;

export const EARNINGS_REVISION_FIELDS_TOTAL = 14;

export const REVISION_DIRECTION_JA: Record<EarningsRevisionDirection, string> = {
  'Strong Upward': 'Strong Upward（強い上方修正）',
  Upward: 'Upward（上方修正）',
  Stable: 'Stable（横ばい）',
  Downward: 'Downward（下方修正）',
  'Strong Downward': 'Strong Downward（強い下方修正）',
};

export const REVISION_DIRECTION_THRESHOLDS = {
  strongUpward: 12,
  upward: 5,
  downward: -5,
  strongDownward: -12,
} as const;
