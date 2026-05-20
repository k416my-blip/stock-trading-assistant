import type { CorrelationRegimeId } from './crisisCorrelation';
import type { CrossAssetFlowSnapshot } from './crossAssetFlow';
import type { MarketRegimeId, MarketRegimeResult, SectorTheme } from './marketRegime';

export type IntermarketRegimeId =
  | 'global_risk_on'
  | 'global_risk_off'
  | 'inflation_stress'
  | 'growth_slowdown'
  | 'liquidity_crunch'
  | 'mixed_transition';

export type SentimentTone = 'bullish' | 'neutral' | 'bearish';
export type PanicEuphoriaState = 'panic' | 'cautious' | 'neutral' | 'euphoria';

export interface IntermarketRegime {
  regimeId: IntermarketRegimeId;
  labelJa: string;
  confidencePct: number;
  driversJa: string[];
}

export interface AssetClassCorrelation {
  pairLabelJa: string;
  correlation: number;
  priorCorrelation: number;
  delta: number;
  stressAdjusted: number;
  alert: boolean;
}

export interface CorrelationMonitor {
  pairs: AssetClassCorrelation[];
  averageCorrelation: number;
  correlationRegime: CorrelationRegimeId;
  noteJa: string;
}

export interface LiquidityRegimeSense {
  regimeId: 'expansion' | 'neutral' | 'contraction';
  score: number;
  hySpreadProxy: number;
  moveProxy: number;
  noteJa: string;
}

export interface VolatilitySurfaceProxy {
  shortVolPct: number;
  longVolPct: number;
  termSkew: number;
  surfaceLevel: 'low' | 'normal' | 'elevated' | 'inverted';
  noteJa: string;
}

export interface DealerGammaProxy {
  gammaExposureScore: number;
  pinRiskProxy: number;
  volSensitivity: number;
  noteJa: string;
}

export interface EarningsDriftMetrics {
  averageDriftScore: number;
  positiveDriftPct: number;
  revisionMomentum: number;
  noteJa: string;
}

export interface MacroSurpriseScore {
  surpriseIndex: number;
  components: { labelJa: string; actual: number; expected: number; surprise: number }[];
  noteJa: string;
}

export interface NewsSentimentWeighting {
  aggregateScore: number;
  tone: SentimentTone;
  weightInRegime: number;
  sampleSize: number;
  noteJa: string;
}

export interface SectorRotationSignal {
  leaders: SectorTheme[];
  laggards: SectorTheme[];
  rotationStrength: number;
  factorRotationJa: string;
  noteJa: string;
}

export interface FlowImbalanceMetrics {
  buyPressurePct: number;
  sellPressurePct: number;
  imbalanceScore: number;
  noteJa: string;
}

export interface MarketBreadthMetrics {
  pctAboveMa50: number;
  advanceDeclineRatio: number;
  newHighLowProxy: number;
  breadthScore: number;
  noteJa: string;
}

export interface PanicEuphoriaReading {
  state: PanicEuphoriaState;
  fearGreedScore: number;
  vixProxy: number;
  noteJa: string;
}

export interface CorrelationBreakdownAlert {
  id: string;
  severity: 'watch' | 'high' | 'critical';
  titleJa: string;
  detailJa: string;
}

export interface MarketIntelligenceReport {
  generatedAt: string;
  intermarketRegime: IntermarketRegime;
  correlationMonitor: CorrelationMonitor;
  liquidityRegime: LiquidityRegimeSense;
  volSurface: VolatilitySurfaceProxy;
  dealerGamma: DealerGammaProxy;
  earningsDrift: EarningsDriftMetrics;
  macroSurprise: MacroSurpriseScore;
  newsSentiment: NewsSentimentWeighting;
  sectorRotation: SectorRotationSignal;
  flowImbalance: FlowImbalanceMetrics;
  marketBreadth: MarketBreadthMetrics;
  panicEuphoria: PanicEuphoriaReading;
  correlationAlerts: CorrelationBreakdownAlert[];
  crossAssetFlow: CrossAssetFlowSnapshot;
  regimeAlignment: {
    marketRegimeId: MarketRegimeId;
    intermarketRegimeId: IntermarketRegimeId;
    aligned: boolean;
    noteJa: string;
  };
  systemicRiskScore: number;
  executionTimingBias: number;
  healthStatus: 'green' | 'yellow' | 'red';
  verdictJa: string;
}

export interface MarketIntelligenceSnapshot {
  version: 1;
  updatedAt: string;
  averageCorrelation: number;
  pairCorrelations: Record<string, number>;
}
