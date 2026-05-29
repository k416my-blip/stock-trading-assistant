import { useCallback, useEffect, useMemo, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnalysisApiKeys } from '../../services/analysisApiKeys';
import { loadAnalysisApiKeys } from '../../services/analysisApiKeys';
import { loadAiApiKey } from '../../services/aiApiKey';
import { createDefaultProviderHealth } from '../../services/apiHealthDashboard';
import { buildApiHealthDashboard } from '../../services/apiHealthDashboard';
import { createEmptyHealthSnapshot, loadApiHealthSnapshot } from '../../services/apiHealthStorage';
import { logApiKeyLoadAudit } from '../../services/apiKeyLoadDiagnostics';
import type { AiLearningState } from '../../services/analysis/aiLearning';
import { loadAiLearningState } from '../../services/analysis/aiLearning';
import { loadAiPreferences } from '../../services/aiPreferencesStorage';
import { hydrateBursaFormatCache } from '../../services/bursaSymbolFormat';
import { clearAllSensitiveLocalData } from '../../services/clearSensitiveData';
import { runDailyHealthCheck, type HealthCheckReport } from '../../services/dailyHealthCheckService';
import {
  getRecoveryRecommendations,
  validateEnvironmentForBoot,
  type EnvironmentIssue,
} from '../../services/environmentValidation';
import {
  applyPersonalBackupToState,
  exportPersonalBackupJson,
  validatePersonalBackupJson,
} from '../../services/personalBackupService';
import {
  getPersonalKillSwitchesSnapshot,
  loadPersonalKillSwitches,
  resetMarketDataRequestQueue,
  savePersonalKillSwitches,
  type PersonalKillSwitches,
} from '../../services/personalKillSwitches';
import {
  loadTwelveDataApiKey,
  logTwelveDataEnvKeyAtStartup,
  resolveTwelveDataApiKey,
} from '../../services/marketDataApiKey';
import { logXBearerEnvAtStartup } from '../../services/xBearerToken';
import { hydrateMarketDataDiagnostics } from '../../services/marketDataDiagnostics';
import { backupPortfolioIfNonEmpty, restorePortfolioFromBackup } from '../../services/portfolioBackup';
import { countActiveHoldings } from '../../services/portfolioPersistenceGuard';
import {
  recoverPortfolioFromHealthySnapshot,
} from '../../services/portfolioSnapshot';
import { hydrateQuoteCache } from '../../services/quoteCache';
import { loadExecutionJournal } from '../../services/executionJournalStorage';
import {
  buildDegradedModeLogPayload,
  isOperationalDegradedMode,
} from '../../services/degradedModePresentation';
import { loadOperatorBehaviorState } from '../../services/behavioralRiskStorage';
import { loadMetaCapitalState } from '../../services/metaCapitalStorage';
import { loadModelStabilityState } from '../../services/modelStabilityStorage';
import {
  initNetworkReachability,
  probeNetworkReachable,
  registerOnlineRecoveryHook,
} from '../../services/networkReachability';
import {
  incrementRecoveryAttemptCount,
  readRecoveryAttemptCount,
  resetRecoveryAttemptCount,
  shouldEnterSafeBootMode,
  SAFE_BOOT_MAX_ATTEMPTS,
  type BootMode,
} from '../../services/safeBoot';
import {
  exportDiagnosticsReportJson,
  hasCriticalDegradedDiagnostics,
  hasDegradedDiagnostics,
  recordDiagnosticEvent,
} from '../../services/structuredDiagnostics';
import {
  assessPersistedTamper,
  wrapJournalWithIntegrity,
  type TamperAssessment,
  type TamperSeverity,
} from '../../services/tamperDetection';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import {
  createDefaultAppState,
  loadAppStateTrusted,
} from '../../services/storage';
import { secureWarn } from '../../services/secureLogger';
import type { ApiHealthDashboard } from '../../types/apiSetup';
import type { AiPreferences } from '../../types/aiStrategy';
import type { AppState } from '../../types';
import { isDev } from '../../utils/isDev';

export type UseAppBootParams = {
  setState: Dispatch<SetStateAction<AppState>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setTwelveDataApiKey: (key: string) => void;
  setAnalysisApiKeys: Dispatch<SetStateAction<AnalysisApiKeys>>;
  setAiLearningState: Dispatch<SetStateAction<AiLearningState>>;
  setAiApiKey: (key: string) => void;
  setAiPreferences: Dispatch<SetStateAction<AiPreferences>>;
  setApiHealthDashboard: Dispatch<SetStateAction<ApiHealthDashboard>>;
  twelveDataApiKey: string;
  blockEmptyBootPersistenceRef: MutableRefObject<string | null>;
  lastPersistedRef: MutableRefObject<AppState | null>;
  stateRef: MutableRefObject<AppState>;
  setPortfolioRevision: Dispatch<SetStateAction<number>>;
};

export function useAppBoot({
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
}: UseAppBootParams) {
  const [bootMode, setBootMode] = useState<BootMode>('normal');
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const [tamperSeverity, setTamperSeverity] = useState<TamperSeverity>('none');
  const [recoveryRecommendations, setRecoveryRecommendations] = useState<string[]>([]);
  const [environmentIssues, setEnvironmentIssues] = useState<EnvironmentIssue[]>([]);
  const [killSwitches, setKillSwitches] = useState<PersonalKillSwitches>({
    version: 1,
    readOnlyMode: false,
    disableMarketRefresh: false,
    disableTradeSubmission: false,
  });
  const [healthReport, setHealthReport] = useState<HealthCheckReport | null>(null);

  const enterSafeBootMode = useCallback(() => {
    setBootMode('safe');
    const fresh = createDefaultAppState();
    blockEmptyBootPersistenceRef.current = 'safe_boot_default_state';
    setState(fresh);
    setSecurityWarnings((prev) =>
      prev.includes('安全モードで起動しています') ? prev : [...prev, '安全モードで起動しています'],
    );
  }, [blockEmptyBootPersistenceRef, setState]);

  const clearSensitiveLocalData = useCallback(async () => {
    await clearAllSensitiveLocalData();
    setTwelveDataApiKey('');
    setAnalysisApiKeys({ newsApiKey: '', snsApiKey: '', earningsApiKey: '', redditApiKey: '', xApiKey: '' });
    setApiHealthDashboard(buildApiHealthDashboard(createEmptyHealthSnapshot()));
    setAiApiKey('');
  }, [setTwelveDataApiKey, setAnalysisApiKeys, setApiHealthDashboard, setAiApiKey]);

  const applyTamperAssessment = useCallback((tamper: TamperAssessment) => {
    setTamperSeverity(tamper.severity);
    setSecurityWarnings(tamper.findings.map((f) => f.messageJa));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const networkOffline = !(await probeNetworkReachable());
      if (networkOffline) {
        const { setOfflineModeDetected } = await import('../../services/performanceCostRuntime');
        const { markOfflinePending } = await import('../../services/productionStability/offlineRecovery');
        setOfflineModeDetected(true);
        markOfflinePending();
      } else {
        const { noteNetworkSuccess } = await import('../../services/performanceCostRuntime');
        noteNetworkSuccess();
      }

      const safeBoot = await shouldEnterSafeBootMode();
      if (safeBoot) {
        const [tamperProbe, loadProbe] = await Promise.all([
          assessPersistedTamper({ networkOffline }),
          loadAppStateTrusted(),
        ]);
        applyTamperAssessment(tamperProbe);
        const persistedStateRecovered =
          loadProbe.trusted &&
          tamperProbe.trustAppState;

        if (persistedStateRecovered) {
          await resetRecoveryAttemptCount();
        } else {
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
          setKillSwitches(loadedSwitches);
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
        assessPersistedTamper({ networkOffline }),
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
      setKillSwitches(loadedSwitches);
      setAiApiKey(loadedAiKey);
      setAiPreferences(loadedAiPrefs);
      setApiHealthDashboard(buildApiHealthDashboard(await loadApiHealthSnapshot()));

      applyTamperAssessment(tamper);
      const warnings = tamper.findings.map((f) => f.messageJa);

      let loaded = loadResult.state;
      const trustPersisted =
        loadResult.trusted && tamper.trustAppState;

      if (!trustPersisted) {
        secureWarn('[boot] refusing untrusted persisted app state');
        await incrementRecoveryAttemptCount();
        loaded = createDefaultAppState();
        if (tamper.trustHealthySnapshot) {
          loaded = await recoverPortfolioFromHealthySnapshot(loaded);
        }
        if (
          countActiveHoldings(loaded.portfolio) === 0 &&
          countActiveHoldings(loaded.practice.portfolio) === 0
        ) {
          blockEmptyBootPersistenceRef.current = 'untrusted_boot_default_state';
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
      blockEmptyBootPersistenceRef.current = 'boot_failure_default_state';
      enterSafeBootMode();
    } finally {
      setLoading(false);
    }
  }, [
    applyTamperAssessment,
    enterSafeBootMode,
    blockEmptyBootPersistenceRef,
    lastPersistedRef,
    setState,
    setLoading,
    setTwelveDataApiKey,
    setAnalysisApiKeys,
    setAiLearningState,
    setKillSwitches,
    setAiApiKey,
    setAiPreferences,
    setApiHealthDashboard,
  ]);

  useEffect(() => {
    initNetworkReachability();
    return registerOnlineRecoveryHook(async () => {
      const tamper = await assessPersistedTamper({ networkOffline: false });
      applyTamperAssessment(tamper);
      const attempts = await readRecoveryAttemptCount();
      const env = validateEnvironmentForBoot({
        bootMode,
        recoveryAttempts: attempts,
        maxRecoveryAttempts: SAFE_BOOT_MAX_ATTEMPTS,
        hasMarketDataApiKey: Boolean(twelveDataApiKey.trim()),
      });
      setEnvironmentIssues(env.issues);
      setRecoveryRecommendations(
        getRecoveryRecommendations(env.issues, tamper.findings.map((f) => f.messageJa)),
      );
    });
  }, [applyTamperAssessment, bootMode, twelveDataApiKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const diagnosticsReportJson = useCallback(() => exportDiagnosticsReportJson(), []);

  const degradedMode = useMemo(
    () =>
      isOperationalDegradedMode({
        bootMode,
        securityWarnings,
        recoveryRecommendations,
        readOnlyMode: killSwitches.readOnlyMode,
        tamperSeverity,
      }) ||
      hasCriticalDegradedDiagnostics() ||
      (!(typeof __DEV__ !== 'undefined' && __DEV__) && hasDegradedDiagnostics()),
    [
      bootMode,
      securityWarnings,
      recoveryRecommendations,
      killSwitches.readOnlyMode,
      tamperSeverity,
    ],
  );

  useEffect(() => {
    if (!degradedMode) return;
    const payload = buildDegradedModeLogPayload({
      bootMode,
      securityWarnings,
      recoveryRecommendations,
      readOnlyMode: killSwitches.readOnlyMode,
      tamperSeverity,
      operationalDegraded: degradedMode,
    });
    console.log('[degraded-mode]', JSON.stringify(payload, null, 2));
  }, [
    bootMode,
    degradedMode,
    killSwitches.readOnlyMode,
    recoveryRecommendations,
    securityWarnings,
    tamperSeverity,
  ]);

  const readOnlyBlockedMessage = useMemo(
    () =>
      killSwitches.readOnlyMode
        ? '読み取り専用モード — 編集・売買・インポートは無効です'
        : null,
    [killSwitches.readOnlyMode],
  );

  const setKillSwitch = useCallback(async (partial: Partial<Omit<PersonalKillSwitches, 'version'>>) => {
    const next = await savePersonalKillSwitches(partial);
    setKillSwitches(next);
    recordDiagnosticEvent({
      type: 'kill_switch',
      severity: 'info',
      module: 'AppContext',
      message: `Kill switch updated: ${JSON.stringify(partial)}`,
    });
  }, [setKillSwitches]);

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
  }, [twelveDataApiKey, killSwitches.readOnlyMode, stateRef]);

  const exportBackupJson = useCallback(async () => {
    const journal = await loadExecutionJournal();
    return exportPersonalBackupJson(stateRef.current, journal.entries);
  }, [stateRef]);

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
    [setState, stateRef, setPortfolioRevision],
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
  }, [setState, stateRef, setPortfolioRevision]);

  const resetRequestQueue = useCallback(() => {
    resetMarketDataRequestQueue();
  }, []);

  return {
    bootMode,
    setBootMode,
    securityWarnings,
    setSecurityWarnings,
    tamperSeverity,
    recoveryRecommendations,
    setRecoveryRecommendations,
    environmentIssues,
    setEnvironmentIssues,
    killSwitches,
    setKillSwitches,
    healthReport,
    setHealthReport,
    enterSafeBootMode,
    clearSensitiveLocalData,
    applyTamperAssessment,
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
  };
}
