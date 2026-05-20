import type { Market } from './index';
import type { MarketDataErrorKind, MarketQuote } from './marketData';
import type { AdjustedOHLCVBar, SurvivorshipBiasReport } from './quantValidation';

export type GapClass = 'none' | 'overnight' | 'earnings' | 'split' | 'liquidity_vacuum' | 'bad_tick';
export type IntegritySeverity = 'info' | 'watch' | 'high' | 'critical';

export interface IntegrityIssue {
  id: string;
  severity: IntegritySeverity;
  titleJa: string;
  detailJa: string;
  symbol?: string;
}

export interface MissingCandleRepair {
  gapsFound: number;
  candlesRepaired: number;
  methodJa: string;
  repairedBars?: AdjustedOHLCVBar[];
}

export interface AdjustmentValidation {
  valid: boolean;
  splitJumpsDetected: number;
  dividendDriftPct: number;
  maxAdjGapPct: number;
  noteJa: string;
}

export interface StaleQuoteCheck {
  stale: boolean;
  ageMs: number;
  maxAgeMs: number;
  noteJa: string;
}

export interface ApiOutageReconciliation {
  outageSuspected: boolean;
  successRatePct: number | null;
  timeoutCount: number;
  rateLimitCount: number;
  noteJa: string;
}

export interface CrossSourceVerification {
  verified: boolean;
  quotePrice: number;
  referencePrice: number;
  divergencePct: number;
  noteJa: string;
}

export interface TimestampDriftCheck {
  driftMs: number;
  serverSkewSuspected: boolean;
  noteJa: string;
}

export interface LookaheadBiasCheck {
  safe: boolean;
  futureBars: number;
  asOfDate: string;
  noteJa: string;
}

export interface LiquidityAnomalyCheck {
  anomalyDetected: boolean;
  volumeZScore: number;
  noteJa: string;
}

export interface GapClassification {
  gaps: { date: string; gapPct: number; class: GapClass }[];
  largestGapPct: number;
  noteJa: string;
}

export interface BadTickFilter {
  ticksRemoved: number;
  thresholdPct: number;
  noteJa: string;
}

export interface SessionValidation {
  inSession: boolean;
  market: Market;
  sessionLabelJa: string;
  noteJa: string;
}

export interface HolidayAwareness {
  isHoliday: boolean;
  exchangeLabelJa: string;
  nextSessionJa: string;
  noteJa: string;
}

export interface ConfidenceDecay {
  baseConfidence: number;
  decayedConfidence: number;
  stalePenalty: number;
  outagePenalty: number;
  noteJa: string;
}

export interface SymbolIntegrityResult {
  symbol: string;
  market: Market;
  missingCandleRepair: MissingCandleRepair;
  adjustmentValidation: AdjustmentValidation;
  staleQuote: StaleQuoteCheck | null;
  crossSource: CrossSourceVerification | null;
  timestampDrift: TimestampDriftCheck | null;
  lookahead: LookaheadBiasCheck;
  liquidityAnomaly: LiquidityAnomalyCheck;
  gapClassification: GapClassification;
  badTickFilter: BadTickFilter;
  session: SessionValidation;
  holiday: HolidayAwareness;
  confidence: ConfidenceDecay;
  symbolConfidence: number;
  issues: IntegrityIssue[];
}

export interface DataIntegrityReport {
  generatedAt: string;
  symbols: SymbolIntegrityResult[];
  survivorship: SurvivorshipBiasReport | null;
  apiOutage: ApiOutageReconciliation;
  globalIssues: IntegrityIssue[];
  aggregateConfidence: number;
  executionSafe: boolean;
  backtestRealismScore: number;
  healthStatus: 'green' | 'yellow' | 'red';
  verdictJa: string;
}

export interface DataIntegrityInput {
  symbol: string;
  market: Market;
  bars?: AdjustedOHLCVBar[];
  quote?: MarketQuote | null;
  quoteFetchedAt?: string;
  referenceBarClose?: number;
  apiDiagnostics?: {
    successRatePct: number | null;
    timeoutCount: number;
    rateLimitCount: number;
  };
}
