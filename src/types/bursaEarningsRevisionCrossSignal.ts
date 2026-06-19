/** Phase23.1 — Earnings Revision × Insider/Institutional Cross Signal ドメイン型 */

export type CrossSignalComponentBias = 'bullish' | 'bearish' | 'neutral' | 'unavailable';

export type EarningsRevisionCrossSignalDirection =
  | 'Strong Bullish'
  | 'Bullish'
  | 'Neutral'
  | 'Bearish'
  | 'Strong Bearish'
  | 'Unavailable';

export type EarningsRevisionCrossSignalConfidence = 'High' | 'Medium' | 'Low';

export type EarningsRevisionCrossSignalDisplayFields = {
  crossSignalDirection: string;
  crossSignalScore: string;
  revisionBias: string;
  insiderBias: string;
  institutionalBias: string;
  alignmentCount: string;
  confidence: string;
  unavailableReason: string;
};

export type BursaEarningsRevisionCrossSignalAnalysis = {
  availability: 'available' | 'unavailable';
  availabilityLabelJa: string;
  crossSignalDirection: EarningsRevisionCrossSignalDirection;
  crossSignalScore: number;
  revisionBias: CrossSignalComponentBias;
  insiderBias: CrossSignalComponentBias;
  institutionalBias: CrossSignalComponentBias;
  alignmentCount: number;
  availableComponentCount: number;
  crossSignalConfidence: EarningsRevisionCrossSignalConfidence;
  unavailableReason: string | null;
  displayJa: EarningsRevisionCrossSignalDisplayFields;
  /** AI統合 1行評価 */
  evaluationJa: string;
  hasExtractableData: boolean;
  fetchedAt: string | null;
};

export const EARNINGS_REVISION_CROSS_SIGNAL_UNAVAILABLE_JA =
  'Phase23.1 Earnings Revision Cross Signal — データ未取得';
