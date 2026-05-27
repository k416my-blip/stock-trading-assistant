import type { AmplificationSuppressionExportBundle } from '../types/amplificationSuppression';
import { AMPLIFICATION_SUPPRESSION_VERSION } from '../constants/amplificationSuppression';
import { getAmplificationTimeline } from './amplificationSuppressionTimeline';
import { getLastAmplificationSuppressionProfile } from './amplificationSuppressionCoordinator';
import { getEntropyTimeline } from './runtimeEntropyStabilizer';
import { getObserverSuppressionHistory } from './observerCascadeSuppressor';
import { getLoadSheddingTimeline } from './amplificationSuppressionTimeline';
import { getEquilibriumEvolution } from './autonomousStabilizationEquilibriumEngine';
import { getTelemetryRecursionMap } from './telemetryRecursionLimiter';
import { detectFeedbackLoops } from './runtimeFeedbackLoopSuppressor';

function emptyInput(): import('../types/amplificationSuppression').AmplificationSuppressionObserveInput {
  return {
    eventLoopLagMs: 0,
    renderFps: 30,
    jsHeapMb: 80,
    memoryTrendPct: 0,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 0,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 0,
    renderStormRisk: 0,
    reconnectPerMin: 0,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 0,
    recoverySuccessRate: 1,
    continuityScore: 100,
    observerOverheadRatio: 0,
    governanceMode: 'full_observe',
    telemetryAmplificationScore: 0,
    interventionDensity: 0,
    runtimeTradingSuppression: 0,
    equilibriumScore: 1,
    metaCoordinationStability: 1,
    runtimeAmplificationRisk: 0,
  };
}

export function buildAmplificationIncidentReportExport(): Record<string, unknown> {
  const profile = getLastAmplificationSuppressionProfile();
  return {
    runtimeAmplificationRisk: profile?.runtimeAmplificationRisk ?? 0,
    feedbackLoops: detectFeedbackLoops(emptyInput()),
    exportedAt: new Date().toISOString(),
  };
}

export function buildRecursionSuppressionReportExport(): Record<string, unknown> {
  return {
    telemetryRecursionMap: getTelemetryRecursionMap(),
    telemetryRecursionRisk: getLastAmplificationSuppressionProfile()?.telemetryRecursionRisk ?? 0,
    exportedAt: new Date().toISOString(),
  };
}

export function buildStabilizationEquilibriumReportExport(): Record<string, unknown> {
  return {
    equilibriumEvolution: getEquilibriumEvolution(),
    runtimeEquilibriumStability: getLastAmplificationSuppressionProfile()?.runtimeEquilibriumStability ?? 0,
    exportedAt: new Date().toISOString(),
  };
}

export function buildAmplificationSuppressionExportBundle(): AmplificationSuppressionExportBundle {
  return {
    version: AMPLIFICATION_SUPPRESSION_VERSION,
    exportedAt: new Date().toISOString(),
    amplificationIncidentReport: buildAmplificationIncidentReportExport(),
    observerSuppressionHistory: getObserverSuppressionHistory(),
    runtimeEntropyEvolution: getEntropyTimeline(),
    loadSheddingHistory: getLoadSheddingTimeline(),
    stabilizationEquilibriumReport: buildStabilizationEquilibriumReportExport(),
    recursionSuppressionReport: buildRecursionSuppressionReportExport(),
    profile: getLastAmplificationSuppressionProfile(),
  };
}

export function formatAmplificationSuppressionExportJson(): string {
  return JSON.stringify(buildAmplificationSuppressionExportBundle(), null, 2);
}
