import type { Market } from './index';
import type { StrategyAction } from './strategyExecution';

export type BrokerId = 'mock_paper' | 'ibkr' | 'alpaca' | 'rakuten' | 'bursa';

export type DeploymentEnvironment = 'simulation' | 'staging' | 'production';

export type PaperOrderSide = 'buy' | 'sell' | 'reduce';

export type PaperOrderType = 'market' | 'limit' | 'stop' | 'stop_limit';

export type PaperOrderStatus = 'pending' | 'filled' | 'partial' | 'cancelled' | 'rejected';

export type MarketSession = 'open' | 'closed' | 'premarket' | 'holiday';

export type BrokerHealth = {
  ok: boolean;
  mockMode: boolean;
  latencyMs: number;
  messageJa: string;
};

export type BrokerBalance = {
  cashMYR: number;
  buyingPowerMYR: number;
  currency: 'MYR';
};

export type BrokerPosition = {
  symbol: string;
  market: Market;
  shares: number;
  avgPrice: number;
  sectorId: string | null;
};

export type BrokerOrder = {
  id: string;
  brokerId: BrokerId;
  accountId: string;
  symbol: string;
  market: Market;
  side: PaperOrderSide;
  orderType: PaperOrderType;
  quantity: number;
  limitPrice: number | null;
  stopPrice: number | null;
  status: PaperOrderStatus;
  filledQuantity: number;
  avgFillPrice: number | null;
  commissionMYR: number;
  slippageBps: number;
  spreadBps: number;
  latencyMs: number;
  createdAt: string;
  updatedAt: string;
  rejectReasonJa: string | null;
  aiConfidencePct: number | null;
  aiAction: StrategyAction | null;
  watchOnly: boolean;
};

export type SubmitBrokerOrderInput = {
  symbol: string;
  market: Market;
  side: PaperOrderSide;
  orderType?: PaperOrderType;
  quantity: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  referencePrice: number;
  sectorId?: string | null;
  aiConfidencePct?: number;
  aiAction?: StrategyAction;
  spreadBpsEstimate?: number;
  volatilityPct?: number;
  humanConfirmed?: boolean;
};

export type SubmitBrokerOrderResult =
  | { ok: true; order: BrokerOrder; simulationNoteJa: string }
  | { ok: false; errorJa: string; blocked?: boolean };

export type BrokerAdapter = {
  id: BrokerId;
  labelJa: string;
  mockMode: true;
  healthCheck: () => Promise<BrokerHealth>;
  getBalance: (accountId: string) => Promise<BrokerBalance>;
  getPositions: (accountId: string) => Promise<BrokerPosition[]>;
  getOrders: (accountId: string) => Promise<BrokerOrder[]>;
  submitOrder: (accountId: string, input: SubmitBrokerOrderInput) => Promise<SubmitBrokerOrderResult>;
  cancelOrder: (accountId: string, orderId: string) => Promise<{ ok: boolean; errorJa?: string }>;
};

export type PaperTradeJournalEntry = {
  id: string;
  at: string;
  symbol: string;
  side: PaperOrderSide;
  actionJa: string;
  outcomeJa: string;
  aiWhyJa: string | null;
  confidencePct: number | null;
};

export type EquityTimelinePoint = {
  at: string;
  equityMYR: number;
  drawdownPct: number;
};

export type ExecutionDashboardBundle = {
  generatedAt: string;
  regulatoryBannerJa: string;
  deploymentEnv: DeploymentEnvironment;
  realTradingEnabled: false;
  brokerId: BrokerId;
  brokerHealth: BrokerHealth;
  marketSession: MarketSession;
  marketSessionJa: string;
  killSwitchActive: boolean;
  newOrdersBlockedJa: string | null;
  balance: BrokerBalance;
  openOrders: BrokerOrder[];
  recentOrders: BrokerOrder[];
  positions: BrokerPosition[];
  totalPnLMYR: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  winRatePct: number | null;
  sharpeEstimate: number | null;
  avgLatencyMs: number;
  sectorExposure: Array<{ sectorId: string; pct: number }>;
  symbolExposure: Array<{ symbol: string; pct: number }>;
  trustScore: number | null;
  journalRecent: PaperTradeJournalEntry[];
  realityGapSummaryJa: string | null;
  replayPreviewJa: string | null;
  rebalanceNoteJa: string | null;
  exitAlertsJa: string[];
  safetyChecksJa: string[];
  /** Capital Allocation 層からの要約（任意） */
  capitalAllocationSummary?: {
    availableBuyingPowerMYR: number;
    reservedCashMYR: number;
    usableCashMYR: number;
    proposedAllocationMYR: number;
    remainingCashMYR: number;
  };
  capitalSizingLineJa?: string;
};

export type PaperBrokerPersisted = {
  version: 1;
  config: {
    realTradingEnabled: false;
    deploymentEnv: DeploymentEnvironment;
    activeBrokerId: BrokerId;
    killSwitch: boolean;
    pinEnabled: boolean;
    humanConfirmRequired: boolean;
    maxDrawdownPct: number;
    maxSymbolExposurePct: number;
    maxSectorExposurePct: number;
    cooldownMs: number;
  };
  accounts: Array<{
    id: string;
    labelJa: string;
    initialCapitalMYR: number;
    cashMYR: number;
    positions: BrokerPosition[];
  }>;
  orders: BrokerOrder[];
  journal: PaperTradeJournalEntry[];
  equityTimeline: EquityTimelinePoint[];
  cooldownUntilBySymbol: Record<string, number>;
  lastRevengeTradeAt: number | null;
};
