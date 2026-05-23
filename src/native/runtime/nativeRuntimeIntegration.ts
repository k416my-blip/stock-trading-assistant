/**
 * Native Runtime Bridge — signal provider only (no policy mutations).
 */
import type { NativeRuntimeDashboardExtension } from '../../types/nativeRuntimeBridge';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { RuntimeOrchestratorEvaluation } from '../../types/runtimeOrchestrator';
import {
  fetchNativeRuntimeSnapshot,
  getLastNativeRuntimeSnapshot,
  initNativeRuntimeBridge,
  isNativeRuntimeBridgeAvailable,
} from './nativeRuntimeBridge';
import { buildTelemetryConfidenceMap, nativeCoveragePct } from './telemetryConfidence';
import { predictRuntimeKill } from './runtimeKillPredictor';
import { observeAnrRisk, initAnrPreventionLayer, pingEventLoop } from './anrPreventionLayer';
import { detectMiuiAggressiveReclaim, getMiuiReclaimEventCount } from './miuiReclaimDetector';
import {
  getReconnectPerMin,
  getWsDuplicateCount,
} from '../../runtime/stability/RuntimeReconnectTracker';
import { getHeartbeatAgeMs } from '../../runtime/stability/RuntimeHeartbeatTracker';
import {
  formatLifecycleTimelineVisualization,
  getLifecycleTimeline,
} from './lifecycleTimeline';
import type { NativeBoundaryValidationReport } from '../../types/nativeBoundaryValidation';
import {
  buildNativeBoundaryValidationReport,
  exportNativeBoundaryValidationJson,
  formatNativeBoundaryValidationReport,
} from './nativeBoundaryValidation';
import { isSoakModeActive, recordSoakSample, exportSoakCsv, noteAiSuppressionActive, getSoakRecordCount } from './longSoakTesting';
import { loadPersistedRedmiLongSoakExport } from './redmiLongSoakValidation';
import {
  buildRedmiLongSoakDashboardReport,
  exportRedmiLongSoakJson,
  formatRedmiLongSoakSummaryText,
  isRedmiLongSoakActive,
  maybeAutoStartRedmiSoakValidation,
  tickRedmiLongSoakValidation,
} from './redmiLongSoakValidation';
import { getPerformanceCostSnapshot } from '../../services/performanceCostRuntime';
import {
  initNativeDeviceTelemetry,
  observeNativeDeviceTelemetryCycle,
  getNativeDeviceTelemetryDashboard,
  exportNativeDeviceTelemetryJson,
  formatNativeDeviceTelemetryExportJson,
} from '../telemetry';
import { initAndroidLifecycleStressRunner } from '../soak/androidLifecycleStressRunner';
import { isAutomatedSoakRunnerActive, tickAutomatedSoakRunner } from '../soak';
import {
  initJsThreadStabilization,
  observeJsThreadStabilization,
  shouldRunStabilizationSample,
} from '../../scheduler/jsThreadStabilization';
import {
  initRnBridgeSurvivability,
  observeRnBridgeSurvivability,
  shouldRunRnSurvivabilitySample,
  getLastRnBridgeSurvivabilityProfile,
} from '../../rn/bridgeSurvivability';
import {
  initFailureRecovery,
  observeFailureRecovery,
  shouldRunFailureRecoverySample,
} from '../../recovery/failureRecovery';

let lastExtension: NativeRuntimeDashboardExtension | null = null;

export function resetNativeRuntimeIntegrationForTest(): void {
  lastExtension = null;
}

export async function initNativeRuntimeLayer(): Promise<void> {
  initAnrPreventionLayer();
  initNativeRuntimeBridge();
  initNativeDeviceTelemetry();
  initAndroidLifecycleStressRunner();
  initJsThreadStabilization();
  initRnBridgeSurvivability();
  initFailureRecovery();
  maybeAutoStartRedmiSoakValidation();
  await fetchNativeRuntimeSnapshot();
}

/** Read-only device telemetry — no runtime policy changes. */
export function observeNativeDeviceTelemetryFromMetrics(
  metrics: RuntimeTelemetryMetricsSnapshot,
  sessionMinutes: number,
  tickDurationMs?: number | null,
): void {
  const performance = getPerformanceCostSnapshot();
  observeNativeDeviceTelemetryCycle({
    metrics,
    performance,
    sessionMinutes,
    tickDurationMs: tickDurationMs ?? null,
  });
  if (isAutomatedSoakRunnerActive()) {
    void tickAutomatedSoakRunner(metrics, performance);
  }

  const stabInput = {
    eventLoopLagMs: metrics.eventLoopLatencyMs,
    renderFps: metrics.renderFPS,
    jsHeapMb: metrics.jsHeapEstimateMb,
    thermalState: metrics.thermalState,
    appForeground: performance.appForeground,
    screenOff: metrics.native.appState === 'inactive' || performance.appStateLabel === 'inactive',
    batterySaver: performance.batterySaverActive || metrics.native.batterySaverActive,
    memoryTrendPct: metrics.memoryTrendPct,
  };
  if (shouldRunStabilizationSample(stabInput)) {
    observeJsThreadStabilization(stabInput);
  }

  const rnInput = {
    renderFps: metrics.renderFPS,
    renderBurstRate: metrics.render.renderBurstRate,
    jsHeapMb: metrics.jsHeapEstimateMb,
    memoryTrendPct: metrics.memoryTrendPct,
    thermalState: metrics.thermalState,
    appForeground: performance.appForeground,
    screenOff: metrics.native.appState === 'inactive' || performance.appStateLabel === 'inactive',
    batterySaver: performance.batterySaverActive,
    asyncQueueDepth: metrics.asyncQueueDepth,
  };
  if (shouldRunRnSurvivabilitySample(rnInput)) {
    observeRnBridgeSurvivability(rnInput);
  }

  const rnProfile = getLastRnBridgeSurvivabilityProfile();
  const recoveryInput = {
    eventLoopLagMs: metrics.eventLoopLatencyMs,
    renderFps: metrics.renderFPS,
    renderBurstRate: metrics.render.renderBurstRate,
    jsHeapMb: metrics.jsHeapEstimateMb,
    memoryTrendPct: metrics.memoryTrendPct,
    thermalState: metrics.thermalState,
    appForeground: performance.appForeground,
    screenOff: metrics.native.appState === 'inactive' || performance.appStateLabel === 'inactive',
    batterySaver: performance.batterySaverActive,
    asyncQueueDepth: metrics.asyncQueueDepth,
    reconnectPerMin: getReconnectPerMin(),
    wsDuplicateCount: getWsDuplicateCount(),
    heartbeatAgeMs: getHeartbeatAgeMs(),
    bridgeTrafficRate: rnProfile?.bridgeTrafficRate ?? 0,
    renderStormRisk: rnProfile?.renderStormRisk ?? 0,
    miuiAggressiveReclaim: detectMiuiAggressiveReclaim().value,
  };
  if (shouldRunFailureRecoverySample(recoveryInput)) {
    observeFailureRecovery(recoveryInput);
  }
}

export function mergeNativeIntoTelemetryMetrics(
  metrics: RuntimeTelemetryMetricsSnapshot,
): RuntimeTelemetryMetricsSnapshot {
  const native = getLastNativeRuntimeSnapshot();
  if (!native) return metrics;

  const miui = detectMiuiAggressiveReclaim();
  return {
    ...metrics,
    jsHeapEstimateMb: Math.max(metrics.jsHeapEstimateMb, Math.round(native.nativeMemoryPressurePct * 0.6 + 20)),
    droppedFrames: Math.max(metrics.droppedFrames, native.droppedFramesEstimate),
    thermalState:
      native.source === 'native' && native.thermalStatus !== 'unknown'
        ? (native.thermalStatus as RuntimeTelemetryMetricsSnapshot['thermalState'])
        : metrics.thermalState,
    native: {
      ...metrics.native,
      batterySaverActive: native.batterySaverActive || metrics.native.batterySaverActive,
      thermalStatus:
        native.thermalStatus === 'unknown' ? metrics.native.thermalStatus : native.thermalStatus,
      thermalThrottlingDetected:
        native.thermalStatus === 'severe' ||
        native.thermalStatus === 'critical' ||
        metrics.native.thermalThrottlingDetected,
      miuiAggressiveReclaim: miui.value || metrics.native.miuiAggressiveReclaim,
      memoryWarning: native.trimLevel !== 'none' || metrics.native.memoryWarning,
    },
  };
}

export function buildNativeDashboardExtension(
  metrics: RuntimeTelemetryMetricsSnapshot,
  sessionMinutes: number,
  orchEval?: RuntimeOrchestratorEvaluation | null,
): NativeRuntimeDashboardExtension {
  const native = getLastNativeRuntimeSnapshot();
  const confidenceMap = buildTelemetryConfidenceMap(metrics, native);
  const killPrediction = predictRuntimeKill({ metrics, sessionMinutes });
  const anrRisk = observeAnrRisk();
  const soakActive = isSoakModeActive(sessionMinutes);

  if (soakActive && orchEval) {
    recordSoakSample({
      orchestratorState: orchEval.snapshot.state,
      memoryMb: metrics.jsHeapEstimateMb,
      reconnectCount: metrics.websocket.reconnectAttempts,
      fps: metrics.renderFPS,
      queueDepth: metrics.asyncQueueDepth,
      survivalActivations: orchEval.snapshot.survivalActivationCount,
    });
    if (getSoakRecordCount() % 10 === 0) {
      void import('./longSoakTesting').then(({ persistSoakRecords }) => persistSoakRecords());
    }
  }

  noteAiSuppressionActive(orchEval?.snapshot.aiSuppressionActive ?? false);

  if (isRedmiLongSoakActive()) {
    tickRedmiLongSoakValidation(metrics, getPerformanceCostSnapshot().appForeground);
  }

  if (isAutomatedSoakRunnerActive()) {
    void tickAutomatedSoakRunner(metrics, getPerformanceCostSnapshot());
  }

  const ext: NativeRuntimeDashboardExtension = {
    bridgeAvailable: isNativeRuntimeBridgeAvailable(),
    metricSource: native?.source ?? 'heuristic',
    nativeCoveragePct: nativeCoveragePct(confidenceMap),
    killPrediction,
    anrRisk,
    memoryClass: native?.memoryClass ?? {
      memoryClassMb: 192,
      largeMemoryClassMb: 512,
      lowRamDevice: false,
      isLowRamDevice: false,
    },
    lifecycleTimeline: getLifecycleTimeline(),
    confidenceMap,
    miuiReclaimEvents: getMiuiReclaimEventCount(),
    soakModeActive: soakActive,
    soakCsvExportReady: soakActive && exportSoakCsv().split('\n').length > 2,
  };
  lastExtension = ext;
  return ext;
}

export function getLastNativeDashboardExtension(): NativeRuntimeDashboardExtension | null {
  return lastExtension;
}

export function shouldForceMiuiSurvivalEscalation(): boolean {
  const miui = detectMiuiAggressiveReclaim();
  return miui.value && miui.confidence >= 0.7;
}

export function getLifecycleTimelineVisualization(): string {
  return formatLifecycleTimelineVisualization();
}

export function getSoakCsvForExport(): string {
  return exportSoakCsv();
}

export function getNativeBoundaryValidationReport(): NativeBoundaryValidationReport {
  return buildNativeBoundaryValidationReport();
}

export function getNativeBoundarySoakReportText(): string {
  return formatNativeBoundaryValidationReport(buildNativeBoundaryValidationReport());
}

export function getNativeBoundaryValidationJson(): string {
  return exportNativeBoundaryValidationJson();
}

export function getRedmiLongSoakJsonExport(): string {
  return exportRedmiLongSoakJson();
}

export function getRedmiLongSoakSummaryText(): string {
  return formatRedmiLongSoakSummaryText();
}

export function getRedmiLongSoakDashboardReport(): ReturnType<typeof buildRedmiLongSoakDashboardReport> {
  return buildRedmiLongSoakDashboardReport();
}

export {
  analyzeRedmiSoakReport,
  analyzeRedmiSoakReportBundle,
  analyzeRedmiSoakExportJson,
  formatPostSoakAnalysisMarkdown,
  exportPostSoakAnalysisJson,
  findRootOwnershipEvent,
} from './postSoakFailureAnalysis';

export {
  buildRuntimeCausalGraph,
  buildRuntimeCausalGraphBundle,
  buildRuntimeCausalGraphBundleFromSoak,
  buildRuntimeCausalGraphFromSoak,
  formatCausalGraphMarkdown,
  formatCausalGraphMermaid,
  exportCausalGraphJson,
  causalGraphFromSoakExport,
} from '../../runtime/analysis/runtimeCausalGraph';

export {
  computeTemporalEdgeWeight,
  synthesizeEdgeConfidence,
  collapseEventBursts,
} from '../../runtime/analysis/runtimeTemporalCausality';

export {
  inferLatentRuntimeStates,
  mergeLatentStatesIntoCausalGraph,
  formatLatentStateMarkdown,
} from '../../runtime/analysis/runtimeLatentStateInference';

export {
  buildHierarchicalLatentRuntimeGraph,
  mergeHierarchicalLatentIntoGraph,
  formatHierarchicalLatentMarkdown,
  extractCriticalLatentChain,
} from '../../runtime/analysis/hierarchicalLatentRuntimeGraph';

export {
  buildRuntimeCausalGraphWithAdaptive,
  replaySoakExportForLearning,
  buildAdaptiveRuntimeReport,
  formatAdaptiveRuntimeReportMarkdown,
} from '../../runtime/analysis/runtimeCausalGraphAdaptive';

export {
  createAdaptiveRuntimeContext,
  resolveDeviceProfile,
  learnFromInference,
} from '../../runtime/analysis/adaptiveRuntimeLearningEngine';

export {
  runAdaptiveGovernance,
  buildRedmiNote13ProLongTermGovernanceReport,
  formatGovernanceDashboardMarkdown,
  resetAdaptiveGovernanceForTest,
} from '../../runtime/governance/adaptiveRuntimeGovernance';

export {
  buildRuntimeObservabilityBundle,
  buildRedmiNote13ProObservabilityReport,
  observeRuntimeObservabilityTick,
  observeOrchestrationEvent,
  noteObservabilityReconnect,
  noteObservabilityHydration,
  noteObservabilityRollback,
  resetRuntimeObservabilityForTest,
  formatObservabilityDashboardMarkdown,
} from '../../runtime/observability/runtimeObservabilityIntegration';

export {
  runFailureReplay,
} from '../../runtime/observability/failureReplayMode';

export {
  reconstructFailureTimeline,
  deriveRootCauseCandidates,
} from '../../runtime/observability/timelineReconstructionEngine';

export { isObservabilityPayloadAllowed } from '../../runtime/observability/safeObservabilityConstraints';

export {
  observeRuntimeSelfHealingTick,
  buildRuntimeSelfHealingBundle,
  buildRedmiNote13ProSelfHealingReport,
  resetRuntimeSelfHealingForTest,
  formatRecoveryDashboardMarkdown,
  getSelfHealingPhase,
} from '../../runtime/selfHealing/runtimeSelfHealingIntegration';

export {
  observeRuntimeEvolutionTick,
  buildRuntimeEvolutionBundle,
  buildRedmiNote13ProEvolutionReport,
  resetRuntimeEvolutionForTest,
  runEvolutionSimulationSuite,
  formatEvolutionDashboardMarkdown,
  getLongTermEvolutionPhase,
} from '../../runtime/evolution/runtimeEvolutionIntegration';

export {
  arbitrateRuntimeConstitution,
  buildRedmiNote13ProConstitutionReport,
  getConstitutionalDirectives,
  resetRuntimeConstitutionForTest,
  runConstitutionalSimulationSuite,
  formatSenateDashboardMarkdown,
  getConstitutionalState,
} from '../../runtime/constitution/runtimeConstitutionIntegration';

export {
  tickRuntimeMetabolism,
  getLastMetabolismBundle,
  buildRedmiNote13ProMetabolismReport,
  recoverFromTombstone,
  resetRuntimeMetabolismForTest,
} from '../../runtime/metabolism/runtimeMetabolismIntegration';

export {
  tickRuntimeCuriosity,
  getLastCuriosityBundle,
  buildRedmiNote13ProCuriosityReport,
  resetRuntimeCuriosityForTest,
  setLastCuriosityTickMsForTest,
} from '../../runtime/curiosity/runtimeCuriosityIntegration';

export {
  runUnifiedRuntimeLayersTick,
  getLastUnifiedOrchestratorBundle,
  resetRuntimeUnifiedOrchestratorForTest,
  shouldAllowUnifiedDashboardUpdate,
  setLastUnifiedTickAtMsForTest,
} from '../../runtime/unified/runtimeUnifiedOrchestratorIntegration';

export {
  tickRuntimeLongevity,
  getLastLongevityBundle,
  buildRedmiNote13ProLongevityReport,
  resetRuntimeLongevityForTest,
} from '../../runtime/longevity/runtimeLongevityIntegration';

export {
  runFullLongSessionStressSuite,
  formatFinalSurvivalReportMarkdown,
  resetRuntimeLongSessionStressHarness,
} from '../../runtime/stress/runtimeLongSessionStressHarness';

export {
  initNativeDeviceTelemetry,
  observeNativeDeviceTelemetryCycle,
  getLastNativeDeviceTelemetrySnapshot,
  getNativeDeviceTelemetryDashboard,
  exportNativeDeviceTelemetryJson,
  formatNativeDeviceTelemetryExportJson,
  resetNativeDeviceTelemetryForTest,
  exportMemorySnapshotsJson,
} from '../telemetry';

export {
  startAutomatedSoakRunner,
  stopAutomatedSoakRunner,
  isAutomatedSoakRunnerActive,
  getAutomatedSoakDashboard,
  buildAutomatedSoakExportJson,
  buildCompressedSoakBundle,
  formatAutomatedSoakMarkdownReport,
  formatAutomatedSoakExportJson,
  resetAutomatedSoakRunnerForTest,
} from '../soak';

export {
  getJsThreadStabilizationDashboard,
  getLastJsThreadStabilizationProfile,
  resetJsThreadStabilizationForTest,
} from '../../scheduler/jsThreadStabilization';

export {
  getRnBridgeSurvivabilityDashboard,
  getLastRnBridgeSurvivabilityProfile,
  resetRnBridgeSurvivabilityForTest,
} from '../../rn/bridgeSurvivability';

export {
  getFailureRecoveryDashboard,
  getLastFailureRecoveryProfile,
  resetFailureRecoveryForTest,
  formatFailureRecoveryExportJson,
  buildFailureRecoveryExportBundle,
} from '../../recovery/failureRecovery';

export async function analyzePersistedRedmiSoakExport(): Promise<
  ReturnType<typeof analyzeRedmiSoakReportBundle> | null
> {
  const exp = await loadPersistedRedmiLongSoakExport();
  if (!exp) return null;
  const { analyzeRedmiSoakReportBundle } = await import('./postSoakFailureAnalysis');
  return analyzeRedmiSoakReportBundle(exp);
}

/** Signal refresh only — policy applied via kernel effects. */
export async function refreshNativeRuntimeCycle(): Promise<void> {
  pingEventLoop();
  await fetchNativeRuntimeSnapshot();
}
