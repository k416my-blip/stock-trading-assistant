import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../constants/notifications';
import type { AlertPayload } from '../services/alertEngine';
import type { AnalysisApiKeys } from '../services/analysisApiKeys';
import type { AiApiConnectionTestResult } from '../types/aiStrategy';
import { clearAiChatHistory } from '../services/aiChatHistoryStorage';
import {
  DEFAULT_AI_PREFERENCES,
  loadAiPreferences,
  saveAiPreferences as persistAiPreferences,
} from '../services/aiPreferencesStorage';
import {
  apiHealthSummaryForConcierge,
  buildApiHealthDashboard,
} from '../services/apiHealthDashboard';
import { createEmptyHealthSnapshot } from '../services/apiHealthStorage';
import { buildAiStrategyContext, sendAiStrategyChat } from '../services/aiStrategyService';
import { buildXConciergeContextForMessage } from '../services/xApiConciergeContext';
import { logXBearerEnvAtStartup } from '../services/xBearerToken';
import type { ApiHealthDashboard, ApiProviderHealth, ApiProviderId } from '../types/apiSetup';
import { resetAiLearningStorage, type AiLearningState } from '../services/analysis/aiLearning';
import { MARKET_DATA_MESSAGES } from '../constants/marketData';
import { resetPortfolioRefreshCoordinator } from '../services/portfolioRefreshCoordinator';
import { getActivePortfolio } from '../services/portfolioPriceUpdate';
import type { ManualOrderConfirmInput } from '../services/manualOrderConfirmation';
import {
  PriceSyncProvider,
  type PriceSyncActionsContextValue,
  type PriceSyncStateContextValue,
} from './PriceSyncContext';
import { useContextValueTrace } from '../utils/renderDiagnostics';
import {
  initNotificationService,
  presentLocalNotification,
} from '../services/notificationService';
import { areNotificationsSupported } from '../utils/runtimeEnvironment';
import { calculateBuyingPower } from '../services/buyingPower';
import {
  candidatesToManualBuyItems,
  executePracticeSellAll,
  MANUAL_ORDER_METHOD,
} from '../services/allocationActions';
import { toMYR } from '../services/fx';
import {
  calculatePracticeStats,
  addVirtualDeposit,
  createDefaultPracticeState,
  resetPractice,
  setVirtualCapital,
} from '../services/practice';
import {
  buildManualSellAllItems,
  buildManualSellAllResult,
  buildSellAllLineItem,
  buildSellAllManualAlert,
  buildSellAllPracticeAlert,
  estimateProceedsMYR,
  executePracticeSellAllHoldings,
  MANUAL_SELL_ORDER_METHOD,
} from '../services/sellAllHoldings';
import {
  appendPerformanceSnapshot,
  applyTradeToPortfolio,
  portfolioMarketValueMYR,
  removePortfolioPosition,
  updatePositionCurrentPrice,
  updatePositionMarket,
  updatePositionSymbol,
} from '../services/portfolio';
import { runDailyHealthCheck, type HealthCheckReport } from '../services/dailyHealthCheckService';
import {
  appendExecutionJournalEntry,
  loadExecutionJournal,
  resetExecutionJournalMemoryForTest,
} from '../services/executionJournalStorage';
import {
  applyPersonalBackupToState,
  exportPersonalBackupJson,
  validatePersonalBackupJson,
} from '../services/personalBackupService';
import {
  getPersonalKillSwitchesSnapshot,
  loadPersonalKillSwitches,
  resetPersonalKillSwitchesForReset,
  resetMarketDataRequestQueue,
  savePersonalKillSwitches,
  type PersonalKillSwitches,
} from '../services/personalKillSwitches';
import { executePracticeBulkBuy, type BulkBuyDebugInfo } from '../services/practiceBulkBuy';
import { evaluateCrossAssetLiquidityFlow } from '../services/crossAssetLiquidityFlowEngine';
import { enrichInstitutionalRiskWithBehavioral } from '../services/behavioralRiskOrchestratorService';
import { loadOperatorBehaviorState, recordTradeOutcomeForBehavior } from '../services/behavioralRiskStorage';
import { enrichInstitutionalRiskWithMetaCapital } from '../services/metaCapitalOrchestratorService';
import { loadMetaCapitalState } from '../services/metaCapitalStorage';
import { enrichInstitutionalRiskWithModelStability } from '../services/modelStabilityOrchestratorService';
import { loadModelStabilityState } from '../services/modelStabilityStorage';
import { buildInstitutionalRiskInputFromApp } from '../services/institutionalRiskControlEngine';
import { evaluateMarketRegime } from '../services/marketRegimeEngine';
import { hydrateBursaFormatCache, resetBursaFormatCacheForReset } from '../services/bursaSymbolFormat';
import {
  hydrateMarketDataDiagnostics,
  recordRefreshSessionEnd,
  recordRefreshSessionStart,
  resetMarketDataDiagnostics,
} from '../services/marketDataDiagnostics';
import { resetQuoteCacheForReset } from '../services/quoteCache';
import { resetYahooSymbolAliasCacheForReset } from '../services/yahooSymbolAliasCache';
import {
  getRecoveryRecommendations,
  type EnvironmentIssue,
} from '../services/environmentValidation';
import { type BootMode } from '../services/safeBoot';
import {
  countDiagnosticsBySeverity,
  clearDiagnosticEvents,
  exportDiagnosticsReport,
} from '../services/structuredDiagnostics';
import {
  clearAllPersistedAppData,
  createDefaultAppState,
} from '../services/storage';
import { useAppBoot } from './app/useAppBoot';
import { useAppNotifications } from './app/useAppNotifications';
import { useAppPersistence } from './app/useAppPersistence';
import { useAppPortfolioActions } from './app/useAppPortfolioActions';
import { useAppApiKeys } from './app/useAppApiKeys';
import type { ExecutionLedgerMode } from '../types/execution';
import type { PriceRefreshOptions } from '../types/marketData';
import type { CrossAssetFlowSnapshot } from '../types/crossAssetFlow';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { ConciergeSessionMemory } from '../types/aiConciergeSession';
import type { AiPreferences, AiRequestStatus, AiStrategyChatResult } from '../types/aiStrategy';
import type { ManualHoldingInput } from '../services/portfolioHoldings';
import type {
  AllocationPlan,
  AppMode,
  AppState,
  DepositPlan,
  DividendRecord,
  Market,
  NotificationSettings,
  PracticeStats,
  PortfolioPosition,
  RankedStock,
  SellAllLineItem,
  SellAllResult,
  TradeRecord,
  UserSettings,
} from '../types';
import type { PortfolioPriceSyncState, PriceSyncResult } from '../types/marketData';

const EMPTY_STATE: AppState = {
  appMode: 'manual',
  settings: {
    totalCapitalMYR: 0,
    riskPerTradePct: 1,
    selectedMarket: 'bursa',
    accountType: 'cash_upfront',
    priceRefreshMinutes: 15,
  },
  practice: createDefaultPracticeState(),
  deposits: [],
  portfolio: [],
  trades: [],
  dividends: [],
  performanceHistory: [],
  manualOrderList: [],
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
  notificationHistory: [],
  notificationCooldowns: {},
};

interface AppContextValue {
  state: AppState;
  loading: boolean;
  isPractice: boolean;
  practiceStats: PracticeStats;
  buyingPower: ReturnType<typeof calculateBuyingPower>;
  setAppMode: (mode: AppMode) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  addDeposit: (deposit: Omit<DepositPlan, 'id'>) => void;
  toggleDepositCompleted: (id: string) => void;
  addTrade: (trade: Omit<TradeRecord, 'id'>) => Promise<{ ok: boolean; error?: string }>;
  addPracticeTrade: (trade: Omit<TradeRecord, 'id'>) => Promise<{ ok: boolean; error?: string }>;
  submitTradeWithExecutionSafety: (
    trade: Omit<TradeRecord, 'id'>,
    ledgerMode: ExecutionLedgerMode,
  ) => Promise<{ ok: boolean; error?: string; uncertain?: boolean; duplicate?: boolean }>;
  addManualHolding: (
    input: ManualHoldingInput,
  ) => Promise<{ ok: boolean; error?: string }>;
  setPracticeVirtualCapital: (amountMYR: number) => void;
  addPracticeDeposit: (amountMYR: number) => void;
  resetPracticeAccount: () => void;
  addDividend: (dividend: Omit<DividendRecord, 'id'>) => void;
  applyAllocationPractice: (plan: AllocationPlan) => Promise<{
    ok: boolean;
    error?: string;
    boughtCount?: number;
    skipped?: string[];
    partialSkipMessage?: string;
    debug?: BulkBuyDebugInfo;
  }>;
  reloadHoldingsFromStorage: () => Promise<void>;
  portfolioRevision: number;
  addAllocationToManualOrderList: (plan: AllocationPlan) => { ok: boolean; error?: string; addedCount?: number };
  addManualSellFromHolding: (position: PortfolioPosition, name: string, currentPrice: number) => void;
  practiceSellAll: (position: PortfolioPosition, name: string, currentPrice: number) => { ok: boolean; error?: string };
  practiceSellAllHoldings: (
    sells: Array<{ position: PortfolioPosition; name: string; sellPrice: number }>,
  ) => { ok: boolean; result?: SellAllResult; error?: string };
  addManualSellAllChecklist: (
    entries: Array<{ position: PortfolioPosition; name: string; currentPrice: number }>,
    skipped: SellAllLineItem[],
  ) => SellAllResult;
  confirmManualOrderAsExecuted: (
    orderId: string,
    input: ManualOrderConfirmInput,
  ) => Promise<{ ok: boolean; error?: string }>;
  clearCompletedManualOrders: () => void;
  updateNotificationSettings: (partial: Partial<NotificationSettings>) => void;
  dispatchAlert: (payload: AlertPayload) => Promise<boolean>;
  dispatchAlerts: (payloads: AlertPayload[]) => Promise<void>;
  sendTestNotification: () => Promise<void>;
  clearNotificationHistory: () => void;
  requestNotificationsPermission: () => Promise<boolean>;
  updateHoldingCurrentPrice: (positionId: string, currentPrice: number) => { ok: boolean; error?: string };
  updateHoldingSymbol: (positionId: string, symbol: string) => { ok: boolean; error?: string };
  updateHoldingMarket: (positionId: string, market: Market) => { ok: boolean; error?: string };
  twelveDataApiKey: string;
  analysisApiKeys: AnalysisApiKeys;
  aiLearningState: AiLearningState;
  saveAnalysisApiKeys: (keys: Partial<AnalysisApiKeys>) => Promise<void>;
  refresh: () => Promise<void>;
  resetAllAppData: (clearApiKeys: boolean) => Promise<{ failedKeys: string[] }>;
  addScreenerCandidateToManualList: (stock: RankedStock) => { ok: boolean; error?: string };
  marketRegime: MarketRegimeResult;
  crossAssetFlow: CrossAssetFlowSnapshot;
  refreshMarketRegime: () => void;
  bootMode: BootMode;
  securityWarnings: string[];
  enterSafeBootMode: () => void;
  clearSensitiveLocalData: () => Promise<void>;
  degradedMode: boolean;
  recoveryRecommendations: string[];
  environmentIssues: EnvironmentIssue[];
  diagnosticsReportJson: () => string;
  killSwitches: PersonalKillSwitches;
  setKillSwitch: (partial: Partial<Omit<PersonalKillSwitches, 'version'>>) => Promise<void>;
  runHealthCheck: () => Promise<HealthCheckReport>;
  healthReport: HealthCheckReport | null;
  exportBackupJson: () => Promise<string>;
  importBackupFromJson: (raw: string) => Promise<{ ok: boolean; error?: string }>;
  restoreLastHealthySnapshot: () => Promise<{ ok: boolean; message: string }>;
  resetRequestQueue: () => void;
  removeHolding: (positionId: string) => Promise<{ ok: boolean; error?: string; canUndo?: boolean }>;
  undoLastHoldingRemoval: () => void;
  readOnlyBlockedMessage: string | null;
  aiApiKey: string;
  aiPreferences: AiPreferences;
  saveAiApiKey: (apiKey: string) => Promise<void>;
  testAiApiConnection: () => Promise<AiApiConnectionTestResult>;
  saveAiPreferences: (partial: Partial<AiPreferences>) => Promise<AiPreferences>;
  sendAiStrategyMessage: (
    userMessage: string,
    options?: {
      signal?: AbortSignal;
      onRequestStatus?: (status: AiRequestStatus) => void;
      sessionMemory?: ConciergeSessionMemory;
    },
  ) => Promise<AiStrategyChatResult>;
  clearAiChatHistory: () => Promise<void>;
  dataResetRevision: number;
  apiHealthDashboard: ApiHealthDashboard;
  refreshApiHealth: () => Promise<void>;
  saveWizardApiKeyAndVerify: (providerId: ApiProviderId, apiKey: string) => Promise<ApiProviderHealth>;
  verifyWizardApiProvider: (providerId: ApiProviderId, apiKey: string) => Promise<ApiProviderHealth>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [twelveDataApiKey, setTwelveDataApiKey] = useState('');
  const [analysisApiKeys, setAnalysisApiKeys] = useState<AnalysisApiKeys>({
    newsApiKey: '',
    snsApiKey: '',
    earningsApiKey: '',
    redditApiKey: '',
    xApiKey: '',
  });
  const [apiHealthDashboard, setApiHealthDashboard] = useState<ApiHealthDashboard>(() =>
    buildApiHealthDashboard(createEmptyHealthSnapshot()),
  );
  const [aiLearningState, setAiLearningState] = useState<AiLearningState>(() => ({
    weights: { technical: 0.25, fundamental: 0.25, news: 0.15, earnings: 0.15, sns: 0.1, risk: 0.1 },
    outcomes: [],
    lastUpdatedAt: '',
  }));
  const [priceSync, setPriceSync] = useState<PortfolioPriceSyncState>({
    loading: false,
    marketClosedHint: false,
  });
  const priceSyncRef = useRef(priceSync);
  priceSyncRef.current = priceSync;
  const [portfolioRevision, setPortfolioRevision] = useState(0);
  const [regimeRevision, setRegimeRevision] = useState(0);
  const [dataResetRevision, setDataResetRevision] = useState(0);
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiPreferences, setAiPreferences] = useState<AiPreferences>({ ...DEFAULT_AI_PREFERENCES });
  const undoRemovalRef = useRef<{
    position: PortfolioPosition;
    ledger: 'manual' | 'practice';
  } | null>(null);
  const stateRef = useRef(state);
  const lastPersistedRef = useRef<AppState | null>(null);
  const blockEmptyBootPersistenceRef = useRef<string | null>(null);
  const initialPriceRefreshDone = useRef(false);
  stateRef.current = state;

  const boot = useAppBoot({
    setState,
    setLoading,
    setTwelveDataApiKey,
    setAnalysisApiKeys,
    setAiLearningState,
    setAiApiKey,
    setAiPreferences,
    setApiHealthDashboard,
    twelveDataApiKey,
    blockEmptyBootPersistenceRef,
    lastPersistedRef,
    stateRef,
    setPortfolioRevision,
  });

  const {
    bootMode,
    securityWarnings,
    recoveryRecommendations,
    environmentIssues,
    killSwitches,
    healthReport,
    enterSafeBootMode,
    clearSensitiveLocalData,
    refresh,
    diagnosticsReportJson,
    degradedMode,
    readOnlyBlockedMessage,
    setKillSwitch,
    runHealthCheck,
    exportBackupJson,
    importBackupFromJson,
    restoreLastHealthySnapshot,
    resetRequestQueue,
    setBootMode,
    setSecurityWarnings,
    setRecoveryRecommendations,
    setEnvironmentIssues,
    setKillSwitches,
    setHealthReport,
  } = boot;

  const {
    updateNotificationSettings,
    dispatchAlert,
    dispatchAlerts,
    sendTestNotification,
    clearNotificationHistory,
    requestNotificationsPermission,
  } = useAppNotifications({ stateRef, setState });

  const apiKeys = useAppApiKeys({
    stateRef,
    setState,
    lastPersistedRef,
    initialPriceRefreshDone,
    loading,
    setPortfolioRevision,
    setPriceSync,
    dispatchAlert,
    twelveDataApiKey,
    setTwelveDataApiKey,
    analysisApiKeys,
    setAnalysisApiKeys,
    aiApiKey,
    setAiApiKey,
    apiHealthDashboard,
    setApiHealthDashboard,
  });

  const {
    reloadTwelveDataApiKeyFromStorage,
    saveTwelveDataApiKey,
    saveAnalysisApiKeys,
    testApiConnection,
    refreshPortfolioPrices,
    saveAiApiKey,
    runTestAiApiConnection,
    refreshApiHealth,
    saveWizardApiKeyAndVerify,
    verifyWizardApiProvider,
    syncPriceSyncForEmptyHoldings,
  } = apiKeys;

  useEffect(() => {
    if (loading || !areNotificationsSupported()) return;
    void initNotificationService();
  }, [loading]);

  useAppPersistence({
    state,
    setState,
    loading,
    lastPersistedRef,
    blockEmptyBootPersistenceRef,
  });

  const isPractice = state.appMode === 'practice';
  const buyingPower = useMemo(() => calculateBuyingPower(state), [state]);
  const practiceStats = useMemo(() => calculatePracticeStats(state.practice), [state.practice]);

  const marketRegime = useMemo(
    () => evaluateMarketRegime(),
    [loading, regimeRevision, portfolioRevision],
  );

  const crossAssetFlow = useMemo(
    () => evaluateCrossAssetLiquidityFlow(marketRegime.indicators),
    [loading, regimeRevision, portfolioRevision, marketRegime.indicators],
  );

  const refreshMarketRegime = useCallback(() => {
    setRegimeRevision((v) => v + 1);
  }, []);

  const portfolioActions = useAppPortfolioActions({
    setState,
    stateRef,
    lastPersistedRef,
    undoRemovalRef,
    setPortfolioRevision,
    marketRegime,
    aiLearningState,
  });

  const {
    setAppMode,
    updateSettings,
    addDeposit,
    toggleDepositCompleted,
    addTrade,
    addPracticeTrade,
    submitTradeWithExecutionSafety,
    addManualHolding,
    setPracticeVirtualCapital,
    addPracticeDeposit,
    resetPracticeAccount,
    addDividend,
    applyAllocationPractice,
    reloadHoldingsFromStorage,
    addAllocationToManualOrderList,
    addManualSellFromHolding,
    practiceSellAll,
    practiceSellAllHoldings,
    addManualSellAllChecklist,
    confirmManualOrderAsExecuted,
    clearCompletedManualOrders,
    addScreenerCandidateToManualList,
    updateHoldingCurrentPrice,
    updateHoldingSymbol,
    updateHoldingMarket,
    removeHolding,
    undoLastHoldingRemoval,
  } = portfolioActions;

  const saveAiPreferences = useCallback(async (partial: Partial<AiPreferences>) => {
    const next = await persistAiPreferences(partial);
    setAiPreferences(next);
    return next;
  }, []);

  const sendAiStrategyMessage = useCallback(
    async (
      userMessage: string,
      options?: {
        signal?: AbortSignal;
        onRequestStatus?: (status: AiRequestStatus) => void;
        sessionMemory?: ConciergeSessionMemory;
      },
    ): Promise<AiStrategyChatResult> => {
      const current = stateRef.current;
      const diagReport = exportDiagnosticsReport(50);
      const apiDash = apiHealthDashboard;
      const holdings = (isPractice ? current.practice.portfolio : current.portfolio)
        .filter((p) => (p.shares ?? 0) > 0)
        .map((p) => ({ symbol: p.symbol, market: p.market }));
      const xCtx = await buildXConciergeContextForMessage(
        userMessage,
        holdings,
        analysisApiKeys,
      );
      const { buildConciergeEvidenceBundle } = await import('../services/conciergeEvidenceBuilder');
      let evidenceData = await buildConciergeEvidenceBundle({
        state: current,
        userMessage,
        apiKeys: analysisApiKeys,
        analysisMode: aiPreferences.aiAnalysisMode,
      });
      let dataReliability = null;
      if (aiPreferences.dataReliabilityEnabled) {
        const { refreshDataReliabilityBundle } = await import('../services/dataReliabilityEngine');
        const { applyDataReliabilityToEvidence } = await import(
          '../services/dataReliabilityIntegration'
        );
        dataReliability = await refreshDataReliabilityBundle({
          symbols: evidenceData.symbols,
          apiHealth: apiDash,
        });
        evidenceData = applyDataReliabilityToEvidence(evidenceData, dataReliability);
      }
      const { buildGlobalMarketAnalysis } = await import('../services/marketRegimeConciergeEngine');
      const globalMarketAnalysis = await buildGlobalMarketAnalysis();
      const { buildPortfolioIntelligenceBundle, recordIntelligenceFromAiTurn } = await import(
        '../services/portfolioIntelligenceBuilder'
      );
      const portfolioIntelligence = await buildPortfolioIntelligenceBundle({
        state: current,
        userMessage,
        actionGuide: evidenceData.actionGuide,
        symbols: evidenceData.symbols.map((s) => ({
          symbol: s.symbol,
          market: s.market,
        })),
        currentAnalysisMode: aiPreferences.aiAnalysisMode,
      });
      let context = await buildAiStrategyContext({
        state: current,
        appMode: current.appMode,
        marketRegime,
        healthReport,
        degradedMode,
        bootMode,
        securityWarnings,
        recoveryRecommendations,
        killSwitches,
        priceSync: priceSyncRef.current,
        diagnosticsSummary: diagReport.summary,
        diagnosticsSeverity: countDiagnosticsBySeverity(),
        userMessage,
        aiExplanationLevel: aiPreferences.aiExplanationLevel,
        apiHealthSummaryJa: apiHealthSummaryForConcierge(apiDash),
        apiHealthDegraded: apiDash.degradedByApis,
        apiHealthOpenAiStatusJa: apiDash.openAiLabelJa,
        apiHealthNewsStatusJa: apiDash.newsLabelJa,
        apiHealthAnyQuotaLimited: apiDash.anyQuotaLimited,
        apiHealthAnyStaleWarning: apiDash.anyStaleWarning,
        sessionMemory: options?.sessionMemory,
        xSocialBriefJa: xCtx.xSocialBriefJa,
        xApiUsageSummaryJa: xCtx.xApiUsageSummaryJa,
        evidenceData,
        globalMarketAnalysis,
        portfolioIntelligence,
        aiAnalysisMode: aiPreferences.aiAnalysisMode,
        conciergeUxMode: aiPreferences.conciergeUxMode,
        dataReliability: dataReliability ?? undefined,
      });
      if (dataReliability) {
        const { attachDataReliabilityToContext } = await import(
          '../services/dataReliabilityIntegration'
        );
        context = attachDataReliabilityToContext(context, dataReliability);
      }
      if (aiPreferences.portfolioRiskExposureEnabled) {
        const { refreshPortfolioRiskExposureBundle } = await import(
          '../services/portfolioRiskExposureEngine'
        );
        const { attachPortfolioRiskToContext } = await import(
          '../services/portfolioRiskExposureIntegration'
        );
        const { portfolioMarketValueMYR } = await import('../services/portfolio');
        const { calculatePracticeStats } = await import('../services/practice');
        const holdingsFull = getActivePortfolio(current);
        const priceMap: Record<string, number> = {};
        for (const s of evidenceData.symbols) {
          if (s.currentPrice != null && s.currentPrice > 0) {
            priceMap[s.symbol] = s.currentPrice;
          }
        }
        const practiceStats =
          current.appMode === 'practice' ? calculatePracticeStats(current.practice) : null;
        const symbolDataQuality: Record<string, number> = {};
        const evidenceThinSymbols: string[] = [];
        if (dataReliability) {
          for (const s of dataReliability.symbols) {
            symbolDataQuality[s.symbol.toUpperCase()] = s.dataQualityScore;
            if (s.dataQualityScore < 50) evidenceThinSymbols.push(s.symbol);
          }
        }
        const riskBundle = await refreshPortfolioRiskExposureBundle({
          holdings: holdingsFull,
          totalValueMYR: portfolioMarketValueMYR(current),
          cashMYR: practiceStats?.cashBalanceMYR ?? 0,
          priceBySymbol: priceMap,
          macroBundle: null,
          selfEvalBundle: null,
          dataReliabilityBundle: dataReliability,
          realityBundle: null,
          executionBundle: null,
          evidenceThinSymbols,
          symbolDataQuality,
          portfolioIntelConcentration: portfolioIntelligence.portfolioRisk.concentrationScore,
        });
        context = attachPortfolioRiskToContext(context, riskBundle);
      }
      if (aiPreferences.capitalAllocationEnabled) {
        const { refreshCapitalAllocationBundle } = await import(
          '../services/capitalAllocationEngine'
        );
        const { attachCapitalAllocationToContext } = await import(
          '../services/capitalAllocationIntegration'
        );
        const { portfolioMarketValueMYR } = await import('../services/portfolio');
        const { calculateBuyingPower } = await import('../services/buyingPower');
        const { calculatePracticeStats } = await import('../services/practice');
        const holdingsFull = getActivePortfolio(current);
        const priceMap: Record<string, number> = {};
        for (const s of evidenceData.symbols) {
          if (s.currentPrice != null && s.currentPrice > 0) {
            priceMap[s.symbol] = s.currentPrice;
          }
        }
        const practiceStats =
          current.appMode === 'practice' ? calculatePracticeStats(current.practice) : null;
        const totalMYR = portfolioMarketValueMYR(current);
        let availableCashMYR = practiceStats?.cashBalanceMYR ?? calculateBuyingPower(current).buyingPowerMYR;
        const capitalBundle = await refreshCapitalAllocationBundle({
          regimeId: globalMarketAnalysis.regimeId,
          tacticalMode: aiPreferences.strategyTacticalMode,
          beginnerMode: aiPreferences.conciergeUxMode === 'beginner',
          availableCashMYR,
          totalEquityMYR: totalMYR + availableCashMYR,
          priceBySymbol: priceMap,
          strategyBundle: null,
          executionBundle: null,
          portfolioRiskBundle: context.portfolioRiskExposure ?? null,
          macroBundle: null,
          drawdownPct: undefined,
        });
        context = attachCapitalAllocationToContext(context, capitalBundle);
      }
      if (aiPreferences.systemStabilityIntegrityEnabled !== false) {
        const { buildSystemStabilityIntegrityBundle, countZombiePaperOrders } = await import(
          '../services/systemStabilityIntegrityEngine'
        );
        const { attachSystemStabilityToContext, getDuplicateRefreshBlockedCount, isProactiveRefreshInFlight } =
          await import('../services/systemStabilityIntegrityIntegration');
        const { buildSnapshot } = await import(
          '../services/productionStability/productionStabilityRuntime'
        );
        const { runStorageIntegrityCheck } = await import(
          '../services/productionStability/storageIntegrity'
        );
        const { getPersonalKillSwitchesSnapshot } = await import('../services/personalKillSwitches');
        const ks = getPersonalKillSwitchesSnapshot();
        const storageOk = (await runStorageIntegrityCheck()).ok;
        const integrity = buildSystemStabilityIntegrityBundle({
          productionSnapshot: buildSnapshot(),
          layerEnabled: {
            macro: aiPreferences.macroIntelligenceEnabled,
            data_reliability: aiPreferences.dataReliabilityEnabled,
            strategy: aiPreferences.strategyExecutionEnabled,
            reality: aiPreferences.realityValidationEnabled,
            execution: aiPreferences.paperBrokerEnabled,
            self_eval: aiPreferences.selfEvaluationEnabled,
            portfolio_risk: aiPreferences.portfolioRiskExposureEnabled,
            capital: aiPreferences.capitalAllocationEnabled,
          },
          layers: {
            macro: null,
            dataReliability: dataReliability,
            capitalAllocation: context.capitalAllocation ?? null,
            execution: null,
            portfolioRisk: context.portfolioRiskExposure ?? null,
            strategy: null,
            reality: null,
            selfEvaluation: null,
          },
          proactiveRefreshInFlight: isProactiveRefreshInFlight(),
          duplicateRefreshBlocked: getDuplicateRefreshBlockedCount() > 0,
          staleHoldingsCount: context.staleHoldingsCount,
          priceSyncStale:
            priceSyncRef.current.displayStatus === 'cached' ||
            priceSyncRef.current.displayStatus === 'connection_failed' ||
            priceSyncRef.current.lastError != null,
          readOnlyMode: ks.readOnlyMode,
          degradedMode: degradedMode || ks.readOnlyMode,
          storageIntegrityOk: storageOk,
          zombieOrderCount: await countZombiePaperOrders(),
          proactiveQueueSize: 0,
        });
        context = attachSystemStabilityToContext(context, integrity);
      }
      if (aiPreferences.aiGovernanceDecisionEnabled !== false) {
        const { buildAiGovernanceDecisionBundle, collectStaleGovernanceLayerIds } = await import(
          '../services/aiGovernanceDecisionEngine'
        );
        const { attachAiGovernanceToContext } = await import(
          '../services/aiGovernanceDecisionIntegration'
        );
        const { loadAiGovernanceState, countRecentAuditFlips } = await import(
          '../services/aiGovernanceDecisionStorage'
        );
        const govPersisted = await loadAiGovernanceState();
        const layerInput = {
          systemStability: context.systemStabilityIntegrity ?? null,
          portfolioRisk: context.portfolioRiskExposure ?? null,
          dataReliability: dataReliability,
          macro: null,
          execution: null,
          capitalAllocation: context.capitalAllocation ?? null,
          strategy: null,
        };
        const governance = await buildAiGovernanceDecisionBundle({
          ...layerInput,
          humanGovernanceOverride: govPersisted.humanOverride,
          portfolioHumanRiskOverride: context.portfolioRiskExposure?.humanOverride ?? null,
          staleLayerIds: collectStaleGovernanceLayerIds(layerInput),
          lastAudit: govPersisted.auditTrail[govPersisted.auditTrail.length - 1] ?? null,
          recentAuditFlipCount: countRecentAuditFlips(govPersisted.auditTrail, 10 * 60 * 1000),
        });
        context = attachAiGovernanceToContext(context, governance);
      }
      if (aiPreferences.reactiveEventOrchestrationEnabled !== false) {
        const { buildReactiveEventOrchestrationBundle } = await import(
          '../services/reactiveEventOrchestrationEngine'
        );
        const { attachReactiveOrchestrationToContext, setOrchestrationRuntimeContext } =
          await import('../services/reactiveEventOrchestrationIntegration');
        const { getRenderBudgetInFlight, getRenderBudgetBlockedCount } = await import(
          '../services/productionStability/renderBudget'
        );
        const { RENDER_BUDGET_MAX_CONCURRENT } = await import('../constants/productionStability');
        setOrchestrationRuntimeContext({
          appForeground: true,
          batterySaver: aiPreferences.batterySaverEnabled,
          memoryPressure: false,
        });
        const reactive = buildReactiveEventOrchestrationBundle({
          batterySaverEnabled: aiPreferences.batterySaverEnabled,
          appForeground: true,
          memoryPressure: false,
          renderBudgetInFlight: getRenderBudgetInFlight(),
          renderBudgetBlocked: getRenderBudgetBlockedCount(),
          renderBudgetMax: RENDER_BUDGET_MAX_CONCURRENT,
        });
        context = attachReactiveOrchestrationToContext(context, reactive);
      }
      if (aiPreferences.explainableCognitiveTraceEnabled !== false) {
        const { buildExplainableCognitiveTraceBundle } = await import(
          '../services/explainableCognitiveTraceEngine'
        );
        const { attachExplainableCognitiveTraceToContext } = await import(
          '../services/explainableCognitiveTraceIntegration'
        );
        const { loadCognitiveTraceState } = await import(
          '../services/explainableCognitiveTraceStorage'
        );
        const tracePersisted = await loadCognitiveTraceState();
        const ps = priceSyncRef.current;
        const priceSyncStatusJa =
          ps.displayStatus === 'complete'
            ? '取得完了'
            : ps.displayStatus === 'cached'
              ? 'キャッシュ'
              : ps.displayStatus === 'partial_failure'
                ? '一部失敗'
                : ps.displayStatus === 'connection_failed'
                  ? ps.connectionDetail ?? MARKET_DATA_MESSAGES.connectionFailed
                  : ps.displayStatus === 'fetching'
                    ? '取得中'
                    : String(ps.displayStatus ?? 'idle');
        const trace = await buildExplainableCognitiveTraceBundle({
          governance: context.aiGovernanceDecision ?? null,
          stability: context.systemStabilityIntegrity ?? null,
          reactive: context.reactiveEventOrchestration ?? null,
          dataReliability: dataReliability,
          macro: null,
          portfolioRisk: context.portfolioRiskExposure ?? null,
          capital: context.capitalAllocation ?? null,
          execution: null,
          strategy: null,
          marketContext: {
            priceSyncStatusJa,
            symbols: (evidenceData.symbols ?? []).slice(0, 8).map((s) => ({
              symbol: s.symbol,
              intradayChangePct: s.intradayChangePct ?? null,
              dataQualityScore: dataReliability?.globalDataQualityScore ?? null,
              stale: s.quoteIsStale,
            })),
            volatilityNoteJa: context.globalMarketAnalysis.regimeId,
          },
          stateFingerprintJa: JSON.stringify({
            regime: context.globalMarketAnalysis.regimeId,
            holdings: context.holdings.length,
          }),
          previousRecommendations: tracePersisted.lastRecommendations,
          previousExplainableScore: tracePersisted.lastExplainableScore,
        });
        context = attachExplainableCognitiveTraceToContext(context, trace);
      }
      if (aiPreferences.adaptiveResourceComputeBudgetEnabled !== false) {
        const { buildAdaptiveResourceComputeBudgetBundle } = await import(
          '../services/adaptiveResourceComputeBudgetEngine'
        );
        const { attachAdaptiveResourceToContext } = await import(
          '../services/adaptiveResourceComputeBudgetIntegration'
        );
        const { getRenderBudgetInFlight, getRenderBudgetBlockedCount } = await import(
          '../services/productionStability/renderBudget'
        );
        const { RENDER_BUDGET_MAX_CONCURRENT } = await import('../constants/productionStability');
        const { getPerformanceCostSnapshot } = await import('../services/performanceCostRuntime');
        const perf = getPerformanceCostSnapshot();
        const resource = await buildAdaptiveResourceComputeBudgetBundle({
          batterySaverEnabled: aiPreferences.batterySaverEnabled,
          appForeground: perf.appForeground,
          memoryPressure: false,
          offlineMode: perf.offlineMode,
          renderBudgetInFlight: getRenderBudgetInFlight(),
          renderBudgetMax: RENDER_BUDGET_MAX_CONCURRENT,
          renderBudgetBlocked: getRenderBudgetBlockedCount(),
          proactiveQueueSize: 0,
          layerEnabled: {
            data_reliability: true,
            governance: aiPreferences.aiGovernanceDecisionEnabled !== false,
            stability: aiPreferences.systemStabilityIntegrityEnabled !== false,
          },
          reactiveDroppedTotal: context.reactiveEventOrchestration?.droppedTotal,
          reactiveRecomputePerSec: context.reactiveEventOrchestration?.recomputePerSec,
          traceJsonLength: context.explainableCognitiveTrace
            ? JSON.stringify(context.explainableCognitiveTrace).length
            : 0,
        });
        context = attachAdaptiveResourceToContext(context, resource);
      }
      if (aiPreferences.stateIntegrityTemporalConsistencyEnabled !== false) {
        const { buildStateIntegrityTemporalConsistencyBundle } = await import(
          '../services/stateIntegrityTemporalConsistencyEngine'
        );
        const { attachStateIntegrityTemporalToContext } = await import(
          '../services/stateIntegrityTemporalConsistencyIntegration'
        );
        const temporal = await buildStateIntegrityTemporalConsistencyBundle({
          stateFingerprintJa: JSON.stringify({
            regime: context.globalMarketAnalysis.regimeId,
            holdings: context.holdings.length,
          }),
          refreshGeneration: 0,
          refreshGenerationStale: false,
          governance: context.aiGovernanceDecision ?? null,
          reactive: context.reactiveEventOrchestration ?? null,
          resource: context.adaptiveResourceComputeBudget ?? null,
          trace: context.explainableCognitiveTrace ?? null,
          stability: context.systemStabilityIntegrity ?? null,
          strategy: null,
          partialRecomputeActive: false,
          duplicateRefreshBlocked: false,
        });
        context = attachStateIntegrityTemporalToContext(context, temporal);
      }
      if (aiPreferences.semanticConsistencyDecisionCoherenceEnabled !== false) {
        const { buildSemanticConsistencyDecisionCoherenceBundle } = await import(
          '../services/semanticConsistencyDecisionCoherenceEngine'
        );
        const { attachSemanticConsistencyToContext } = await import(
          '../services/semanticConsistencyDecisionCoherenceIntegration'
        );
        const semantic = await buildSemanticConsistencyDecisionCoherenceBundle({
          governance: context.aiGovernanceDecision ?? null,
          trace: context.explainableCognitiveTrace ?? null,
          strategy: null,
          temporal: context.stateIntegrityTemporalConsistency ?? null,
          resource: context.adaptiveResourceComputeBudget ?? null,
          reactive: context.reactiveEventOrchestration ?? null,
          finalDecision: context.aiGovernanceDecision?.finalDecision ?? 'hold',
        });
        context = attachSemanticConsistencyToContext(context, semantic);
      }
      if (aiPreferences.epistemicReliabilityEvidenceWeightEnabled !== false) {
        const { buildEpistemicReliabilityEvidenceWeightBundle } = await import(
          '../services/epistemicReliabilityEvidenceWeightEngine'
        );
        const { attachEpistemicReliabilityToContext } = await import(
          '../services/epistemicReliabilityEvidenceWeightIntegration'
        );
        const epistemic = await buildEpistemicReliabilityEvidenceWeightBundle({
          governance: context.aiGovernanceDecision ?? null,
          trace: context.explainableCognitiveTrace ?? null,
          strategy: null,
          stability: context.systemStabilityIntegrity ?? null,
          reactive: context.reactiveEventOrchestration ?? null,
          resource: context.adaptiveResourceComputeBudget ?? null,
          temporal: context.stateIntegrityTemporalConsistency ?? null,
          semantic: context.semanticConsistencyDecisionCoherence ?? null,
          finalDecision: context.aiGovernanceDecision?.finalDecision ?? 'hold',
        });
        context = attachEpistemicReliabilityToContext(context, epistemic);
      }
      if (aiPreferences.cognitiveGoalArbitrationIntentPriorityEnabled !== false) {
        const { buildCognitiveGoalArbitrationIntentPriorityBundle } = await import(
          '../services/cognitiveGoalArbitrationIntentPriorityEngine'
        );
        const { attachCognitiveGoalArbitrationToContext } = await import(
          '../services/cognitiveGoalArbitrationIntentPriorityIntegration'
        );
        const arbitration = await buildCognitiveGoalArbitrationIntentPriorityBundle({
          governance: context.aiGovernanceDecision ?? null,
          trace: context.explainableCognitiveTrace ?? null,
          strategy: null,
          stability: context.systemStabilityIntegrity ?? null,
          reactive: context.reactiveEventOrchestration ?? null,
          resource: context.adaptiveResourceComputeBudget ?? null,
          temporal: context.stateIntegrityTemporalConsistency ?? null,
          semantic: context.semanticConsistencyDecisionCoherence ?? null,
          epistemic: context.epistemicReliabilityEvidenceWeight ?? null,
          finalDecision: context.aiGovernanceDecision?.finalDecision ?? 'hold',
        });
        context = attachCognitiveGoalArbitrationToContext(context, arbitration);
      }
      if (aiPreferences.metaCognitiveRiskReflectionSelfCritiqueEnabled !== false) {
        const { buildMetaCognitiveRiskReflectionSelfCritiqueBundle } = await import(
          '../services/metaCognitiveRiskReflectionSelfCritiqueEngine'
        );
        const { attachMetaCognitiveReflectionToContext } = await import(
          '../services/metaCognitiveRiskReflectionSelfCritiqueIntegration'
        );
        const reflection = await buildMetaCognitiveRiskReflectionSelfCritiqueBundle({
          governance: context.aiGovernanceDecision ?? null,
          trace: context.explainableCognitiveTrace ?? null,
          strategy: null,
          stability: context.systemStabilityIntegrity ?? null,
          reactive: context.reactiveEventOrchestration ?? null,
          resource: context.adaptiveResourceComputeBudget ?? null,
          temporal: context.stateIntegrityTemporalConsistency ?? null,
          semantic: context.semanticConsistencyDecisionCoherence ?? null,
          epistemic: context.epistemicReliabilityEvidenceWeight ?? null,
          arbitration: context.cognitiveGoalArbitrationIntentPriority ?? null,
          finalDecision: context.aiGovernanceDecision?.finalDecision ?? 'hold',
        });
        context = attachMetaCognitiveReflectionToContext(context, reflection);
      }
      if (aiPreferences.recursiveMemoryCompressionStrategicAbstractionEnabled !== false) {
        const { buildRecursiveMemoryCompressionStrategicAbstractionBundle } = await import(
          '../services/recursiveMemoryCompressionStrategicAbstractionEngine'
        );
        const { attachMemoryCompressionToContext } = await import(
          '../services/recursiveMemoryCompressionStrategicAbstractionIntegration'
        );
        const compression = await buildRecursiveMemoryCompressionStrategicAbstractionBundle({
          governance: context.aiGovernanceDecision ?? null,
          trace: context.explainableCognitiveTrace ?? null,
          strategy: null,
          stability: context.systemStabilityIntegrity ?? null,
          reactive: context.reactiveEventOrchestration ?? null,
          resource: context.adaptiveResourceComputeBudget ?? null,
          temporal: context.stateIntegrityTemporalConsistency ?? null,
          semantic: context.semanticConsistencyDecisionCoherence ?? null,
          epistemic: context.epistemicReliabilityEvidenceWeight ?? null,
          arbitration: context.cognitiveGoalArbitrationIntentPriority ?? null,
          reflection: context.metaCognitiveRiskReflectionSelfCritique ?? null,
          finalDecision: context.aiGovernanceDecision?.finalDecision ?? 'hold',
        });
        context = attachMemoryCompressionToContext(context, compression);
      }
      if (aiPreferences.systemicStabilityRecursiveGovernanceEnabled !== false) {
        const { buildSystemicStabilityRecursiveGovernanceBundle } = await import(
          '../services/systemicStabilityRecursiveGovernanceEngine'
        );
        const { attachSystemicStabilityToContext } = await import(
          '../services/systemicStabilityRecursiveGovernanceIntegration'
        );
        const systemic = await buildSystemicStabilityRecursiveGovernanceBundle({
          governance: context.aiGovernanceDecision ?? null,
          trace: context.explainableCognitiveTrace ?? null,
          strategy: null,
          stability: context.systemStabilityIntegrity ?? null,
          reactive: context.reactiveEventOrchestration ?? null,
          resource: context.adaptiveResourceComputeBudget ?? null,
          temporal: context.stateIntegrityTemporalConsistency ?? null,
          semantic: context.semanticConsistencyDecisionCoherence ?? null,
          epistemic: context.epistemicReliabilityEvidenceWeight ?? null,
          arbitration: context.cognitiveGoalArbitrationIntentPriority ?? null,
          reflection: context.metaCognitiveRiskReflectionSelfCritique ?? null,
          compression: context.recursiveMemoryCompressionStrategicAbstraction ?? null,
          finalDecision: context.aiGovernanceDecision?.finalDecision ?? 'hold',
        });
        context = attachSystemicStabilityToContext(context, systemic);
      }
      if (aiPreferences.executionRecoveryAdaptiveConfidenceEnabled !== false) {
        const { buildExecutionRecoveryAdaptiveConfidenceBundle } = await import(
          '../services/executionRecoveryAdaptiveConfidenceEngine'
        );
        const { attachExecutionRecoveryToContext } = await import(
          '../services/executionRecoveryAdaptiveConfidenceIntegration'
        );
        const recovery = await buildExecutionRecoveryAdaptiveConfidenceBundle({
          governance: context.aiGovernanceDecision ?? null,
          trace: context.explainableCognitiveTrace ?? null,
          strategy: null,
          stability: context.systemStabilityIntegrity ?? null,
          reactive: context.reactiveEventOrchestration ?? null,
          resource: context.adaptiveResourceComputeBudget ?? null,
          temporal: context.stateIntegrityTemporalConsistency ?? null,
          semantic: context.semanticConsistencyDecisionCoherence ?? null,
          epistemic: context.epistemicReliabilityEvidenceWeight ?? null,
          arbitration: context.cognitiveGoalArbitrationIntentPriority ?? null,
          reflection: context.metaCognitiveRiskReflectionSelfCritique ?? null,
          compression: context.recursiveMemoryCompressionStrategicAbstraction ?? null,
          systemic: context.systemicStabilityRecursiveGovernance ?? null,
          finalDecision: context.aiGovernanceDecision?.finalDecision ?? 'hold',
        });
        context = attachExecutionRecoveryToContext(context, recovery);
      }
      if (aiPreferences.autonomousMarketRegimeDetectionEnabled !== false) {
        const { buildAutonomousMarketRegimeDetectionBundle } = await import(
          '../services/autonomousMarketRegimeDetectionEngine'
        );
        const { attachMarketRegimeToContext } = await import(
          '../services/autonomousMarketRegimeIntegration'
        );
        const regime = await buildAutonomousMarketRegimeDetectionBundle({
          macro: globalMarketAnalysis,
          governance: context.aiGovernanceDecision ?? null,
          stability: context.systemStabilityIntegrity ?? null,
          systemic: context.systemicStabilityRecursiveGovernance ?? null,
          recovery: context.executionRecoveryAdaptiveConfidence ?? null,
          orchestration: context.dynamicLayerOrchestrationMobileRuntimeOptimization ?? null,
          reflection: context.metaCognitiveRiskReflectionSelfCritique ?? null,
          epistemic: context.epistemicReliabilityEvidenceWeight ?? null,
          strategy: null,
          finalDecision: context.aiGovernanceDecision?.finalDecision ?? 'hold',
        });
        context = attachMarketRegimeToContext(context, regime);
      }
      if (aiPreferences.cognitiveArbitrationConsensusEnabled !== false) {
        const { buildCognitiveArbitrationConsensusBundle } = await import(
          '../services/cognitiveArbitrationConsensusEngine'
        );
        const { attachCognitiveArbitrationToContext } = await import(
          '../services/cognitiveArbitrationIntegration'
        );
        const consensus = await buildCognitiveArbitrationConsensusBundle({
          governance: context.aiGovernanceDecision ?? null,
          stability: context.systemStabilityIntegrity ?? null,
          systemic: context.systemicStabilityRecursiveGovernance ?? null,
          recovery: context.executionRecoveryAdaptiveConfidence ?? null,
          regime: context.autonomousMarketRegimeDetection ?? null,
          risk: context.portfolioRiskExposure ?? null,
          macro: null,
          memory: context.recursiveMemoryCompressionStrategicAbstraction ?? null,
          reflection: context.metaCognitiveRiskReflectionSelfCritique ?? null,
          semantic: context.semanticConsistencyDecisionCoherence ?? null,
          orchestration: context.dynamicLayerOrchestrationMobileRuntimeOptimization ?? null,
          strategy: null,
          finalDecision: context.aiGovernanceDecision?.finalDecision ?? 'hold',
        });
        context = attachCognitiveArbitrationToContext(context, consensus);
      }
      if (aiPreferences.metaReliabilityLongitudinalTrustEnabled !== false) {
        const { buildMetaReliabilityLongitudinalTrustBundle } = await import(
          '../services/metaReliabilityEngine'
        );
        const { attachMetaReliabilityToContext } = await import(
          '../services/metaReliabilityIntegration'
        );
        const metaTrust = await buildMetaReliabilityLongitudinalTrustBundle({
          governance: context.aiGovernanceDecision ?? null,
          stability: context.systemStabilityIntegrity ?? null,
          systemic: context.systemicStabilityRecursiveGovernance ?? null,
          recovery: context.executionRecoveryAdaptiveConfidence ?? null,
          regime: context.autonomousMarketRegimeDetection ?? null,
          consensus: context.cognitiveArbitrationConsensus ?? null,
          reflection: context.metaCognitiveRiskReflectionSelfCritique ?? null,
          semantic: context.semanticConsistencyDecisionCoherence ?? null,
          orchestration: context.dynamicLayerOrchestrationMobileRuntimeOptimization ?? null,
          strategy: null,
          finalDecision: context.aiGovernanceDecision?.finalDecision ?? 'hold',
        });
        context = attachMetaReliabilityToContext(context, metaTrust);
      }
      if (aiPreferences.selfEvolvingArchitectureReflectiveRefactorEnabled !== false) {
        const { buildSelfEvolvingArchitectureReflectiveRefactorBundle } = await import(
          '../services/selfEvolvingArchitectureEngine'
        );
        const { attachSelfArchitectureToContext } = await import(
          '../services/selfArchitectureIntegration'
        );
        const selfArch = await buildSelfEvolvingArchitectureReflectiveRefactorBundle({
          governance: context.aiGovernanceDecision ?? null,
          stability: context.systemStabilityIntegrity ?? null,
          systemic: context.systemicStabilityRecursiveGovernance ?? null,
          recovery: context.executionRecoveryAdaptiveConfidence ?? null,
          regime: context.autonomousMarketRegimeDetection ?? null,
          consensus: context.cognitiveArbitrationConsensus ?? null,
          metaReliability: context.metaReliabilityLongitudinalTrust ?? null,
          reflection: context.metaCognitiveRiskReflectionSelfCritique ?? null,
          semantic: context.semanticConsistencyDecisionCoherence ?? null,
          memory: context.recursiveMemoryCompressionStrategicAbstraction ?? null,
          orchestration: context.dynamicLayerOrchestrationMobileRuntimeOptimization ?? null,
          strategy: null,
          memoryPressure: false,
          batterySaver: aiPreferences.batterySaverEnabled,
        });
        context = attachSelfArchitectureToContext(context, selfArch);
      }
      if (aiPreferences.epistemicIntegrityTruthCalibrationEnabled !== false) {
        const { buildEpistemicIntegrityTruthCalibrationBundle } = await import(
          '../services/epistemicIntegrityEngine'
        );
        const { attachEpistemicIntegrityToContext } = await import(
          '../services/epistemicIntegrityIntegration'
        );
        const epistemicIntegrity = await buildEpistemicIntegrityTruthCalibrationBundle({
          governance: context.aiGovernanceDecision ?? null,
          stability: context.systemStabilityIntegrity ?? null,
          systemic: context.systemicStabilityRecursiveGovernance ?? null,
          recovery: context.executionRecoveryAdaptiveConfidence ?? null,
          regime: context.autonomousMarketRegimeDetection ?? null,
          consensus: context.cognitiveArbitrationConsensus ?? null,
          metaReliability: context.metaReliabilityLongitudinalTrust ?? null,
          selfArchitecture: context.selfEvolvingArchitectureReflectiveRefactor ?? null,
          reflection: context.metaCognitiveRiskReflectionSelfCritique ?? null,
          semantic: context.semanticConsistencyDecisionCoherence ?? null,
          temporal: context.stateIntegrityTemporalConsistency ?? null,
          epistemicWeight: context.epistemicReliabilityEvidenceWeight ?? null,
          trace: context.explainableCognitiveTrace ?? null,
          memory: context.recursiveMemoryCompressionStrategicAbstraction ?? null,
          orchestration: context.dynamicLayerOrchestrationMobileRuntimeOptimization ?? null,
          strategy: null,
        });
        context = attachEpistemicIntegrityToContext(context, epistemicIntegrity);
      }
      if (aiPreferences.strategicMemoryGraphTemporalCausalityEnabled !== false) {
        const { buildStrategicMemoryGraphTemporalCausalityBundle } = await import(
          '../services/strategicMemoryGraphEngine'
        );
        const { attachStrategicMemoryGraphToContext } = await import(
          '../services/strategicMemoryGraphIntegration'
        );
        const strategicMemoryGraph = await buildStrategicMemoryGraphTemporalCausalityBundle({
          governance: context.aiGovernanceDecision ?? null,
          stability: context.systemStabilityIntegrity ?? null,
          systemic: context.systemicStabilityRecursiveGovernance ?? null,
          recovery: context.executionRecoveryAdaptiveConfidence ?? null,
          regime: context.autonomousMarketRegimeDetection ?? null,
          consensus: context.cognitiveArbitrationConsensus ?? null,
          metaReliability: context.metaReliabilityLongitudinalTrust ?? null,
          selfArchitecture: context.selfEvolvingArchitectureReflectiveRefactor ?? null,
          epistemic: context.epistemicIntegrityTruthCalibration ?? null,
          reflection: context.metaCognitiveRiskReflectionSelfCritique ?? null,
          orchestration: context.dynamicLayerOrchestrationMobileRuntimeOptimization ?? null,
          strategy: null,
          refreshCount: 0,
        });
        context = attachStrategicMemoryGraphToContext(context, strategicMemoryGraph);
      }
      if (aiPreferences.cognitiveResourceEconomyAttentionAllocationEnabled !== false) {
        const { buildCognitiveResourceEconomyAttentionAllocationBundle } = await import(
          '../services/cognitiveResourceEconomyEngine'
        );
        const { attachCognitiveResourceEconomyToContext } = await import(
          '../services/cognitiveResourceEconomyIntegration'
        );
        const cognitiveResourceEconomy =
          await buildCognitiveResourceEconomyAttentionAllocationBundle({
            governance: context.aiGovernanceDecision ?? null,
            stability: context.systemStabilityIntegrity ?? null,
            systemic: context.systemicStabilityRecursiveGovernance ?? null,
            recovery: context.executionRecoveryAdaptiveConfidence ?? null,
            regime: context.autonomousMarketRegimeDetection ?? null,
            consensus: context.cognitiveArbitrationConsensus ?? null,
            metaReliability: context.metaReliabilityLongitudinalTrust ?? null,
            epistemic: context.epistemicIntegrityTruthCalibration ?? null,
            strategicMemoryGraph: context.strategicMemoryGraphTemporalCausality ?? null,
            reflection: context.metaCognitiveRiskReflectionSelfCritique ?? null,
            resource: context.adaptiveResourceComputeBudget ?? null,
            orchestration: context.dynamicLayerOrchestrationMobileRuntimeOptimization ?? null,
            strategy: null,
            batterySaver: aiPreferences.batterySaverEnabled,
            memoryPressure: false,
            appForeground: true,
            refreshCount: 0,
          });
        context = attachCognitiveResourceEconomyToContext(context, cognitiveResourceEconomy);
      }
      if (aiPreferences.unifiedCognitiveStateExecutiveAwarenessEnabled !== false) {
        const { buildUnifiedCognitiveStateExecutiveAwarenessBundle } = await import(
          '../services/unifiedCognitiveStateEngine'
        );
        const { attachUnifiedCognitiveStateToContext } = await import(
          '../services/unifiedCognitiveStateIntegration'
        );
        const unifiedCognitiveState = await buildUnifiedCognitiveStateExecutiveAwarenessBundle({
          governance: context.aiGovernanceDecision ?? null,
          stability: context.systemStabilityIntegrity ?? null,
          systemic: context.systemicStabilityRecursiveGovernance ?? null,
          recovery: context.executionRecoveryAdaptiveConfidence ?? null,
          regime: context.autonomousMarketRegimeDetection ?? null,
          consensus: context.cognitiveArbitrationConsensus ?? null,
          metaReliability: context.metaReliabilityLongitudinalTrust ?? null,
          selfArchitecture: context.selfEvolvingArchitectureReflectiveRefactor ?? null,
          epistemic: context.epistemicIntegrityTruthCalibration ?? null,
          strategicMemoryGraph: context.strategicMemoryGraphTemporalCausality ?? null,
          cognitiveResourceEconomy: context.cognitiveResourceEconomyAttentionAllocation ?? null,
          orchestration: context.dynamicLayerOrchestrationMobileRuntimeOptimization ?? null,
          strategy: null,
          batterySaver: aiPreferences.batterySaverEnabled,
          memoryPressure: false,
          appForeground: true,
          refreshCount: 0,
        });
        context = attachUnifiedCognitiveStateToContext(context, unifiedCognitiveState);
      }
      if (aiPreferences.humanIntentContinuityAlignmentPreservationEnabled !== false) {
        const { buildHumanIntentContinuityAlignmentPreservationBundle } = await import(
          '../services/humanIntentContinuityEngine'
        );
        const { attachHumanIntentContinuityToContext } = await import(
          '../services/humanIntentContinuityIntegration'
        );
        const humanIntentContinuity = await buildHumanIntentContinuityAlignmentPreservationBundle({
          governance: context.aiGovernanceDecision ?? null,
          stability: context.systemStabilityIntegrity ?? null,
          systemic: context.systemicStabilityRecursiveGovernance ?? null,
          consensus: context.cognitiveArbitrationConsensus ?? null,
          epistemic: context.epistemicIntegrityTruthCalibration ?? null,
          strategicMemoryGraph: context.strategicMemoryGraphTemporalCausality ?? null,
          cognitiveResourceEconomy: context.cognitiveResourceEconomyAttentionAllocation ?? null,
          unifiedCognitiveState: context.unifiedCognitiveStateExecutiveAwareness ?? null,
          orchestration: context.dynamicLayerOrchestrationMobileRuntimeOptimization ?? null,
          strategy: null,
          refreshCount: 0,
        });
        context = attachHumanIntentContinuityToContext(context, humanIntentContinuity);
      }
      if (aiPreferences.adaptiveExplorationAntiDogmaEnabled !== false) {
        const { buildAdaptiveExplorationAntiDogmaBundle } = await import(
          '../services/adaptiveExplorationEngine'
        );
        const { attachAdaptiveExplorationToContext } = await import(
          '../services/adaptiveExplorationIntegration'
        );
        const adaptiveExploration = await buildAdaptiveExplorationAntiDogmaBundle({
          governance: context.aiGovernanceDecision ?? null,
          stability: context.systemStabilityIntegrity ?? null,
          systemic: context.systemicStabilityRecursiveGovernance ?? null,
          consensus: context.cognitiveArbitrationConsensus ?? null,
          epistemic: context.epistemicIntegrityTruthCalibration ?? null,
          strategicMemoryGraph: context.strategicMemoryGraphTemporalCausality ?? null,
          cognitiveResourceEconomy: context.cognitiveResourceEconomyAttentionAllocation ?? null,
          unifiedCognitiveState: context.unifiedCognitiveStateExecutiveAwareness ?? null,
          humanIntentContinuity: context.humanIntentContinuityAlignmentPreservation ?? null,
          orchestration: context.dynamicLayerOrchestrationMobileRuntimeOptimization ?? null,
          strategy: null,
          refreshCount: 0,
        });
        context = attachAdaptiveExplorationToContext(context, adaptiveExploration);
      }
      if (aiPreferences.constitutionalGovernanceSystemCoherenceEnabled !== false) {
        const { buildConstitutionalGovernanceSystemCoherenceBundle } = await import(
          '../services/constitutionalGovernanceEngine'
        );
        const { attachConstitutionalGovernanceToContext } = await import(
          '../services/constitutionalGovernanceIntegration'
        );
        const constitutionalGovernance = await buildConstitutionalGovernanceSystemCoherenceBundle({
          governance: context.aiGovernanceDecision ?? null,
          stability: context.systemStabilityIntegrity ?? null,
          systemic: context.systemicStabilityRecursiveGovernance ?? null,
          consensus: context.cognitiveArbitrationConsensus ?? null,
          epistemic: context.epistemicIntegrityTruthCalibration ?? null,
          strategicMemoryGraph: context.strategicMemoryGraphTemporalCausality ?? null,
          cognitiveResourceEconomy: context.cognitiveResourceEconomyAttentionAllocation ?? null,
          unifiedCognitiveState: context.unifiedCognitiveStateExecutiveAwareness ?? null,
          humanIntentContinuity: context.humanIntentContinuityAlignmentPreservation ?? null,
          adaptiveExploration: context.adaptiveExplorationAntiDogma ?? null,
          orchestration: context.dynamicLayerOrchestrationMobileRuntimeOptimization ?? null,
          strategy: null,
          refreshCount: 0,
        });
        context = attachConstitutionalGovernanceToContext(context, constitutionalGovernance);
      }
      if (aiPreferences.explainableGovernanceTransparentReasoningEnabled !== false) {
        const { buildExplainableGovernanceTransparentReasoningBundle } = await import(
          '../services/explainableGovernanceEngine'
        );
        const { attachExplainableGovernanceToContext } = await import(
          '../services/explainableGovernanceIntegration'
        );
        const explainableGovernance = await buildExplainableGovernanceTransparentReasoningBundle({
          governance: context.aiGovernanceDecision ?? null,
          stability: context.systemStabilityIntegrity ?? null,
          systemic: context.systemicStabilityRecursiveGovernance ?? null,
          consensus: context.cognitiveArbitrationConsensus ?? null,
          metaReliability: context.metaReliabilityLongitudinalTrust ?? null,
          epistemic: context.epistemicIntegrityTruthCalibration ?? null,
          strategicMemoryGraph: context.strategicMemoryGraphTemporalCausality ?? null,
          cognitiveResourceEconomy: context.cognitiveResourceEconomyAttentionAllocation ?? null,
          unifiedCognitiveState: context.unifiedCognitiveStateExecutiveAwareness ?? null,
          humanIntentContinuity: context.humanIntentContinuityAlignmentPreservation ?? null,
          adaptiveExploration: context.adaptiveExplorationAntiDogma ?? null,
          constitutionalGovernance: context.constitutionalGovernanceSystemCoherence ?? null,
          orchestration: context.dynamicLayerOrchestrationMobileRuntimeOptimization ?? null,
          strategy: null,
          refreshCount: 0,
        });
        context = attachExplainableGovernanceToContext(context, explainableGovernance);
      }
      if (aiPreferences.runtimeSurvivalMobileResilienceEnabled !== false) {
        const { getPerformanceCostSnapshot } = await import('../services/performanceCostRuntime');
        const { buildRuntimeSurvivalMobileResilienceBundle } = await import(
          '../services/runtimeSurvivalEngine'
        );
        const { attachRuntimeSurvivalToContext } = await import(
          '../services/runtimeSurvivalIntegration'
        );
        const perf = getPerformanceCostSnapshot();
        const runtimeSurvival = await buildRuntimeSurvivalMobileResilienceBundle({
          governance: context.aiGovernanceDecision ?? null,
          performance: perf,
          memoryPressure: false,
          queueSize: 0,
          cognitiveResourceEconomy: context.cognitiveResourceEconomyAttentionAllocation ?? null,
          constitutionalGovernance: context.constitutionalGovernanceSystemCoherence ?? null,
          explainableGovernance: context.explainableGovernanceTransparentReasoning ?? null,
          orchestration: context.dynamicLayerOrchestrationMobileRuntimeOptimization ?? null,
          strategy: null,
          refreshCount: 0,
          websocketConnected: !perf.offlineMode && !perf.networkPaused,
        });
        context = attachRuntimeSurvivalToContext(context, runtimeSurvival);
      }
      const result = await sendAiStrategyChat({
        userMessage,
        context,
        preferences: aiPreferences,
        apiKey: aiApiKey,
        signal: options?.signal,
        onRequestStatus: options?.onRequestStatus,
      });
      void recordIntelligenceFromAiTurn({
        userMessage,
        assistantSnippet: result.text,
        actionGuide: evidenceData.actionGuide,
        evidenceSummaryJa: evidenceData.globalSummaryJa,
      });
      return result;
    },
    [
      aiApiKey,
      aiPreferences,
      analysisApiKeys,
      isPractice,
      apiHealthDashboard,
      marketRegime,
      healthReport,
      degradedMode,
      bootMode,
      securityWarnings,
      recoveryRecommendations,
      killSwitches,
    ],
  );

  const clearAiChatHistoryHandler = useCallback(async () => {
    await clearAiChatHistory();
  }, []);

  const resetAllAppData = useCallback(async (clearApiKeys: boolean) => {
    void clearApiKeys;
    blockEmptyBootPersistenceRef.current = 'user_reset';
    const clearResult = await clearAllPersistedAppData(true);
    await clearAiChatHistory();
    await resetMarketDataDiagnostics();
    resetQuoteCacheForReset();
    resetBursaFormatCacheForReset();
    resetYahooSymbolAliasCacheForReset();
    resetExecutionJournalMemoryForTest();
    clearDiagnosticEvents();
    const fresh = createDefaultAppState();
    const aiFresh = await resetAiLearningStorage();
    const resetKillSwitches = resetPersonalKillSwitchesForReset();
    setState(fresh);
    stateRef.current = fresh;
    lastPersistedRef.current = fresh;
    setAiLearningState(aiFresh);
    initialPriceRefreshDone.current = false;
    resetPortfolioRefreshCoordinator();
    setPriceSync({ loading: false, marketClosedHint: false });
    setAiPreferences({ ...DEFAULT_AI_PREFERENCES });
    setTwelveDataApiKey('');
    setAnalysisApiKeys({ newsApiKey: '', snsApiKey: '', earningsApiKey: '', redditApiKey: '', xApiKey: '' });
    setApiHealthDashboard(buildApiHealthDashboard(createEmptyHealthSnapshot()));
    setAiApiKey('');
    setKillSwitches(resetKillSwitches);
    setBootMode('normal');
    setSecurityWarnings([]);
    setRecoveryRecommendations([]);
    setEnvironmentIssues([]);
    setHealthReport(null);
    setPortfolioRevision((v) => v + 1);
    setRegimeRevision((v) => v + 1);
    setDataResetRevision((v) => v + 1);
    return { failedKeys: clearResult.failedKeys };
  }, [
    setKillSwitches,
    setBootMode,
    setSecurityWarnings,
    setRecoveryRecommendations,
    setEnvironmentIssues,
    setHealthReport,
  ]);

  const priceSyncStateValue = useMemo<PriceSyncStateContextValue>(
    () => ({ priceSync }),
    [priceSync],
  );

  const priceSyncActionsValue = useMemo<PriceSyncActionsContextValue>(
    () => ({
      refreshPortfolioPrices,
      syncPriceSyncForEmptyHoldings,
      reloadTwelveDataApiKeyFromStorage,
      saveTwelveDataApiKey,
      testTwelveDataConnection: testApiConnection,
    }),
    [
      refreshPortfolioPrices,
      syncPriceSyncForEmptyHoldings,
      reloadTwelveDataApiKeyFromStorage,
      saveTwelveDataApiKey,
      testApiConnection,
    ],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      loading,
      isPractice,
      practiceStats,
      buyingPower,
      setAppMode,
      updateSettings,
      addDeposit,
      toggleDepositCompleted,
      addTrade,
      addPracticeTrade,
      submitTradeWithExecutionSafety,
      addManualHolding,
      setPracticeVirtualCapital,
      addPracticeDeposit,
      resetPracticeAccount,
      addDividend,
      applyAllocationPractice,
      reloadHoldingsFromStorage,
      portfolioRevision,
      addAllocationToManualOrderList,
      addManualSellFromHolding,
      practiceSellAll,
      practiceSellAllHoldings,
      addManualSellAllChecklist,
      confirmManualOrderAsExecuted,
      clearCompletedManualOrders,
      updateNotificationSettings,
      dispatchAlert,
      dispatchAlerts,
      sendTestNotification,
      clearNotificationHistory,
      requestNotificationsPermission,
      updateHoldingCurrentPrice,
      updateHoldingSymbol,
      updateHoldingMarket,
      twelveDataApiKey,
      analysisApiKeys,
      aiLearningState,
      saveAnalysisApiKeys,
      refresh,
      resetAllAppData,
      addScreenerCandidateToManualList,
      marketRegime,
      crossAssetFlow,
      refreshMarketRegime,
      bootMode,
      securityWarnings,
      enterSafeBootMode,
      clearSensitiveLocalData,
      degradedMode,
      recoveryRecommendations,
      environmentIssues,
      diagnosticsReportJson,
      killSwitches,
      setKillSwitch,
      runHealthCheck,
      healthReport,
      exportBackupJson,
      importBackupFromJson,
      restoreLastHealthySnapshot,
      resetRequestQueue,
      removeHolding,
      undoLastHoldingRemoval,
      readOnlyBlockedMessage,
      aiApiKey,
      aiPreferences,
      saveAiApiKey,
      testAiApiConnection: runTestAiApiConnection,
      saveAiPreferences,
      sendAiStrategyMessage,
      clearAiChatHistory: clearAiChatHistoryHandler,
      dataResetRevision,
      apiHealthDashboard,
      refreshApiHealth,
      saveWizardApiKeyAndVerify,
      verifyWizardApiProvider,
    }),
    [
      state,
      loading,
      isPractice,
      practiceStats,
      buyingPower,
      setAppMode,
      updateSettings,
      addDeposit,
      toggleDepositCompleted,
      addTrade,
      addPracticeTrade,
      submitTradeWithExecutionSafety,
      addManualHolding,
      setPracticeVirtualCapital,
      addPracticeDeposit,
      resetPracticeAccount,
      addDividend,
      applyAllocationPractice,
      reloadHoldingsFromStorage,
      portfolioRevision,
      addAllocationToManualOrderList,
      addManualSellFromHolding,
      practiceSellAll,
      practiceSellAllHoldings,
      addManualSellAllChecklist,
      confirmManualOrderAsExecuted,
      clearCompletedManualOrders,
      updateNotificationSettings,
      dispatchAlert,
      dispatchAlerts,
      sendTestNotification,
      clearNotificationHistory,
      requestNotificationsPermission,
      updateHoldingCurrentPrice,
      updateHoldingSymbol,
      updateHoldingMarket,
      twelveDataApiKey,
      analysisApiKeys,
      aiLearningState,
      saveAnalysisApiKeys,
      refresh,
      resetAllAppData,
      addScreenerCandidateToManualList,
      marketRegime,
      crossAssetFlow,
      refreshMarketRegime,
      bootMode,
      securityWarnings,
      enterSafeBootMode,
      clearSensitiveLocalData,
      degradedMode,
      recoveryRecommendations,
      environmentIssues,
      diagnosticsReportJson,
      killSwitches,
      setKillSwitch,
      runHealthCheck,
      healthReport,
      exportBackupJson,
      importBackupFromJson,
      restoreLastHealthySnapshot,
      resetRequestQueue,
      removeHolding,
      undoLastHoldingRemoval,
      readOnlyBlockedMessage,
      aiApiKey,
      aiPreferences,
      saveAiApiKey,
      runTestAiApiConnection,
      saveAiPreferences,
      sendAiStrategyMessage,
      clearAiChatHistoryHandler,
      dataResetRevision,
      apiHealthDashboard,
      refreshApiHealth,
      saveWizardApiKeyAndVerify,
      verifyWizardApiProvider,
    ],
  );

  useContextValueTrace('AppContext', value, ['state', 'loading', 'portfolioRevision']);

  return (
    <AppContext.Provider value={value}>
      <PriceSyncProvider stateValue={priceSyncStateValue} actionsValue={priceSyncActionsValue}>
        {children}
      </PriceSyncProvider>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
