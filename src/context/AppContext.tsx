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
import { createEmptyHealthSnapshot, loadApiHealthSnapshot } from '../services/apiHealthStorage';
import { loadAnalysisApiKeys } from '../services/analysisApiKeys';
import { loadAiApiKey } from '../services/aiApiKey';
import { loadTwelveDataApiKey } from '../services/marketDataApiKey';
import { buildAiStrategyContext, sendAiStrategyChat } from '../services/aiStrategyService';
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
import type { RakutenImportManualFormInput } from '../types/rakutenImport';
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
  removePendingManualOrder: (orderId: string) => { ok: boolean; error?: string };
  updateManualOrderEntryPrice: (
    orderId: string,
    entryPrice: number,
    estimatedShares?: number,
  ) => { ok: boolean; error?: string };
  updateNotificationSettings: (partial: Partial<NotificationSettings>) => void;
  dispatchAlert: (payload: AlertPayload) => Promise<boolean>;
  dispatchAlerts: (payloads: AlertPayload[]) => Promise<void>;
  sendTestNotification: () => Promise<void>;
  clearNotificationHistory: () => void;
  requestNotificationsPermission: () => Promise<boolean>;
  updateHoldingCurrentPrice: (positionId: string, currentPrice: number) => { ok: boolean; error?: string };
  updateHoldingSymbol: (positionId: string, symbol: string) => { ok: boolean; error?: string };
  updateHoldingMarket: (positionId: string, market: Market) => { ok: boolean; error?: string };
  stageRakutenImportManual: (
    input: RakutenImportManualFormInput,
  ) => Promise<{ ok: true; candidateId: string } | { ok: false; error: string }>;
  commitRakutenImportCandidate: (
    candidateId: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  rejectRakutenImportCandidate: (candidateId: string) => Promise<void>;
  twelveDataApiKey: string;
  analysisApiKeys: AnalysisApiKeys;
  aiLearningState: AiLearningState;
  saveAnalysisApiKeys: (keys: Partial<AnalysisApiKeys>) => Promise<{ savedFields: string[] }>;
  refresh: () => Promise<void>;
  resetAllAppData: (clearApiKeys: boolean) => Promise<{ failedKeys: string[] }>;
  reloadStoredApiKeys: () => Promise<void>;
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
  saveAiApiKey: (apiKey: string) => Promise<{ saved: boolean; reason: string }>;
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
    removePendingManualOrder,
    updateManualOrderEntryPrice,
    addScreenerCandidateToManualList,
    updateHoldingCurrentPrice,
    updateHoldingSymbol,
    updateHoldingMarket,
    removeHolding,
    undoLastHoldingRemoval,
    stageRakutenImportManual,
    commitRakutenImportCandidate,
    rejectRakutenImportCandidate,
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
      const { buildConciergeChatContext } = await import('../services/conciergeChatContextBuilder');
      const { setLastConciergeTurnEvidence } = await import('../services/conciergeEvidenceCache');
      const { context, evidenceData } = await buildConciergeChatContext({
        userMessage,
        state: current,
        isPractice,
        analysisApiKeys,
        aiPreferences,
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
        apiDash,
        sessionMemory: options?.sessionMemory,
      });
      setLastConciergeTurnEvidence(evidenceData);

      const result = await sendAiStrategyChat({
        userMessage,
        context,
        preferences: aiPreferences,
        apiKey: aiApiKey,
        signal: options?.signal,
        onRequestStatus: options?.onRequestStatus,
      });
      const { logEvidenceTrace } = await import('../services/conciergeEvidenceTrace');
      logEvidenceTrace('context_built', {
        hasEvidence: Boolean(evidenceData?.symbols?.length),
        symbol: evidenceData?.symbols[0]?.symbol ?? null,
        symbolCount: evidenceData?.symbols?.length ?? 0,
      });
      logEvidenceTrace('strategy_result', {
        hasEvidence: Boolean(result.evidenceData?.symbols?.length),
        symbol: result.evidenceData?.symbols[0]?.symbol ?? null,
        symbolCount: result.evidenceData?.symbols?.length ?? 0,
        note: result.evidenceData ? 'from sendAiStrategyChat' : 'missing on result — will merge from context',
      });
      const { recordIntelligenceFromAiTurn } = await import('../services/portfolioIntelligenceBuilder');
      void recordIntelligenceFromAiTurn({
        userMessage,
        assistantSnippet: result.text,
        actionGuide: evidenceData.actionGuide,
        evidenceSummaryJa: evidenceData.globalSummaryJa,
      });
      const merged = {
        ...result,
        evidenceData: result.evidenceData ?? evidenceData,
        globalMarketAnalysis: result.globalMarketAnalysis ?? context.globalMarketAnalysis,
        portfolioIntelligence: result.portfolioIntelligence ?? context.portfolioIntelligence,
      };
      logEvidenceTrace('strategy_result', {
        hasEvidence: Boolean(merged.evidenceData?.symbols?.length),
        symbol: merged.evidenceData?.symbols[0]?.symbol ?? null,
        symbolCount: merged.evidenceData?.symbols?.length ?? 0,
        note: 'merged return to chat',
      });
      return merged;
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
    blockEmptyBootPersistenceRef.current = 'user_reset';
    const clearResult = await clearAllPersistedAppData(clearApiKeys);
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
    if (clearApiKeys) {
      setTwelveDataApiKey('');
      setAnalysisApiKeys({
        newsApiKey: '',
        snsApiKey: '',
        earningsApiKey: '',
        redditApiKey: '',
        xApiKey: '',
      });
      setApiHealthDashboard(buildApiHealthDashboard(createEmptyHealthSnapshot()));
      setAiApiKey('');
    } else {
      const [apiKey, analysisKeys, aiKey, healthSnap] = await Promise.all([
        loadTwelveDataApiKey(),
        loadAnalysisApiKeys(),
        loadAiApiKey(),
        loadApiHealthSnapshot(),
      ]);
      setTwelveDataApiKey(apiKey);
      setAnalysisApiKeys(analysisKeys);
      setAiApiKey(aiKey);
      setApiHealthDashboard(buildApiHealthDashboard(healthSnap));
    }
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

  const reloadStoredApiKeys = useCallback(async () => {
    const [apiKey, analysisKeys, aiKey, healthSnap] = await Promise.all([
      loadTwelveDataApiKey(),
      loadAnalysisApiKeys(),
      loadAiApiKey(),
      loadApiHealthSnapshot(),
    ]);
    setTwelveDataApiKey(apiKey);
    setAnalysisApiKeys(analysisKeys);
    setAiApiKey(aiKey);
    setApiHealthDashboard(buildApiHealthDashboard(healthSnap));
  }, []);

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
      removePendingManualOrder,
      updateManualOrderEntryPrice,
      updateNotificationSettings,
      dispatchAlert,
      dispatchAlerts,
      sendTestNotification,
      clearNotificationHistory,
      requestNotificationsPermission,
      updateHoldingCurrentPrice,
      updateHoldingSymbol,
      updateHoldingMarket,
      stageRakutenImportManual,
      commitRakutenImportCandidate,
      rejectRakutenImportCandidate,
      twelveDataApiKey,
      analysisApiKeys,
      aiLearningState,
      saveAnalysisApiKeys,
      refresh,
      resetAllAppData,
      reloadStoredApiKeys,
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
      removePendingManualOrder,
      updateManualOrderEntryPrice,
      updateNotificationSettings,
      dispatchAlert,
      dispatchAlerts,
      sendTestNotification,
      clearNotificationHistory,
      requestNotificationsPermission,
      updateHoldingCurrentPrice,
      updateHoldingSymbol,
      updateHoldingMarket,
      stageRakutenImportManual,
      commitRakutenImportCandidate,
      rejectRakutenImportCandidate,
      twelveDataApiKey,
      analysisApiKeys,
      aiLearningState,
      saveAnalysisApiKeys,
      refresh,
      resetAllAppData,
      reloadStoredApiKeys,
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
