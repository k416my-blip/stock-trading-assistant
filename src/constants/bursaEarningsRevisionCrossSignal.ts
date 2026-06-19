/** Phase23.1 — Earnings Revision Cross Signal 定数 */

export const AUDIT_EARNINGS_REVISION_CROSS_SIGNAL_STOCKS = [
  '1155',
  '1023',
  '1295',
  '5347',
  '4707',
  '6033',
] as const;

export const CROSS_SIGNAL_SCORE_MIN = -20;
export const CROSS_SIGNAL_SCORE_MAX = 20;

export const CROSS_SIGNAL_STRONG_BULLISH_SCORE = 18;
export const CROSS_SIGNAL_STRONG_BEARISH_SCORE = -18;
export const CROSS_SIGNAL_BULLISH_SCORE = 10;
export const CROSS_SIGNAL_BEARISH_SCORE = -10;
export const CROSS_SIGNAL_DIVERGENCE_SCORE = 3;
export const CROSS_SIGNAL_REVISION_ONLY_SCORE = 6;

export const CROSS_SIGNAL_MATERIAL_WEIGHT = 0.55;
export const CROSS_SIGNAL_MATERIAL_SCORE_CAP = 12;

export const CROSS_SIGNAL_DIRECTION_JA: Record<
  import('../types/bursaEarningsRevisionCrossSignal').EarningsRevisionCrossSignalDirection,
  string
> = {
  'Strong Bullish': 'Strong Bullish（Revision↑ × Insider Buy × Institutional Buy）',
  Bullish: 'Bullish（強気クロスシグナル）',
  Neutral: 'Neutral（中立・乖離）',
  Bearish: 'Bearish（弱気クロスシグナル）',
  'Strong Bearish': 'Strong Bearish（Revision↓ × Insider Sell × Institutional Sell）',
  Unavailable: 'Unavailable（データ不足）',
};

export const CROSS_SIGNAL_COMPONENT_BIAS_JA: Record<
  import('../types/bursaEarningsRevisionCrossSignal').CrossSignalComponentBias,
  string
> = {
  bullish: '強気',
  bearish: '弱気',
  neutral: '中立',
  unavailable: 'データ不足',
};
