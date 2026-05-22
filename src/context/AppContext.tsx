import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../constants/notifications';
import type { AlertPayload } from '../services/alertEngine';
import { collectPeriodicAlerts, prepareAlertDispatch } from '../services/alertEngine';
import {
  loadAnalysisApiKeys,
  saveAnalysisApiKeys as persistAnalysisApiKeys,
  type AnalysisApiKeys,
} from '../services/analysisApiKeys';
import { loadAiApiKey, saveAiApiKey as persistAiApiKey } from '../services/aiApiKey';
import { isUsableApiKey } from '../services/apiKeyValidation';
import { createDefaultProviderHealth } from '../services/apiHealthDashboard';
import { testAiApiConnection } from '../services/aiStrategyService';
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
import {
  createEmptyHealthSnapshot,
  loadApiHealthSnapshot,
  updateProviderHealth,
} from '../services/apiHealthStorage';
import {
  getWizardProviderConfig,
  refreshApiHealthDashboard,
  saveWizardApiKey,
  verifyAndPersistProvider,
} from '../services/apiSetupWizardService';
import { buildAiStrategyContext, sendAiStrategyChat } from '../services/aiStrategyService';
import { buildXConciergeContextForMessage } from '../services/xApiConciergeContext';
import { logXBearerEnvAtStartup } from '../services/xBearerToken';
import type { ApiHealthDashboard, ApiProviderHealth, ApiProviderId } from '../types/apiSetup';
import { logApiKeyLoadAudit } from '../services/apiKeyLoadDiagnostics';
import {
  loadTwelveDataApiKey,
  logTwelveDataEnvKeyAtStartup,
  resolveTwelveDataApiKey,
  saveTwelveDataApiKey as persistApiKey,
} from '../services/marketDataApiKey';
import { loadAiLearningState, resetAiLearningStorage, type AiLearningState } from '../services/analysis/aiLearning';
import { testTwelveDataConnection } from '../services/marketDataService';
import { HOLDING_ERRORS } from '../constants/holdingErrors';
import {
  confirmManualOrderInState,
  type ManualOrderConfirmInput,
} from '../services/manualOrderConfirmation';
import {
  applyManualHoldingToState,
  mergePortfolioFromPersistence,
  type ManualHoldingInput,
} from '../services/portfolioHoldings';
import { getActivePortfolio, syncPortfolioPrices } from '../services/portfolioPriceUpdate';
import { applyPriceRefreshTransaction } from '../services/portfolioTransaction';
import {
  requestPortfolioPriceRefresh,
  resetPortfolioRefreshCoordinator,
} from '../services/portfolioRefreshCoordinator';
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
} from '../services/executionJournalStorage';
import {
  applyPersonalBackupToState,
  exportPersonalBackupJson,
  validatePersonalBackupJson,
} from '../services/personalBackupService';
import {
  getPersonalKillSwitchesSnapshot,
  loadPersonalKillSwitches,
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
import { validateTradeIntent } from '../services/tradeExecutionGate';
import { hydrateBursaFormatCache } from '../services/bursaSymbolFormat';
import {
  hydrateMarketDataDiagnostics,
  recordRefreshSessionEnd,
  recordRefreshSessionStart,
} from '../services/marketDataDiagnostics';
import { backupPortfolioIfNonEmpty, restorePortfolioFromBackup } from '../services/portfolioBackup';
import { guardAppStateForPersistence } from '../services/portfolioPersistenceGuard';
import {
  recoverPortfolioFromHealthySnapshot,
  saveHealthyPortfolioSnapshot,
} from '../services/portfolioSnapshot';
import { hydrateQuoteCache } from '../services/quoteCache';
import {
  createDefaultExecutionHandlers,
  submitExecutionOrder,
} from '../services/executionOrderService';
import { clearAllSensitiveLocalData } from '../services/clearSensitiveData';
import {
  getRecoveryRecommendations,
  validateEnvironmentForBoot,
  type EnvironmentIssue,
} from '../services/environmentValidation';
import {
  incrementRecoveryAttemptCount,
  readRecoveryAttemptCount,
  resetRecoveryAttemptCount,
  shouldEnterSafeBootMode,
  SAFE_BOOT_MAX_ATTEMPTS,
  type BootMode,
} from '../services/safeBoot';
import {
  countDiagnosticsBySeverity,
  exportDiagnosticsReport,
  exportDiagnosticsReportJson,
  hasDegradedDiagnostics,
  recordDiagnosticEvent,
} from '../services/structuredDiagnostics';
import { assessPersistedTamper, wrapJournalWithIntegrity } from '../services/tamperDetection';
import { STORAGE_KEYS } from '../constants/storageKeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearAllPersistedAppData,
  createDefaultAppState,
  loadAppStateTrusted,
  saveAppState,
} from '../services/storage';
import { secureWarn } from '../services/secureLogger';
import type { ExecutionLedgerMode } from '../types/execution';
import type { PriceRefreshOptions } from '../types/marketData';
import type { CrossAssetFlowSnapshot } from '../types/crossAssetFlow';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { ConciergeSessionMemory } from '../types/aiConciergeSession';
import type { AiPreferences, AiRequestStatus, AiStrategyChatResult } from '../types/aiStrategy';
import type {
  AllocationPlan,
  AppMode,
  AppState,
  DepositPlan,
  DividendRecord,
  Market,
  ManualOrderItem,
  SellAllLineItem,
  SellAllResult,
  NotificationSettings,
  PracticeStats,
  PortfolioPosition,
  RankedStock,
  TradeRecord,
  UserSettings,
} from '../types';
import type { PortfolioPriceSyncState, PriceSyncResult } from '../types/marketData';
import { isDev } from '../utils/isDev';

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
  priceSync: PortfolioPriceSyncState;
  saveTwelveDataApiKey: (apiKey: string) => Promise<void>;
  testTwelveDataConnection: () => Promise<{ ok: boolean; message: string }>;
  refreshPortfolioPrices: (options?: PriceRefreshOptions) => Promise<PriceSyncResult>;
  refresh: () => Promise<void>;
  resetAllAppData: (clearApiKeys: boolean) => Promise<void>;
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
  const [portfolioRevision, setPortfolioRevision] = useState(0);
  const [regimeRevision, setRegimeRevision] = useState(0);
  const [bootMode, setBootMode] = useState<BootMode>('normal');
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const [recoveryRecommendations, setRecoveryRecommendations] = useState<string[]>([]);
  const [environmentIssues, setEnvironmentIssues] = useState<EnvironmentIssue[]>([]);
  const [killSwitches, setKillSwitchesState] = useState<PersonalKillSwitches>({
    version: 1,
    readOnlyMode: false,
    disableMarketRefresh: false,
    disableTradeSubmission: false,
  });
  const [healthReport, setHealthReport] = useState<HealthCheckReport | null>(null);
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiPreferences, setAiPreferences] = useState<AiPreferences>({ ...DEFAULT_AI_PREFERENCES });
  const undoRemovalRef = useRef<{
    position: PortfolioPosition;
    ledger: 'manual' | 'practice';
  } | null>(null);
  const stateRef = useRef(state);
  const lastPersistedRef = useRef<AppState | null>(null);
  const initialPriceRefreshDone = useRef(false);
  stateRef.current = state;

  const enterSafeBootMode = useCallback(() => {
    setBootMode('safe');
    const fresh = createDefaultAppState();
    lastPersistedRef.current = fresh;
    setState(fresh);
    setSecurityWarnings((prev) =>
      prev.includes('安全モードで起動しています') ? prev : [...prev, '安全モードで起動しています'],
    );
  }, []);

  const clearSensitiveLocalData = useCallback(async () => {
    await clearAllSensitiveLocalData();
    setTwelveDataApiKey('');
    setAnalysisApiKeys({ newsApiKey: '', snsApiKey: '', earningsApiKey: '', redditApiKey: '', xApiKey: '' });
    setApiHealthDashboard(buildApiHealthDashboard(createEmptyHealthSnapshot()));
    setAiApiKey('');
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const safeBoot = await shouldEnterSafeBootMode();
      if (safeBoot) {
        enterSafeBootMode();
        const [apiKey, analysisKeys, aiState, attempts, loadedSwitches, loadedAiKey, loadedAiPrefs] =
          await Promise.all([
            loadTwelveDataApiKey().then(async (key) => {
          if (key.trim()) return key;
          const resolved = await resolveTwelveDataApiKey();
          return resolved.key;
        }),
            loadAnalysisApiKeys(),
            loadAiLearningState(),
            readRecoveryAttemptCount(),
            loadPersonalKillSwitches(),
            loadAiApiKey(),
            loadAiPreferences(),
          ]);
        setKillSwitchesState(loadedSwitches);
        setTwelveDataApiKey(apiKey);
        setAnalysisApiKeys(analysisKeys);
        setAiLearningState(aiState);
        setAiApiKey(loadedAiKey);
        setAiPreferences(loadedAiPrefs);
        void logApiKeyLoadAudit('safe_boot');
        recordDiagnosticEvent({
          type: 'safe_boot',
          severity: 'critical',
          module: 'AppContext',
          message: 'Safe boot mode active after repeated recovery failures',
          recoveryAction: 'Open Startup Diagnostics and review persisted data',
        });
        const env = validateEnvironmentForBoot({
          bootMode: 'safe',
          recoveryAttempts: attempts,
          maxRecoveryAttempts: SAFE_BOOT_MAX_ATTEMPTS,
          hasMarketDataApiKey: Boolean(apiKey.trim()),
        });
        setEnvironmentIssues(env.issues);
        setRecoveryRecommendations(getRecoveryRecommendations(env.issues, ['安全モードで起動しています']));
        setLoading(false);
        return;
      }

      const [
        tamper,
        loadResult,
        apiKey,
        analysisKeys,
        aiState,
        _operatorBehavior,
        _modelStability,
        _metaCapital,
        _quoteCache,
        _bursaCache,
        _marketDiag,
        loadedSwitches,
        loadedAiKey,
        loadedAiPrefs,
      ] = await Promise.all([
        assessPersistedTamper(),
        loadAppStateTrusted(),
        loadTwelveDataApiKey().then(async (key) => {
          if (key.trim()) return key;
          const resolved = await resolveTwelveDataApiKey();
          return resolved.key;
        }),
        loadAnalysisApiKeys(),
        loadAiLearningState(),
        loadOperatorBehaviorState(),
        loadModelStabilityState(),
        loadMetaCapitalState(),
        hydrateQuoteCache(),
        hydrateBursaFormatCache(),
        hydrateMarketDataDiagnostics(),
        loadPersonalKillSwitches(),
        loadAiApiKey(),
        loadAiPreferences(),
      ]);
      setKillSwitchesState(loadedSwitches);
      setAiApiKey(loadedAiKey);
      setAiPreferences(loadedAiPrefs);
      setApiHealthDashboard(buildApiHealthDashboard(await loadApiHealthSnapshot()));

      const warnings = tamper.findings.map((f) => f.messageJa);
      setSecurityWarnings(warnings);

      let loaded = loadResult.state;
      const trustPersisted =
        loadResult.trusted && tamper.trustAppState && tamper.severity !== 'critical';

      if (!trustPersisted) {
        secureWarn('[boot] refusing untrusted persisted app state');
        await incrementRecoveryAttemptCount();
        loaded = createDefaultAppState();
        if (tamper.trustHealthySnapshot) {
          loaded = await recoverPortfolioFromHealthySnapshot(loaded);
        }
      } else {
        await resetRecoveryAttemptCount();
        let restored = await restorePortfolioFromBackup(loaded);
        restored = await recoverPortfolioFromHealthySnapshot(restored);
        loaded = restored;
      }

      lastPersistedRef.current = loaded;
      setState(loaded);
      setTwelveDataApiKey(apiKey);
      const resolvedTd = await resolveTwelveDataApiKey();
      logTwelveDataEnvKeyAtStartup(resolvedTd);
      logXBearerEnvAtStartup();
      setAnalysisApiKeys(analysisKeys);
      setAiLearningState(aiState);
      setBootMode('normal');
      void logApiKeyLoadAudit('boot');

      const attempts = await readRecoveryAttemptCount();
      const env = validateEnvironmentForBoot({
        bootMode: 'normal',
        recoveryAttempts: attempts,
        maxRecoveryAttempts: SAFE_BOOT_MAX_ATTEMPTS,
        hasMarketDataApiKey: Boolean(apiKey.trim()),
      });
      setEnvironmentIssues(env.issues);
      setRecoveryRecommendations(getRecoveryRecommendations(env.issues, warnings));

      recordDiagnosticEvent({
        type: 'boot_complete',
        severity: trustPersisted ? 'info' : 'warning',
        module: 'AppContext',
        message: trustPersisted
          ? 'Boot completed with trusted persisted state'
          : 'Boot completed with recovered/default state',
        recoveryAction: trustPersisted ? undefined : 'Review Startup Diagnostics',
        metadata: { tamperSeverity: tamper.severity, warningCount: warnings.length },
      });

      if (env.productionBlocked && !isDev) {
        secureWarn('[boot] production blocked due to environment validation');
        enterSafeBootMode();
      }
    } catch (err) {
      await incrementRecoveryAttemptCount();
      secureWarn('[boot] refresh failed', err instanceof Error ? err.message : err);
      recordDiagnosticEvent({
        type: 'boot_failure',
        severity: 'critical',
        module: 'AppContext',
        message: err instanceof Error ? err.message : 'Boot refresh failed',
        recoveryAction: 'Retry or use safe boot mode',
      });
      enterSafeBootMode();
    } finally {
      setLoading(false);
    }
  }, [enterSafeBootMode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading || !areNotificationsSupported()) return;
    void initNotificationService();
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    const previous = lastPersistedRef.current ?? state;
    const guarded = guardAppStateForPersistence(state, previous);
    if (guarded !== state) {
      setState(guarded);
    }
    void saveAppState(guarded);
    void backupPortfolioIfNonEmpty(guarded);
    void saveHealthyPortfolioSnapshot(guarded);
    lastPersistedRef.current = guarded;
  }, [state, loading]);

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

  const diagnosticsReportJson = useCallback(() => exportDiagnosticsReportJson(), []);

  const degradedMode = useMemo(
    () =>
      bootMode === 'safe' ||
      securityWarnings.length > 0 ||
      hasDegradedDiagnostics() ||
      killSwitches.readOnlyMode,
    [bootMode, securityWarnings, killSwitches.readOnlyMode],
  );

  const readOnlyBlockedMessage = useMemo(
    () =>
      killSwitches.readOnlyMode
        ? '読み取り専用モード — 編集・売買・インポートは無効です'
        : null,
    [killSwitches.readOnlyMode],
  );

  const tradeBlockedReason = useCallback((): string | null => {
    const ks = getPersonalKillSwitchesSnapshot();
    if (ks.readOnlyMode) return HOLDING_ERRORS.readOnlyMode;
    if (ks.disableTradeSubmission) return HOLDING_ERRORS.tradeSubmissionStopped;
    return null;
  }, []);

  const persistPortfolioStateNow = useCallback(async (next: AppState): Promise<{ ok: boolean; error?: string }> => {
    try {
      const previous = lastPersistedRef.current ?? next;
      const guarded = guardAppStateForPersistence(next, previous);
      await saveAppState(guarded);
      void backupPortfolioIfNonEmpty(guarded);
      void saveHealthyPortfolioSnapshot(guarded);
      lastPersistedRef.current = guarded;
      stateRef.current = guarded;
      setState(guarded);
      return { ok: true };
    } catch {
      return { ok: false, error: HOLDING_ERRORS.saveFailed };
    }
  }, []);

  const setKillSwitch = useCallback(async (partial: Partial<Omit<PersonalKillSwitches, 'version'>>) => {
    const next = await savePersonalKillSwitches(partial);
    setKillSwitchesState(next);
    recordDiagnosticEvent({
      type: 'kill_switch',
      severity: 'info',
      module: 'AppContext',
      message: `Kill switch updated: ${JSON.stringify(partial)}`,
    });
  }, []);

  const runHealthCheck = useCallback(async () => {
    const report = await runDailyHealthCheck({
      state: stateRef.current,
      hasApiKey: Boolean(twelveDataApiKey.trim()),
      killSwitchReadOnly: killSwitches.readOnlyMode,
    });
    setHealthReport(report);
    recordDiagnosticEvent({
      type: 'health_check',
      severity: report.overall === 'critical' ? 'critical' : report.overall === 'warning' ? 'warning' : 'info',
      module: 'dailyHealthCheck',
      message: `Health check: ${report.overall}`,
    });
    return report;
  }, [twelveDataApiKey, killSwitches.readOnlyMode]);

  const exportBackupJson = useCallback(async () => {
    const journal = await loadExecutionJournal();
    return exportPersonalBackupJson(stateRef.current, journal.entries);
  }, []);

  const importBackupFromJson = useCallback(
    async (raw: string): Promise<{ ok: boolean; error?: string }> => {
      if (getPersonalKillSwitchesSnapshot().readOnlyMode) {
        return { ok: false, error: '読み取り専用モードではインポートできません' };
      }
      const validation = validatePersonalBackupJson(raw);
      if (validation.corrupt || !validation.envelope) {
        return {
          ok: false,
          error: validation.warnings.join('\n') || '破損したバックアップです',
        };
      }
      if (!validation.valid) {
        return {
          ok: false,
          error: `${validation.warnings.join('\n')}\n\n警告付きバックアップは設定画面から再確認してインポートしてください。`,
        };
      }
      const journal = validation.envelope.payload.executionJournalEntries;
      const next = applyPersonalBackupToState(stateRef.current, validation.envelope);
      setState(next);
      stateRef.current = next;
      await AsyncStorage.setItem(
        STORAGE_KEYS.executionJournal,
        JSON.stringify(wrapJournalWithIntegrity(journal)),
      );
      setPortfolioRevision((v) => v + 1);
      return { ok: true };
    },
    [],
  );

  const restoreLastHealthySnapshot = useCallback(async () => {
    const recovered = await recoverPortfolioFromHealthySnapshot(stateRef.current);
    if (recovered === stateRef.current) {
      return { ok: false, message: '復元可能な健全スナップショットがありません' };
    }
    setState(recovered);
    stateRef.current = recovered;
    setPortfolioRevision((v) => v + 1);
    recordDiagnosticEvent({
      type: 'restore_snapshot',
      severity: 'warning',
      module: 'AppContext',
      message: 'Restored portfolio from healthy snapshot',
    });
    return { ok: true, message: '健全スナップショットから復元しました' };
  }, []);

  const resetRequestQueue = useCallback(() => {
    resetMarketDataRequestQueue();
  }, []);

  const removeHolding = useCallback(
    async (positionId: string): Promise<{ ok: boolean; error?: string; canUndo?: boolean }> => {
      if (getPersonalKillSwitchesSnapshot().readOnlyMode) {
        return { ok: false, error: '読み取り専用モードでは削除できません' };
      }
      const ledger = stateRef.current.appMode === 'practice' ? 'practice' : 'manual';
      let removed: PortfolioPosition | null = null;
      setState((prev) => {
        if (ledger === 'practice') {
          const { portfolio, removed: r } = removePortfolioPosition(prev.practice.portfolio, positionId);
          removed = r;
          return { ...prev, practice: { ...prev.practice, portfolio } };
        }
        const { portfolio, removed: r } = removePortfolioPosition(prev.portfolio, positionId);
        removed = r;
        return { ...prev, portfolio };
      });
      if (!removed) return { ok: false, error: '保有が見つかりません' };
      undoRemovalRef.current = { position: removed, ledger };
      setPortfolioRevision((v) => v + 1);
      return { ok: true, canUndo: true };
    },
    [],
  );

  const undoLastHoldingRemoval = useCallback(() => {
    const undo = undoRemovalRef.current;
    if (!undo) return;
    setState((prev) => {
      if (undo.ledger === 'practice') {
        return {
          ...prev,
          practice: {
            ...prev.practice,
            portfolio: [undo.position, ...prev.practice.portfolio],
          },
        };
      }
      return { ...prev, portfolio: [undo.position, ...prev.portfolio] };
    });
    undoRemovalRef.current = null;
    setPortfolioRevision((v) => v + 1);
  }, []);

  const setAppMode = useCallback((appMode: AppMode) => {
    setState((prev) => ({ ...prev, appMode }));
  }, []);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    if (getPersonalKillSwitchesSnapshot().readOnlyMode) return;
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...partial } }));
  }, []);

  const addDeposit = useCallback((deposit: Omit<DepositPlan, 'id'>) => {
    setState((prev) => ({
      ...prev,
      deposits: [{ ...deposit, id: `${Date.now()}` }, ...prev.deposits],
    }));
  }, []);

  const toggleDepositCompleted = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      deposits: prev.deposits.map((d) => (d.id === id ? { ...d, completed: !d.completed } : d)),
    }));
  }, []);

  const submitTradeWithExecutionSafety = useCallback(
    async (trade: Omit<TradeRecord, 'id'>, ledgerMode: ExecutionLedgerMode) => {
      const blocked = tradeBlockedReason();
      if (blocked) return { ok: false as const, error: blocked };
      const handlers = createDefaultExecutionHandlers(
        () => stateRef.current,
        setState,
        (next) => {
          stateRef.current = next;
        },
      );
      const result = await submitExecutionOrder(
        {
          ledgerMode,
          symbol: trade.symbol,
          market: trade.market,
          currency: trade.currency,
          side: trade.side,
          quantity: trade.shares,
          requestedPrice: trade.price,
          brokerageFee: trade.brokerageFee,
          executedAt: trade.executedAt,
        },
        handlers,
      );
      if (result.ok) {
        setPortfolioRevision((v) => v + 1);
        const persist = await persistPortfolioStateNow(stateRef.current);
        if (!persist.ok) {
          return { ok: false as const, error: persist.error ?? HOLDING_ERRORS.saveFailed };
        }
        return { ok: true as const };
      }
      return {
        ok: false as const,
        error: result.error,
        uncertain: result.uncertain,
        duplicate: result.duplicate,
      };
    },
    [tradeBlockedReason, persistPortfolioStateNow],
  );

  const addManualHolding = useCallback(
    async (input: ManualHoldingInput) => {
      const blocked = tradeBlockedReason();
      if (blocked) return { ok: false, error: blocked };
      if (stateRef.current.appMode === 'practice') {
        return { ok: false, error: HOLDING_ERRORS.manualAddLiveAnalysisOnly };
      }

      const mutation = applyManualHoldingToState(stateRef.current, input);
      if (!mutation.ok) return { ok: false, error: mutation.error };

      if (mutation.journalEntry) {
        await appendExecutionJournalEntry(mutation.journalEntry);
      }

      const persist = await persistPortfolioStateNow(mutation.state);
      if (!persist.ok) {
        return { ok: false, error: persist.error ?? HOLDING_ERRORS.saveFailed };
      }
      setPortfolioRevision((v) => v + 1);
      return { ok: true };
    },
    [tradeBlockedReason, persistPortfolioStateNow],
  );

  const addTrade = useCallback(
    async (trade: Omit<TradeRecord, 'id'>) => submitTradeWithExecutionSafety(trade, 'manual'),
    [submitTradeWithExecutionSafety],
  );

  const addPracticeTrade = useCallback(
    async (trade: Omit<TradeRecord, 'id'>) => {
      const prev = stateRef.current;
      const stats = calculatePracticeStats(prev.practice);
      const bp = calculateBuyingPower(prev);
      const baseInput = buildInstitutionalRiskInputFromApp({
        state: prev,
        isPractice: true,
        practiceStats: stats,
        buyingPower: bp,
        regime: marketRegime,
      });
      const peak = stats.virtualCapitalMYR;
      const dd =
        peak > 0 ? Math.max(0, ((peak - stats.portfolioValueMYR) / peak) * 100) : 0;
      const riskInput = enrichInstitutionalRiskWithMetaCapital(
        enrichInstitutionalRiskWithModelStability(
          enrichInstitutionalRiskWithBehavioral(baseInput, {
            winCount: stats.winCount,
            lossCount: stats.lossCount,
            lastTradeIntent: {
              symbol: trade.symbol,
              side: trade.side,
              shares: trade.shares,
              priceMYR: toMYR(trade.price, trade.currency),
            },
          }),
          {
            aiLearning: aiLearningState,
            liveReturnEwmaPct: stats.totalReturnPct,
          },
        ),
        {
          totalCapitalMYR: stats.virtualCapitalMYR,
          cashBalanceMYR: stats.cashBalanceMYR,
          practiceStats: stats,
          portfolioDrawdownPct: dd,
        },
      );
      const gate = validateTradeIntent(
        {
          symbol: trade.symbol,
          market: trade.market,
          currency: trade.currency,
          side: trade.side,
          shares: trade.shares,
          price: trade.price,
          brokerageFee: trade.brokerageFee,
        },
        riskInput,
      );
      if (!gate.allowed) {
        const msg = gate.violations.map((v) => v.messageJa).join(' · ');
        return { ok: false, error: msg || 'リスク統制により取引を拒否しました' };
      }
      const finalTrade =
        gate.adjustedShares != null ? { ...trade, shares: gate.adjustedShares } : trade;

      const execResult = await submitTradeWithExecutionSafety(finalTrade, 'practice');
      if (!execResult.ok) return execResult;

      if (finalTrade.side === 'sell') {
        const latest = stateRef.current.practice.trades[0];
        void recordTradeOutcomeForBehavior({
          side: 'sell',
          realizedPnLMYR: latest?.realizedPnLMYR,
        });
      }
      return { ok: true };
    },
    [marketRegime, aiLearningState, submitTradeWithExecutionSafety],
  );

  const setPracticeVirtualCapital = useCallback((amountMYR: number) => {
    setState((prev) => ({
      ...prev,
      practice: setVirtualCapital(prev.practice, amountMYR),
    }));
  }, []);

  const addPracticeDeposit = useCallback((amountMYR: number) => {
    setState((prev) => ({
      ...prev,
      practice: addVirtualDeposit(prev.practice, amountMYR),
    }));
  }, []);

  const resetPracticeAccount = useCallback(() => {
    setState((prev) => ({ ...prev, practice: resetPractice() }));
  }, []);

  const addDividend = useCallback((dividend: Omit<DividendRecord, 'id'>) => {
    const record: DividendRecord = { ...dividend, id: `${Date.now()}` };
    setState((prev) => ({
      ...prev,
      dividends: [record, ...prev.dividends],
    }));
  }, []);

  const applyAllocationPractice = useCallback(async (plan: AllocationPlan) => {
    const result = await executePracticeBulkBuy(stateRef.current, plan);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        skipped: result.skipped,
        debug: result.debug,
      };
    }

    stateRef.current = result.state;
    setState(result.state);
    setPortfolioRevision((v) => v + 1);

    return {
      ok: true,
      boughtCount: result.boughtCount,
      skipped: result.skipped,
      partialSkipMessage: result.partialSkipMessage,
      debug: result.debug,
    };
  }, []);

  const reloadHoldingsFromStorage = useCallback(async () => {
    try {
      const { state: persisted } = await loadAppStateTrusted();
      const loaded = await restorePortfolioFromBackup(persisted);

      setState((prev) => {
        const practicePortfolio = mergePortfolioFromPersistence(
          prev.practice.portfolio,
          loaded.practice.portfolio,
        );
        const manualPortfolio = mergePortfolioFromPersistence(prev.portfolio, loaded.portfolio);
        const next: AppState = {
          ...prev,
          appMode: loaded.appMode,
          practice: { ...loaded.practice, portfolio: practicePortfolio },
          portfolio: manualPortfolio,
          trades: loaded.trades,
        };
        if (isDev) {
          console.log(
            'loaded holdings count',
            practicePortfolio.filter((p) => p.shares > 0).length,
          );
        }
        stateRef.current = next;
        return next;
      });
      setPortfolioRevision((v) => v + 1);
    } catch (err) {
      if (isDev) {
        console.log('loaded holdings on portfolio screen — storage read failed (debug)', err);
      }
    }
  }, []);

  const addAllocationToManualOrderList = useCallback((plan: AllocationPlan) => {
    const items = candidatesToManualBuyItems(plan.candidates);
    if (items.length === 0) {
      return { ok: false, error: 'この金額では購入できる銘柄がありません' };
    }
    setState((prev) => ({
      ...prev,
      manualOrderList: [...items, ...prev.manualOrderList],
    }));
    return { ok: true, addedCount: items.length };
  }, []);

  const addManualSellFromHolding = useCallback(
    (position: PortfolioPosition, name: string, currentPrice: number) => {
      const item: ManualOrderItem = {
        id: `manual-sell-${Date.now()}-${position.symbol}`,
        symbol: position.symbol,
        name,
        market: position.market,
        currency: position.currency,
        side: 'sell',
        entryPrice: currentPrice,
        estimatedShares: position.shares,
        allocationMYR: estimateProceedsMYR(position.shares, currentPrice, position.currency),
        orderMethod: MANUAL_SELL_ORDER_METHOD,
        completed: false,
        createdAt: new Date().toISOString(),
        source: 'holding',
      };
      setState((prev) => ({
        ...prev,
        manualOrderList: [item, ...prev.manualOrderList],
      }));
    },
    [],
  );

  const practiceSellAll = useCallback(
    (position: PortfolioPosition, _name: string, currentPrice: number) => {
      let error: string | undefined;
      setState((prev) => {
        const exec = executePracticeSellAll(prev.practice, position, _name, currentPrice);
        if (!exec.ok) {
          error = exec.error;
          return prev;
        }
        return { ...prev, practice: exec.practice };
      });
      if (error) return { ok: false, error };
      return { ok: true };
    },
    [],
  );

  const practiceSellAllHoldings = useCallback(
    (sells: Array<{ position: PortfolioPosition; name: string; sellPrice: number }>) => {
      let error: string | undefined;
      let result: SellAllResult | undefined;
      setState((prev) => {
        const exec = executePracticeSellAllHoldings(prev.practice, sells);
        if (!exec.ok) {
          error = exec.error;
          return prev;
        }
        result = exec.result;
        return { ...prev, practice: exec.practice };
      });
      if (error) return { ok: false, error };
      return { ok: true, result };
    },
    [],
  );

  const addManualSellAllChecklist = useCallback(
    (
      entries: Array<{ position: PortfolioPosition; name: string; currentPrice: number }>,
      skipped: SellAllLineItem[],
    ): SellAllResult => {
      const items = buildManualSellAllItems(entries);
      const activeLines = entries.map((e) =>
        buildSellAllLineItem(e.position, e.name, e.currentPrice),
      );
      const result = buildManualSellAllResult([...activeLines, ...skipped], items.length > 0);
      setState((prev) => ({
        ...prev,
        manualOrderList: [...items, ...prev.manualOrderList],
      }));
      return result;
    },
    [],
  );

  const confirmManualOrderAsExecuted = useCallback(
    async (orderId: string, input: ManualOrderConfirmInput) => {
      const blocked = tradeBlockedReason();
      if (blocked) return { ok: false, error: blocked };

      const mutation = confirmManualOrderInState(stateRef.current, orderId, input);
      if (!mutation.ok) return { ok: false, error: mutation.error };

      if (mutation.journalEntry) {
        await appendExecutionJournalEntry(mutation.journalEntry);
      }

      const persist = await persistPortfolioStateNow(mutation.state);
      if (!persist.ok) {
        return { ok: false, error: persist.error ?? HOLDING_ERRORS.saveFailed };
      }
      setPortfolioRevision((v) => v + 1);
      return { ok: true };
    },
    [tradeBlockedReason, persistPortfolioStateNow],
  );

  const clearCompletedManualOrders = useCallback(() => {
    setState((prev) => ({
      ...prev,
      manualOrderList: prev.manualOrderList.filter((i) => !i.completed),
    }));
  }, []);

  const updateNotificationSettings = useCallback((partial: Partial<NotificationSettings>) => {
    setState((prev) => ({
      ...prev,
      notificationSettings: { ...prev.notificationSettings, ...partial },
    }));
  }, []);

  const dispatchAlert = useCallback(async (payload: AlertPayload): Promise<boolean> => {
    const current = stateRef.current;
    const { nextState, shouldSend } = prepareAlertDispatch(current, payload);
    if (!shouldSend) return false;

    setState(nextState);
    stateRef.current = nextState;

    await presentLocalNotification({
      title: payload.title,
      body: payload.body,
      sound: nextState.notificationSettings.sound,
      vibrationEnabled: nextState.notificationSettings.vibrationEnabled,
      alertType: payload.type,
      symbol: payload.symbol,
      market: payload.market,
    });
    return true;
  }, []);

  const dispatchAlerts = useCallback(
    async (payloads: AlertPayload[]) => {
      for (const payload of payloads) {
        await dispatchAlert(payload);
      }
    },
    [dispatchAlert],
  );

  const sendTestNotification = useCallback(async () => {
    const settings = stateRef.current.notificationSettings;
    await presentLocalNotification({
      title: 'テスト通知',
      body: '選択した通知音のテストです。実際の売買は行われません。',
      sound: settings.sound,
      vibrationEnabled: settings.vibrationEnabled,
      alertType: 'buy_candidate',
    });
  }, []);

  const clearNotificationHistory = useCallback(() => {
    setState((prev) => ({ ...prev, notificationHistory: [] }));
  }, []);

  const requestNotificationsPermission = useCallback(async () => {
    return initNotificationService();
  }, []);

  const saveTwelveDataApiKey = useCallback(async (apiKey: string) => {
    await persistApiKey(apiKey);
    const reloaded = await loadTwelveDataApiKey();
    setTwelveDataApiKey(reloaded);
    await logApiKeyLoadAudit(apiKey.trim() ? 'save_twelve_data' : 'delete_twelve_data');
  }, []);

  const saveAnalysisApiKeys = useCallback(async (keys: Partial<AnalysisApiKeys>) => {
    await persistAnalysisApiKeys(keys);
    setAnalysisApiKeys((prev) => ({
      newsApiKey: keys.newsApiKey !== undefined ? keys.newsApiKey : prev.newsApiKey,
      snsApiKey: keys.snsApiKey !== undefined ? keys.snsApiKey : prev.snsApiKey,
      earningsApiKey: keys.earningsApiKey !== undefined ? keys.earningsApiKey : prev.earningsApiKey,
      redditApiKey: keys.redditApiKey !== undefined ? keys.redditApiKey : prev.redditApiKey,
      xApiKey: keys.xApiKey !== undefined ? keys.xApiKey : prev.xApiKey,
    }));
  }, []);

  const testApiConnection = useCallback(async () => {
    try {
      const quote = await testTwelveDataConnection(twelveDataApiKey);
      return { ok: true, message: `接続成功（AAPL: $${quote.price.toFixed(2)}）` };
    } catch (err) {
      const message = err instanceof Error ? err.message : '接続に失敗しました';
      return { ok: false, message };
    }
  }, [twelveDataApiKey]);

  const refreshPortfolioPrices = useCallback(
    (options?: PriceRefreshOptions): Promise<PriceSyncResult> => {
      const silent = options?.silent ?? false;

      return requestPortfolioPriceRefresh(async () => {
        const ks = getPersonalKillSwitchesSnapshot();
        if (ks.disableMarketRefresh) {
          const cached: PriceSyncResult = {
            ok: true,
            updatedCount: 0,
            failures: [],
            marketClosedHint: false,
            error: '株価自動更新は緊急停止中です（キャッシュ表示）',
            successCount: 0,
            failedCount: 0,
            partialFailure: false,
            totalFailure: false,
            displayStatus: 'cached',
          };
          setPriceSync((prev) => ({
            ...prev,
            loading: false,
            refreshingSymbols: [],
            displayStatus: 'cached',
            lastResult: cached,
          }));
          return cached;
        }
        const apiKey = twelveDataApiKey;

        setPriceSync((prev) => ({
          ...prev,
          loading: true,
          lastError: undefined,
          refreshingSymbols: getActivePortfolio(stateRef.current).map(
            (p) => `${p.market}:${p.symbol}`,
          ),
          displayStatus: 'fetching',
          connectionPhase: 'connecting',
          connectionDetail: undefined,
          currentSymbol: undefined,
          resolvedSymbol: undefined,
          quoteFetchDebug: undefined,
        }));

        let holdingsBefore = 0;
        try {
          const portfolio = getActivePortfolio(stateRef.current);
          holdingsBefore = portfolio.filter((p) => (p.shares ?? 0) > 0).length;
          recordRefreshSessionStart(silent);
          const { portfolio: syncedPrices, result } = await syncPortfolioPrices(apiKey, portfolio, {
            symbolsOnly: options?.symbolsOnly,
            onProgress: (progress) => {
              setPriceSync((prev) => ({
                ...prev,
                connectionPhase: progress.phase,
                connectionDetail: progress.detail
                  ? progress.detail.length > 200
                    ? progress.detail.split('\n').slice(0, 4).join('\n')
                    : progress.detail
                  : undefined,
                currentSymbol: progress.symbol,
                activeProvider: progress.provider,
                resolvedSymbol: progress.resolvedSymbol ?? prev.resolvedSymbol,
                quoteFetchDebug: progress.debug ?? prev.quoteFetchDebug,
                lastPriceProvider: progress.phase === 'success' ? progress.provider : prev.lastPriceProvider,
              }));
            },
          });
          const mode = stateRef.current.appMode === 'practice' ? 'practice' : 'manual';
          let nextState = applyPriceRefreshTransaction(
            stateRef.current,
            mode,
            syncedPrices,
          );
          if (mode === 'manual') {
            const valueMYR = portfolioMarketValueMYR(nextState);
            const today = new Date().toISOString().slice(0, 10);
            nextState = {
              ...nextState,
              performanceHistory: appendPerformanceSnapshot(
                nextState.performanceHistory,
                today,
                valueMYR,
              ),
            };
          }
          const holdingsAfter = getActivePortfolio(nextState).filter(
            (p) => (p.shares ?? 0) > 0,
          ).length;
          recordRefreshSessionEnd({ result, holdingsBefore, holdingsAfter });

          setState(nextState);

          const recovered = await recoverPortfolioFromHealthySnapshot(nextState);
          if (recovered !== nextState) {
            setState(recovered);
            stateRef.current = recovered;
            nextState = recovered;
          } else {
            stateRef.current = nextState;
          }
          setPortfolioRevision((v) => v + 1);

          if (!silent) {
            const alerts = collectPeriodicAlerts(nextState);
            for (const payload of alerts) {
              await dispatchAlert(payload);
            }
          }

          setPriceSync((prev) => ({
            ...prev,
            loading: false,
            refreshingSymbols: [],
            displayStatus: result.displayStatus ?? 'complete',
            connectionPhase:
              result.successCount > 0
                ? 'success'
                : result.failures.some((f) => f.rateLimited)
                  ? 'rate_limit'
                  : result.timedOut
                    ? 'timeout'
                    : result.totalFailure
                      ? 'error'
                      : 'cached',
            connectionDetail: result.totalFailure ? result.error : undefined,
            currentSymbol: undefined,
            activeProvider: undefined,
            resolvedSymbol: undefined,
            quoteFetchDebug: undefined,
            lastPriceProvider: result.lastPriceProvider ?? prev.lastPriceProvider,
            lastSuccessAt:
              result.successCount > 0 ? new Date().toISOString() : prev.lastSuccessAt,
            lastError: result.totalFailure
              ? result.error ??
                (!silent && result.failedCount > 0
                  ? `価格取得に失敗: ${result.failedCount}件`
                  : undefined)
              : undefined,
            marketClosedHint: result.marketClosedHint,
            lastResult: result,
          }));

          return result;
        } catch (err) {
          if (isDev) {
            console.log('[portfolio-refresh] unexpected error (debug)', err);
          }
          const fallback: PriceSyncResult = {
            ok: false,
            updatedCount: 0,
            failures: [],
            marketClosedHint: false,
            error: '株価更新中にエラーが発生しました',
            successCount: 0,
            failedCount: 0,
            partialFailure: false,
            totalFailure: true,
          };
          recordRefreshSessionEnd({
            result: fallback,
            holdingsBefore,
            holdingsAfter: getActivePortfolio(stateRef.current).filter((p) => (p.shares ?? 0) > 0).length,
          });
          setPriceSync((prev) => ({
            ...prev,
            loading: false,
            refreshingSymbols: [],
            displayStatus: 'connection_failed',
            lastResult: fallback,
          }));
          return fallback;
        } finally {
          setPriceSync((prev) => ({
            ...prev,
            loading: false,
            refreshingSymbols: [],
          }));
        }
      }, options);
    },
    [twelveDataApiKey, dispatchAlert],
  );

  useEffect(() => {
    if (loading) return;
    let unregisterFlush = () => {};
    let unregisterRecovery = () => {};
    void import('../services/productionStability/productionStabilityRuntime').then(
      ({ registerCrashSafeFlush }) =>
        import('../services/productionStability/offlineRecovery').then(
          ({ registerOfflineRecoveryHandler }) => {
            unregisterFlush = registerCrashSafeFlush(async () => {
              const previous = lastPersistedRef.current ?? stateRef.current;
              const guarded = guardAppStateForPersistence(stateRef.current, previous);
              await saveAppState(guarded);
              void backupPortfolioIfNonEmpty(guarded);
              void saveHealthyPortfolioSnapshot(guarded);
              lastPersistedRef.current = guarded;
            });
            unregisterRecovery = registerOfflineRecoveryHandler(async () => {
              await refreshPortfolioPrices({ silent: true });
            });
          },
        ),
    );
    return () => {
      unregisterFlush();
      unregisterRecovery();
    };
  }, [loading, refreshPortfolioPrices]);

  // 起動時の自動株価取得は行わない（15分間隔・画面内の手動更新のみ）
  useEffect(() => {
    initialPriceRefreshDone.current = true;
  }, []);

  const saveAiApiKey = useCallback(async (apiKey: string) => {
    await persistAiApiKey(apiKey);
    const display = isUsableApiKey(apiKey) ? apiKey.trim() : '';
    setAiApiKey(display);
    if (isUsableApiKey(apiKey)) {
      const snapshot = await updateProviderHealth('openai', {
        ...createDefaultProviderHealth('openai'),
        status: 'unconfigured',
        outcome: 'unconfigured',
        lastCheckedAt: null,
        lastSuccessAt: null,
        lastErrorType: null,
        usesMockFallback: true,
        messageJa: 'キー保存済み・未確認',
        pingSummaryJa: null,
      });
      setApiHealthDashboard(buildApiHealthDashboard(snapshot));
    }
  }, []);

  const runTestAiApiConnection = useCallback(async () => {
    const result = await testAiApiConnection({ apiKey: aiApiKey });
    const snapshot = await loadApiHealthSnapshot();
    setApiHealthDashboard(buildApiHealthDashboard(snapshot));
    return result;
  }, [aiApiKey]);

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
        priceSync,
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
            priceSync.displayStatus === 'cached' ||
            priceSync.displayStatus === 'partial_failure' ||
            priceSync.displayStatus === 'connection_failed' ||
            priceSync.lastError != null,
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
        const priceSyncStatusJa =
          priceSync.displayStatus === 'complete'
            ? '取得完了'
            : priceSync.displayStatus === 'cached'
              ? 'キャッシュ'
              : priceSync.displayStatus === 'partial_failure'
                ? '一部失敗'
                : priceSync.displayStatus === 'connection_failed'
                  ? '接続失敗'
                  : priceSync.displayStatus === 'fetching'
                    ? '取得中'
                    : String(priceSync.displayStatus ?? 'idle');
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
      priceSync,
    ],
  );

  const clearAiChatHistoryHandler = useCallback(async () => {
    await clearAiChatHistory();
  }, []);

  const refreshApiHealth = useCallback(async () => {
    const dash = await refreshApiHealthDashboard();
    setApiHealthDashboard(dash);
  }, []);

  const applyWizardKeyToState = useCallback((providerId: ApiProviderId, apiKey: string) => {
    const trimmed = apiKey.trim();
    switch (providerId) {
      case 'openai':
        setAiApiKey(trimmed);
        break;
      case 'news':
        setAnalysisApiKeys((prev) => ({ ...prev, newsApiKey: trimmed }));
        break;
      case 'earnings':
        setAnalysisApiKeys((prev) => ({ ...prev, earningsApiKey: trimmed }));
        break;
      case 'reddit':
        setAnalysisApiKeys((prev) => ({ ...prev, redditApiKey: trimmed }));
        break;
      case 'x':
        setAnalysisApiKeys((prev) => ({ ...prev, xApiKey: trimmed }));
        break;
      default:
        break;
    }
  }, []);

  const saveWizardApiKeyAndVerify = useCallback(
    async (providerId: ApiProviderId, apiKey: string) => {
      const config = getWizardProviderConfig(providerId);
      await saveWizardApiKey(config.secretKeyId, apiKey);
      if (providerId === 'openai') {
        await persistAiApiKey(apiKey);
      } else {
        const partial: Partial<AnalysisApiKeys> = {};
        if (providerId === 'news') partial.newsApiKey = apiKey;
        if (providerId === 'earnings') partial.earningsApiKey = apiKey;
        if (providerId === 'reddit') partial.redditApiKey = apiKey;
        if (providerId === 'x') partial.xApiKey = apiKey;
        await persistAnalysisApiKeys(partial);
      }
      applyWizardKeyToState(providerId, apiKey);
      const health = await verifyAndPersistProvider(providerId, apiKey);
      setApiHealthDashboard(await refreshApiHealthDashboard());
      return health;
    },
    [applyWizardKeyToState],
  );

  const verifyWizardApiProvider = useCallback(async (providerId: ApiProviderId, apiKey: string) => {
    const health = await verifyAndPersistProvider(providerId, apiKey);
    setApiHealthDashboard(await refreshApiHealthDashboard());
    return health;
  }, []);

  const resetAllAppData = useCallback(async (clearApiKeys: boolean) => {
    await clearAllPersistedAppData(clearApiKeys);
    await clearAiChatHistory();
    const fresh = createDefaultAppState();
    const aiFresh = await resetAiLearningStorage();
    setState(fresh);
    setAiLearningState(aiFresh);
    initialPriceRefreshDone.current = false;
    resetPortfolioRefreshCoordinator();
    setPriceSync({ loading: false, marketClosedHint: false });
    setAiPreferences({ ...DEFAULT_AI_PREFERENCES });

    if (clearApiKeys) {
      setTwelveDataApiKey('');
      setAnalysisApiKeys({ newsApiKey: '', snsApiKey: '', earningsApiKey: '', redditApiKey: '', xApiKey: '' });
    setApiHealthDashboard(buildApiHealthDashboard(createEmptyHealthSnapshot()));
      setAiApiKey('');
    } else {
      const [key, analysis, loadedAiKey, loadedAiPrefs] = await Promise.all([
        loadTwelveDataApiKey().then(async (key) => {
          if (key.trim()) return key;
          const resolved = await resolveTwelveDataApiKey();
          return resolved.key;
        }),
        loadAnalysisApiKeys(),
        loadAiApiKey(),
        loadAiPreferences(),
      ]);
      setTwelveDataApiKey(key);
      setAnalysisApiKeys(analysis);
      setAiApiKey(loadedAiKey);
      setAiPreferences(loadedAiPrefs);
    }
  }, []);

  const addScreenerCandidateToManualList = useCallback((stock: RankedStock) => {
    let duplicate = false;
    setState((prev) => {
      const exists = prev.manualOrderList.some(
        (i) =>
          i.symbol === stock.symbol &&
          i.market === stock.market &&
          i.side === 'buy' &&
          !i.completed,
      );
      if (exists) {
        duplicate = true;
        return prev;
      }
      const shares = 1;
      const entryPrice = stock.price > 0 ? stock.price : 0;
      const item: ManualOrderItem = {
        id: `screener-${stock.market}-${stock.symbol}-${Date.now()}`,
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        currency: stock.currency,
        side: 'buy',
        entryPrice,
        estimatedShares: shares,
        allocationMYR: entryPrice > 0 ? toMYR(entryPrice * shares, stock.currency) : 0,
        orderMethod: MANUAL_ORDER_METHOD,
        completed: false,
        createdAt: new Date().toISOString(),
        source: 'screener',
      };
      return { ...prev, manualOrderList: [item, ...prev.manualOrderList] };
    });
    if (duplicate) return { ok: false, error: 'すでに候補リストに追加されています' };
    return { ok: true };
  }, []);

  const updateHoldingCurrentPrice = useCallback((positionId: string, currentPrice: number) => {
    if (getPersonalKillSwitchesSnapshot().readOnlyMode) {
      return { ok: false, error: '読み取り専用モードでは編集できません' };
    }
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      return { ok: false, error: '0より大きい数値を入力してください。' };
    }

    setState((prev) => {
      let next: AppState;
      if (prev.appMode === 'practice') {
        const portfolio = updatePositionCurrentPrice(prev.practice.portfolio, positionId, currentPrice);
        next = { ...prev, practice: { ...prev.practice, portfolio } };
      } else {
        const portfolio = updatePositionCurrentPrice(prev.portfolio, positionId, currentPrice);
        const valueMYR = portfolioMarketValueMYR({ ...prev, portfolio });
        const today = new Date().toISOString().slice(0, 10);
        const performanceHistory = appendPerformanceSnapshot(prev.performanceHistory, today, valueMYR);
        next = { ...prev, portfolio, performanceHistory };
      }
      stateRef.current = next;
      return next;
    });

    return { ok: true };
  }, []);

  const updateHoldingSymbol = useCallback((positionId: string, symbol: string) => {
    if (getPersonalKillSwitchesSnapshot().readOnlyMode) {
      return { ok: false, error: '読み取り専用モードでは編集できません' };
    }
    const trimmed = symbol.trim().toUpperCase();
    if (!trimmed) return { ok: false, error: '銘柄コードを入力してください。' };

    setState((prev) => {
      let next: AppState;
      if (prev.appMode === 'practice') {
        const portfolio = updatePositionSymbol(prev.practice.portfolio, positionId, trimmed);
        next = { ...prev, practice: { ...prev.practice, portfolio } };
      } else {
        const portfolio = updatePositionSymbol(prev.portfolio, positionId, trimmed);
        next = { ...prev, portfolio };
      }
      stateRef.current = next;
      return next;
    });
    return { ok: true };
  }, []);

  const updateHoldingMarket = useCallback((positionId: string, market: Market) => {
    if (getPersonalKillSwitchesSnapshot().readOnlyMode) {
      return { ok: true };
    }
    setState((prev) => {
      let next: AppState;
      if (prev.appMode === 'practice') {
        const portfolio = updatePositionMarket(prev.practice.portfolio, positionId, market);
        next = { ...prev, practice: { ...prev.practice, portfolio } };
      } else {
        const portfolio = updatePositionMarket(prev.portfolio, positionId, market);
        next = { ...prev, portfolio };
      }
      stateRef.current = next;
      return next;
    });
    return { ok: true };
  }, []);

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
      priceSync,
      saveTwelveDataApiKey,
      testTwelveDataConnection: testApiConnection,
      refreshPortfolioPrices,
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
      priceSync,
      saveTwelveDataApiKey,
      testApiConnection,
      refreshPortfolioPrices,
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
      apiHealthDashboard,
      refreshApiHealth,
      saveWizardApiKeyAndVerify,
      verifyWizardApiProvider,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
