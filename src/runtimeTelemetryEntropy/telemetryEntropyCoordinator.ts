/**
 * Runtime Telemetry Entropy Reduction & Signal Governance — observe-only.
 */
import type {
  RuntimeTelemetryEntropyDashboard,
  RuntimeTelemetryEntropyObserveInput,
  RuntimeTelemetryEntropyProfile,
} from '../types/runtimeTelemetryEntropy';
import {
  RUNTIME_TELEMETRY_ENTROPY_POLL_MS,
  RUNTIME_TELEMETRY_ENTROPY_UI_JA,
} from '../constants/runtimeTelemetryEntropy';
import { scoreSignalEntropy } from './signalEntropyScorer';
import { scoreTelemetryDuplicationRisk } from './telemetryDuplicationScorer';
import { scoreReplayAmplificationRisk } from './replayAmplificationScorer';
import { scoreMetricCascadeRisk } from './metricCascadeScorer';
import { scoreDashboardSaturationRisk } from './dashboardSaturationScorer';
import { scoreExportPayloadRisk } from './exportPayloadScorer';
import { scoreTimelineFragmentationRisk } from './timelineFragmentationScorer';
import { scoreTelemetryAging } from './telemetryAgingEngine';
import {
  getSignalGovernanceSuggestionsRecent,
  recordSignalGovernanceSuggestions,
  resetSignalGovernanceRecorderForTest,
} from './signalGovernanceRecorder';
import {
  buildEntropyHeatmap,
  buildSignalDuplicationGraph,
  buildReplayAmplificationTimeline,
  buildDashboardSaturationRadar,
  buildExportPayloadHistogram,
} from './entropyVisualizationBuilders';
import { runTelemetryEntropyFlows } from './telemetryEntropyOrchestrator';
import {
  getTelemetryEntropyTimelineRecent,
  resetTelemetryEntropyTimelineForTest,
} from './telemetryEntropyTimeline';
import {
  recordTelemetryEntropySoakEvent,
  resetTelemetryEntropySoakIntegrationForTest,
  setTelemetryEntropySoakHook,
} from './telemetryEntropySoakIntegration';

let lastProfile: RuntimeTelemetryEntropyProfile | null = null;
let lastHeatmap: { layer: string; entropy: number }[] = [];
let lastDuplicationGraph: ReturnType<typeof buildSignalDuplicationGraph> | null = null;
let replayTimeline: { at: string; level: number }[] = [];
let lastSaturationRadar: { axis: string; value: number }[] = [];
let lastExportHistogram: { bucket: string; count: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeTelemetryEntropyForTest(): void {
  lastProfile = null;
  lastHeatmap = [];
  lastDuplicationGraph = null;
  replayTimeline = [];
  lastSaturationRadar = [];
  lastExportHistogram = [];
  lastThrottleAt = 0;
  resetTelemetryEntropyTimelineForTest();
  resetTelemetryEntropySoakIntegrationForTest();
  resetSignalGovernanceRecorderForTest();
}

export function initRuntimeTelemetryEntropy(): void {
  lastThrottleAt = 0;
}

export function setRuntimeTelemetryEntropySoakHookEnabled(enabled: boolean): void {
  setTelemetryEntropySoakHook(enabled);
}

export function shouldRunRuntimeTelemetryEntropySample(
  _input: RuntimeTelemetryEntropyObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_TELEMETRY_ENTROPY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeTelemetryEntropy(
  input: RuntimeTelemetryEntropyObserveInput,
): RuntimeTelemetryEntropyProfile {
  runTelemetryEntropyFlows(input);
  for (const entry of getTelemetryEntropyTimelineRecent(5)) {
    recordTelemetryEntropySoakEvent(entry);
  }

  const telemetryDuplicationRisk = scoreTelemetryDuplicationRisk(input);
  const replayAmplificationRisk = scoreReplayAmplificationRisk(input);
  const exportPayloadRisk = scoreExportPayloadRisk(input);
  const dashboardSaturationRisk = scoreDashboardSaturationRisk(input);
  recordSignalGovernanceSuggestions(input, {
    telemetryDuplicationRisk,
    replayAmplificationRisk,
    exportPayloadRisk,
    dashboardSaturationRisk,
  });

  const aging = scoreTelemetryAging(input);
  lastHeatmap = buildEntropyHeatmap(input);
  lastDuplicationGraph = buildSignalDuplicationGraph(input);
  replayTimeline = buildReplayAmplificationTimeline(input, replayTimeline);
  lastSaturationRadar = buildDashboardSaturationRadar(input);
  lastExportHistogram = buildExportPayloadHistogram(input);

  const profile: RuntimeTelemetryEntropyProfile = {
    signalEntropyScore: scoreSignalEntropy(input),
    telemetryDuplicationRisk,
    replayAmplificationRisk,
    metricCascadeRisk: scoreMetricCascadeRisk(input),
    dashboardSaturationRisk,
    exportPayloadRisk,
    timelineFragmentationRisk: scoreTimelineFragmentationRisk(input),
    staleTelemetryRatio: aging.staleTelemetryRatio,
    orphanMetricCount: aging.orphanMetricCount,
    zombieReplayHookCount: aging.zombieReplayHookCount,
    unusedExportChainCount: aging.unusedExportChainCount,
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastRuntimeTelemetryEntropyProfile(): RuntimeTelemetryEntropyProfile | null {
  return lastProfile;
}

export function getRuntimeTelemetryEntropyDashboard(): RuntimeTelemetryEntropyDashboard | null {
  if (!lastProfile || !lastDuplicationGraph) return null;
  return {
    titleJa: RUNTIME_TELEMETRY_ENTROPY_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_TELEMETRY_ENTROPY_UI_JA.safety,
    profile: lastProfile,
    entropyHeatmap: lastHeatmap,
    signalDuplicationGraph: lastDuplicationGraph,
    replayAmplificationTimeline: [...replayTimeline],
    dashboardSaturationRadar: lastSaturationRadar,
    exportPayloadHistogram: lastExportHistogram,
    governanceSuggestions: getSignalGovernanceSuggestionsRecent(6),
    timelineRecent: getTelemetryEntropyTimelineRecent(6),
  };
}
