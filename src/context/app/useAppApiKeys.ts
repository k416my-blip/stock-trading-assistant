import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { AlertPayload } from '../../services/alertEngine';
import { collectPeriodicAlerts } from '../../services/alertEngine';
import {
  saveAnalysisApiKeys as persistAnalysisApiKeys,
  type AnalysisApiKeys,
} from '../../services/analysisApiKeys';
import { saveAiApiKey as persistAiApiKey } from '../../services/aiApiKey';
import { isUsableApiKey } from '../../services/apiKeyValidation';
import { createDefaultProviderHealth } from '../../services/apiHealthDashboard';
import { buildApiHealthDashboard } from '../../services/apiHealthDashboard';
import { testAiApiConnection } from '../../services/aiStrategyService';
import {
  getWizardProviderConfig,
  refreshApiHealthDashboard,
  saveWizardApiKey,
  verifyAndPersistProvider,
} from '../../services/apiSetupWizardService';
import { createEmptyHealthSnapshot, loadApiHealthSnapshot, updateProviderHealth } from '../../services/apiHealthStorage';
import { logApiKeyLoadAudit } from '../../services/apiKeyLoadDiagnostics';
import {
  getTwelveDataApiKey,
  saveTwelveDataApiKey as persistApiKey,
  logTwelveDataKeyForPriceUpdate,
  logTwelveDataKeyForTest,
} from '../../services/marketDataApiKey';
import { testTwelveDataConnection } from '../../services/marketDataService';
import { MARKET_DATA_MESSAGES } from '../../constants/marketData';
import {
  applyEmptyHoldingsPriceSyncState,
  clearStalePriceSyncErrors,
} from '../../services/priceSyncEmptyHoldings';
import { finalizePriceSyncResult } from '../../services/priceSyncDisplay';
import { getActivePortfolio, syncPortfolioPrices } from '../../services/portfolioPriceUpdate';
import { applyPriceRefreshTransaction } from '../../services/portfolioTransaction';
import { requestPortfolioPriceRefresh } from '../../services/portfolioRefreshCoordinator';
import { getPersonalKillSwitchesSnapshot } from '../../services/personalKillSwitches';
import {
  appendPerformanceSnapshot,
  portfolioMarketValueMYR,
} from '../../services/portfolio';
import { recoverPortfolioFromHealthySnapshot } from '../../services/portfolioSnapshot';
import { backupPortfolioIfNonEmpty } from '../../services/portfolioBackup';
import { guardAppStateForPersistence } from '../../services/portfolioPersistenceGuard';
import { saveHealthyPortfolioSnapshot } from '../../services/portfolioSnapshot';
import { saveAppState } from '../../services/storage';
import {
  recordRefreshSessionEnd,
  recordRefreshSessionStart,
} from '../../services/marketDataDiagnostics';
import type { ApiHealthDashboard, ApiProviderHealth, ApiProviderId } from '../../types/apiSetup';
import type { PortfolioPriceSyncState, PriceRefreshOptions, PriceSyncResult } from '../../types/marketData';
import type { AppState } from '../../types';
import { isDev } from '../../utils/isDev';
import type { AppContextRefs } from './appContextShared';

type Params = Pick<AppContextRefs, 'stateRef' | 'lastPersistedRef' | 'initialPriceRefreshDone'> & {
  setState: Dispatch<SetStateAction<AppState>>;
  loading: boolean;
  setPortfolioRevision: Dispatch<SetStateAction<number>>;
  setPriceSync: Dispatch<SetStateAction<PortfolioPriceSyncState>>;
  dispatchAlert: (payload: AlertPayload) => Promise<boolean>;
  twelveDataApiKey: string;
  setTwelveDataApiKey: (key: string) => void;
  analysisApiKeys: AnalysisApiKeys;
  setAnalysisApiKeys: Dispatch<SetStateAction<AnalysisApiKeys>>;
  aiApiKey: string;
  setAiApiKey: (key: string) => void;
  apiHealthDashboard: ApiHealthDashboard;
  setApiHealthDashboard: Dispatch<SetStateAction<ApiHealthDashboard>>;
};

export function useAppApiKeys({
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
}: Params) {

  const clearPriceSyncErrorState = useCallback(() => {
    setPriceSync((prev) => clearStalePriceSyncErrors(prev));
  }, [setPriceSync]);

  const syncPriceSyncForEmptyHoldings = useCallback(() => {
    const count = getActivePortfolio(stateRef.current).filter((p) => (p.shares ?? 0) > 0).length;
    if (count === 0) {
      setPriceSync((prev) => applyEmptyHoldingsPriceSyncState(prev));
    }
  }, [setPriceSync, stateRef]);

  const reloadTwelveDataApiKeyFromStorage = useCallback(async () => {
    const { key } = await getTwelveDataApiKey();
    const normalizedKey = key.trim();
    console.log('LOADED API KEY', {
      source: 'reloadTwelveDataApiKeyFromStorage',
      keyPresent: normalizedKey.length > 0,
      keyLength: normalizedKey.length,
    });
    setTwelveDataApiKey(normalizedKey);
    const holdingsCount = getActivePortfolio(stateRef.current).filter(
      (p) => (p.shares ?? 0) > 0,
    ).length;
    if (holdingsCount === 0) {
      syncPriceSyncForEmptyHoldings();
      return;
    }
    if (normalizedKey) {
      setPriceSync((prev) => clearStalePriceSyncErrors(prev));
    }
  }, [syncPriceSyncForEmptyHoldings, stateRef, setPriceSync]);

  const saveTwelveDataApiKey = useCallback(async (apiKey: string) => {
    const trimmed = apiKey.trim();
    await persistApiKey(trimmed);
    console.log('SAVED API KEY', {
      source: 'saveTwelveDataApiKey',
      keyPresent: trimmed.length > 0,
      keyLength: trimmed.length,
    });
    const { key } = await getTwelveDataApiKey();
    const reloaded = key.trim();
    console.log('[API KEY ROUNDTRIP]', {
      source: 'saveTwelveDataApiKey',
      matchedAfterSave: reloaded === trimmed,
      loadedLength: reloaded.length,
    });
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
    const { key: apiKey } = await getTwelveDataApiKey();
    setTwelveDataApiKey(apiKey);
    logTwelveDataKeyForTest(apiKey);
    try {
      const quote = await testTwelveDataConnection(apiKey);
      clearPriceSyncErrorState();
      return { ok: true, message: `接続成功（AAPL: $${quote.price.toFixed(2)}）` };
    } catch (err) {
      const message = err instanceof Error ? err.message : '接続に失敗しました';
      return { ok: false, message };
    }
  }, [clearPriceSyncErrorState]);

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
        const { key: loadedKey } = await getTwelveDataApiKey();
        const apiKey = loadedKey.trim();
        setTwelveDataApiKey(apiKey);
        logTwelveDataKeyForPriceUpdate(apiKey);
        if (!apiKey) {
          const blocked: PriceSyncResult = finalizePriceSyncResult({
            ok: false,
            updatedCount: 0,
            failures: [],
            marketClosedHint: false,
            error: 'Twelve Data APIキー未設定のため、株価更新を開始しませんでした。',
          });
          setPriceSync((prev) => ({
            ...prev,
            loading: false,
            refreshingSymbols: [],
            displayStatus: 'idle',
            connectionPhase: 'error',
            connectionDetail: 'APIキー未設定',
            lastError: blocked.error,
            lastResult: blocked,
          }));
          return blocked;
        }

        setPriceSync((prev) => ({
          ...prev,
          loading: true,
          lastError: undefined,
          lastResult: undefined,
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

          if (holdingsBefore === 0) {
            const emptyResult = finalizePriceSyncResult({
              ok: true,
              updatedCount: 0,
              failures: [],
              marketClosedHint: false,
            });
            setPriceSync((prev) => ({
              ...prev,
              loading: false,
              refreshingSymbols: [],
              displayStatus: 'idle',
              connectionPhase: undefined,
              connectionDetail: MARKET_DATA_MESSAGES.noHoldings,
              lastError: undefined,
              lastResult: undefined,
              currentSymbol: undefined,
              activeProvider: undefined,
              resolvedSymbol: undefined,
              quoteFetchDebug: undefined,
            }));
            return emptyResult;
          }

          recordRefreshSessionStart(silent);
          let lastProgressUiAt = 0;
          const { portfolio: syncedPrices, result } = await syncPortfolioPrices(apiKey, portfolio, {
            symbolsOnly: options?.symbolsOnly,
            onProgress: (progress) => {
              const now = Date.now();
              const force =
                progress.phase === 'success' ||
                progress.phase === 'error' ||
                progress.phase === 'rate_limit';
              if (!force && now - lastProgressUiAt < 450) return;
              lastProgressUiAt = now;
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
          stateRef.current = nextState;

          const recovered = await recoverPortfolioFromHealthySnapshot(nextState);
          if (recovered !== nextState) {
            setState(recovered);
            stateRef.current = recovered;
            nextState = recovered;
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
    [dispatchAlert, setPriceSync, setState, stateRef, setPortfolioRevision],
  );

  useEffect(() => {
    if (loading) return;
    let unregisterFlush = () => {};
    let unregisterRecovery = () => {};
    void import('../../services/productionStability/productionStabilityRuntime').then(
      ({ registerCrashSafeFlush }) =>
        import('../../services/productionStability/offlineRecovery').then(
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
              await refreshPortfolioPrices({ silent: true, trigger: 'recovery' });
            });
          },
        ),
    );
    return () => {
      unregisterFlush();
      unregisterRecovery();
    };
  }, [loading, refreshPortfolioPrices, lastPersistedRef, stateRef]);

  useEffect(() => {
    initialPriceRefreshDone.current = true;
  }, [initialPriceRefreshDone]);

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

  return {
    clearPriceSyncErrorState,
    syncPriceSyncForEmptyHoldings,
    reloadTwelveDataApiKeyFromStorage,
    saveTwelveDataApiKey,
    saveAnalysisApiKeys,
    testApiConnection,
    refreshPortfolioPrices,
    saveAiApiKey,
    runTestAiApiConnection,
    refreshApiHealth,
    applyWizardKeyToState,
    saveWizardApiKeyAndVerify,
    verifyWizardApiProvider,
  };
}
