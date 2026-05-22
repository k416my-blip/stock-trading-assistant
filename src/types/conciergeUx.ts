import type { ConciergeEvidenceBundle } from './conciergeEvidence';
import type { GlobalMarketAnalysisBundle } from './globalMarketAnalysis';
import type { PortfolioIntelligenceBundle } from './portfolioIntelligence';

export type ConciergeInfoPriority = 'critical' | 'high' | 'medium' | 'low';

export type ConciergeRiskColor = 'green' | 'yellow' | 'orange' | 'red';

export type ConciergeUxDisplayMode = 'beginner' | 'advanced';

export type ConciergeAiSummaryCard = {
  situationLineJa: string;
  dangerLineJa: string;
  judgmentLineJa: string;
  riskColor: ConciergeRiskColor;
  riskLabelJa: string;
};

export type ConciergeMarketRadarItem = {
  id: string;
  kind: 'sharp_drop' | 'volume_surge' | 'sentiment_anomaly' | 'vix_anomaly';
  labelJa: string;
  symbol: string | null;
  priority: ConciergeInfoPriority;
};

export type ConciergeNotificationDigest = {
  titleJa: string;
  summaryJa: string;
  itemCount: number;
  bulletsJa: string[];
};

export type ConciergeContextMemoryItem = {
  at: string;
  titleJa: string;
  whyJa: string;
  symbol: string | null;
};

export type ConciergeFocusSymbol = {
  symbol: string;
  displayLabelJa: string;
  headlineJa: string;
  riskColor: ConciergeRiskColor;
  priority: ConciergeInfoPriority;
};

export type ConciergeOneScreenSection = {
  id: 'market' | 'danger' | 'watch' | 'action';
  titleJa: string;
  linesJa: string[];
  riskColor: ConciergeRiskColor;
  priority: ConciergeInfoPriority;
};

export type ConciergeShortAnswer = {
  conclusionJa: string;
  reasonsJa: string[];
  actionJa: string;
};

export type ConciergeUxBundle = {
  generatedAt: string;
  displayMode: ConciergeUxDisplayMode;
  summary: ConciergeAiSummaryCard;
  oneScreen: ConciergeOneScreenSection[];
  radar: ConciergeMarketRadarItem[];
  digest: ConciergeNotificationDigest | null;
  contextMemory: ConciergeContextMemoryItem[];
  focusSymbol: ConciergeFocusSymbol | null;
  defaultCollapse: Record<ConciergeInfoPriority, boolean>;
};

export type BuildConciergeUxInput = {
  displayMode: ConciergeUxDisplayMode;
  marketRegimeLabel?: string | null;
  riskModeLabel?: string | null;
  evidence?: ConciergeEvidenceBundle | null;
  globalMarket?: GlobalMarketAnalysisBundle | null;
  portfolioIntel?: PortfolioIntelligenceBundle | null;
  proactiveTitles?: Array<{ titleJa: string; whyJa?: string; symbol?: string; priority?: string }>;
  degradedMode?: boolean;
};
