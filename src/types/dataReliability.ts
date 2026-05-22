import type { Market } from './index';
import type { ConciergeSymbolEvidence } from './conciergeEvidence';
import type { ApiHealthDashboard } from './apiSetup';

export type ReliabilityTier = 'high' | 'medium' | 'low';

export type DataSourceKind = 'quote' | 'news' | 'x' | 'macro' | 'api';

export type TimestampedDataPoint = {
  source: DataSourceKind;
  sourceLabelJa: string;
  timestampIso: string;
  ageSeconds: number;
  stale: boolean;
};

export type QuoteIntegrityIssue = {
  code:
    | 'null_price'
    | 'zero_price'
    | 'nan_price'
    | 'stale_quote'
    | 'abnormal_change'
    | 'volume_anomaly'
    | 'bad_tick'
    | 'market_closed_move'
    | 'consensus_divergence';
  labelJa: string;
  detailJa: string;
};

export type SymbolDataReliability = {
  symbol: string;
  market: Market;
  dataQualityScore: number;
  tier: ReliabilityTier;
  issues: QuoteIntegrityIssue[];
  lineage: TimestampedDataPoint[];
  consensusWarningJa: string | null;
  aiGateOpen: boolean;
  gateNoteJa: string | null;
};

export type ApiReliabilityRow = {
  providerId: string;
  labelJa: string;
  successRatePct: number;
  latencyMsEstimate: number;
  lastSuccessAt: string | null;
  failureCount: number;
  statusJa: string;
};

export type DataReliabilityBundle = {
  generatedAt: string;
  safetyBannerJa: string;
  reliabilityTier: ReliabilityTier;
  reliabilityBannerJa: string;
  globalDataQualityScore: number;
  aiInputGateOpen: boolean;
  aiGateNoteJa: string;
  safeFallbackJa: string | null;
  symbols: SymbolDataReliability[];
  apiHealth: ApiReliabilityRow[];
  storageIntegrityOk: boolean;
  storageCorruptionKeys: string[];
  duplicateGuardNoteJa: string | null;
  timezoneNoteJa: string;
  holidaySuppressionActive: boolean;
  corporateActionNoteJa: string | null;
  lineageSummaryJa: string[];
};

export type BuildDataReliabilityInput = {
  symbols: ConciergeSymbolEvidence[];
  apiHealth: ApiHealthDashboard;
  generatedAt?: string;
};
