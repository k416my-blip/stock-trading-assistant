/**
 * Cross-Stack Compression — observe-only dedup/normalize; no stack semantics change.
 */
import type {
  RuntimeCrossStackCompressionDashboard,
  RuntimeCrossStackCompressionObserveInput,
  RuntimeCrossStackCompressionProfile,
} from '../types/runtimeCrossStackCompression';
import {
  ESTIMATED_RUNTIME_STACK_COUNT,
  RUNTIME_CROSS_STACK_COMPRESSION_POLL_MS,
  RUNTIME_CROSS_STACK_COMPRESSION_UI_JA,
} from '../constants/runtimeCrossStackCompression';
import { scoreSignalCompressionRatio, scoreCrossStackCompression } from './compressionRatioEngine';
import { scoreTelemetryDedupRatio } from './telemetryDeduplicator';
import { scoreObserverDedupRatio } from './observerDeduplicationAnalyzer';
import { trackReplayDedup, resetReplayDedupForTest } from './replayDeduplicationTracker';
import { scoreClusteredSignals } from './signalClusteringEngine';
import { registerStackSignals, resetStackSignalRegistryForTest } from './stackSignalRegistry';
import { buildStackTopology } from './stackTopologyBuilder';
import { buildAmplificationHeatmap } from './amplificationHeatmapBuilder';
import { runCompressionFlows } from './compressionOrchestrator';
import { getCompressionTimelineRecent, resetCompressionTimelineForTest } from './compressionTimeline';
import { resetCompressionSoakIntegrationForTest, setCompressionSoakHook } from './compressionSoakIntegration';

const ratioTimeline: { at: string; ratio: number }[] = [];

let lastProfile: RuntimeCrossStackCompressionProfile | null = null;
let lastTopology: { id: string; label: string; depth: number }[] = [];
let lastHeatmap: { stack: string; intensity: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeCrossStackCompressionForTest(): void {
  lastProfile = null;
  lastTopology = [];
  lastHeatmap = [];
  lastThrottleAt = 0;
  ratioTimeline.length = 0;
  resetCompressionTimelineForTest();
  resetStackSignalRegistryForTest();
  resetReplayDedupForTest();
  resetCompressionSoakIntegrationForTest();
}

export function initRuntimeCrossStackCompression(): void {
  lastThrottleAt = 0;
}

export function setRuntimeCrossStackCompressionSoakHookEnabled(enabled: boolean): void {
  setCompressionSoakHook(enabled);
}

export function shouldRunRuntimeCrossStackCompressionSample(
  _input: RuntimeCrossStackCompressionObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_CROSS_STACK_COMPRESSION_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeCrossStackCompression(
  input: RuntimeCrossStackCompressionObserveInput,
): RuntimeCrossStackCompressionProfile {
  const enriched: RuntimeCrossStackCompressionObserveInput = {
    ...input,
    stackCount: input.stackCount || ESTIMATED_RUNTIME_STACK_COUNT,
    rawSignalCount: input.rawSignalCount || input.stackCount * 12,
  };
  runCompressionFlows(enriched);

  const signalCount = registerStackSignals(enriched);
  const profile: RuntimeCrossStackCompressionProfile = {
    signalCompressionRatio: scoreSignalCompressionRatio(enriched),
    telemetryDedupRatio: scoreTelemetryDedupRatio(enriched),
    observerDedupRatio: scoreObserverDedupRatio(enriched),
    replayDedupRatio: trackReplayDedup(1),
    stackSignalCount: signalCount,
    clusteredSignalCount: Math.round(scoreClusteredSignals(enriched)),
    crossStackCompressionScore: scoreCrossStackCompression(enriched),
    measuredAt: new Date().toISOString(),
  };

  lastTopology = buildStackTopology(enriched.stackCount);
  lastHeatmap = buildAmplificationHeatmap(enriched);
  ratioTimeline.push({ at: new Date().toISOString(), ratio: profile.signalCompressionRatio });
  if (ratioTimeline.length > 48) ratioTimeline.shift();

  lastProfile = profile;
  return profile;
}

export function getLastRuntimeCrossStackCompressionProfile(): RuntimeCrossStackCompressionProfile | null {
  return lastProfile;
}

export function getRuntimeCrossStackCompressionDashboard(): RuntimeCrossStackCompressionDashboard | null {
  if (!lastProfile) return null;
  return {
    titleJa: RUNTIME_CROSS_STACK_COMPRESSION_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_CROSS_STACK_COMPRESSION_UI_JA.safety,
    profile: lastProfile,
    stackTopology: lastTopology,
    compressionTimeline: [...ratioTimeline],
    amplificationHeatmap: lastHeatmap,
    timelineRecent: getCompressionTimelineRecent(6),
  };
}

export function getCompressionRatioTimeline(): { at: string; ratio: number }[] {
  return [...ratioTimeline];
}
