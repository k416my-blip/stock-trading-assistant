import type { CharterQualitySignalId } from '../constants/investmentCharter';

export type AdoptionVerdict = 'adopt' | 'hold' | 'reject';

export type CharterQualitySignal = {
  id: CharterQualitySignalId;
  labelJa: string;
  matched: boolean;
};

export type CharterEvaluationResult = {
  charterVersion: string;
  verdict: AdoptionVerdict;
  verdictLabelJa: string;
  holdReasonsJa: string[];
  rejectReasonsJa: string[];
  qualitySignals: CharterQualitySignal[];
  matchedQualityCount: number;
  buyEligible: boolean;
  dataFetchIssuesJa: string[];
  fullRationaleJa: string;
};

export type RecommendationAuditEntry = {
  id: string;
  timestamp: string;
  symbol: string;
  name?: string;
  context: 'allocation_plan' | 'stock_detail' | 'screener';
  decision: AdoptionVerdict;
  decisionLabelJa: string;
  score: number;
  confidencePct: number;
  reasons: string[];
  counterReasons: string[];
  malaysiaV4AlignmentPct: number;
  charterVersion: string;
  qualitySignalsMatched: string[];
  /** 監査専用 — SHA256 判定フィンガープリント */
  decisionHash: string;
  decisionHashBefore: string;
  decisionHashAfter: string;
  /** enrichment 実行時のみ */
  narrativeCacheHit?: boolean;
  narrativeCacheMiss?: boolean;
  bullCaseCount: number;
  bearCaseCount: number;
  riskFactorCount: number;
  counterArgumentCount: number;
  /** enrichment 実行時のみ */
  redTeamCacheHit?: boolean;
  redTeamCacheMiss?: boolean;
};

export type RecommendationAuditLog = {
  entries: RecommendationAuditEntry[];
  updatedAt: string;
};
