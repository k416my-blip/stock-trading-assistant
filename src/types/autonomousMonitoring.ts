import type { Market } from './index';
import type { ProactiveSuggestionCandidate } from './proactiveSuggestion';

export type WatchlistPriorityTier =
  | 'portfolio_holding'
  | 'recent_viewed'
  | 'high_volatility'
  | 'unusual_activity'
  | 'market_leader';

export type HeatmapCellKind = 'danger' | 'momentum' | 'opportunity';

export type AutonomousAggressiveness = 'conservative' | 'balanced' | 'aggressive';

export type AutonomousAlertSignalKind =
  | 'price_action'
  | 'volume_spike'
  | 'sentiment_shift'
  | 'news_impact'
  | 'market_regime';

export type AutonomousWatchlistEntry = {
  symbol: string;
  market: Market;
  displayLabelJa: string;
  tier: WatchlistPriorityTier;
  tierRank: number;
  intradayChangePct: number | null;
  volumeSurgeRatio: number | null;
  monitoringScore: number;
};

export type AutonomousAlertEvaluation = {
  symbol: string;
  displayLabelJa: string;
  compositeScore: number;
  activeSignals: AutonomousAlertSignalKind[];
  signalCount: number;
  notificationWhyJa: string;
  shouldNotify: boolean;
  silentOnly: boolean;
  newsImportanceScore: number;
};

export type AutonomousAttentionItem = {
  id: string;
  headlineJa: string;
  whyJa: string;
  symbol: string | null;
  score: number;
};

export type HeatmapCell = {
  symbol: string;
  displayLabelJa: string;
  kind: HeatmapCellKind;
  intensity: number;
  labelJa: string;
};

export type PortfolioThreatWarning = {
  id: string;
  titleJa: string;
  detailJa: string;
  severity: 'high' | 'medium';
};

export type PortfolioStressMeter = {
  score: number;
  labelJa: string;
  color: 'green' | 'yellow' | 'orange' | 'red';
  factorsJa: string[];
};

export type MarketSessionBrief = {
  phase: 'open' | 'close' | 'midday';
  titleJa: string;
  bulletsJa: string[];
};

export type AutonomousDailyBriefing = {
  generatedAt: string;
  marketJa: string;
  watchJa: string[];
  risksJa: string[];
  eventsJa: string[];
};

export type AutonomousNightReview = {
  generatedAt: string;
  anomaliesJa: string[];
  predictionAccuracyJa: string | null;
  marketChangeJa: string;
};

export type AutonomousNarrative = {
  titleJa: string;
  paragraphsJa: string[];
};

export type SilentMonitoringEvent = {
  at: string;
  symbol: string | null;
  summaryJa: string;
  score: number;
};

export type AutonomousMonitoringBundle = {
  generatedAt: string;
  watchlist: AutonomousWatchlistEntry[];
  heatmap: HeatmapCell[];
  attention: AutonomousAttentionItem[];
  narrative: AutonomousNarrative;
  stressMeter: PortfolioStressMeter;
  threats: PortfolioThreatWarning[];
  sessionBrief: MarketSessionBrief | null;
  dailyBriefing: AutonomousDailyBriefing | null;
  nightReview: AutonomousNightReview | null;
  emergencyMode: boolean;
  emergencyMessageJa: string | null;
  silentModeActive: boolean;
  adaptiveFrequencyLabelJa: string;
  notifyCandidates: ProactiveSuggestionCandidate[];
  resourceNoteJa: string;
};

export type BuildAutonomousMonitoringInput = {
  holdings: Array<{ symbol: string; market: Market; shares: number }>;
  evidenceSymbols: import('./conciergeEvidence').ConciergeSymbolEvidence[];
  globalMarket: import('./globalMarketAnalysis').GlobalMarketAnalysisBundle | null;
  portfolioIntel: import('./portfolioIntelligence').PortfolioIntelligenceBundle | null;
  recentViewedSymbols: string[];
  marketLeaderSymbols: string[];
  aggressiveness: AutonomousAggressiveness;
  notificationsPaused: boolean;
  excludedSymbols: string[];
  adaptiveMultiplier: number;
  degradedMode: boolean;
  batterySaver: boolean;
  appForeground: boolean;
};
