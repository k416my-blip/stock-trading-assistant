export type ApiCostCategory = 'openai' | 'x' | 'news' | 'market_data';

export type ApiCostEntry = {
  category: ApiCostCategory;
  at: string;
  units: number;
  labelJa: string;
};

export type ApiCostDashboard = {
  generatedAt: string;
  openAiEstimatedTokens: number;
  openAiEstimatedCostUsd: number;
  xApiCalls: number;
  newsApiCalls: number;
  marketDataCalls: number;
  last24hTotalUnits: number;
  summaryJa: string;
};

export type PerformanceCostRuntimeSnapshot = {
  appForeground: boolean;
  appStateLabel: string;
  networkPaused: boolean;
  offlineMode: boolean;
  batterySaverActive: boolean;
  animationsReduced: boolean;
  xApiPaused: boolean;
  pollingPaused: boolean;
  lastOnlineAt: string | null;
};
