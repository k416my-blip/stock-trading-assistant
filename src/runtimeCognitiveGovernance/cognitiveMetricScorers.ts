import type {
  RuntimeCognitiveGovernanceObserveInput,
  RuntimeCognitiveGovernanceProfile,
} from '../types/runtimeCognitiveGovernance';
import { RUNTIME_COGNITIVE_GOVERNANCE_LONG_SESSION_MIN } from '../constants/runtimeCognitiveGovernance';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetCognitiveMetricScorersForTest(): void {
  /* stateless */
}

export function scoreDashboardCognitiveLoad(input: RuntimeCognitiveGovernanceObserveInput): number {
  return round(
    Math.min(1, input.dashboardRowCount / 60) * 0.45 +
      Math.min(1, input.telemetrySampleCount / 140) * 0.25 +
      (Math.min(1, input.uniqueSignalKinds / 24) * 0.5 + Math.min(1, input.governanceLayerCount / 12) * 0.5) *
        0.3,
  );
}

export function scoreSemanticNoiseRatio(input: RuntimeCognitiveGovernanceObserveInput): number {
  const total = Math.max(1, input.semanticSignalCount);
  return round(input.lowValueSignalCount / total * 0.55 + input.duplicateSignalRatio * 0.45);
}

export function scoreSignalPriorityDrift(input: RuntimeCognitiveGovernanceObserveInput): number {
  const criticalCoverage = input.criticalSignalCount / Math.max(1, input.semanticSignalCount);
  return round(
    (1 - Math.min(1, criticalCoverage * 6)) * 0.45 +
      scoreSemanticNoiseRatio(input) * 0.35 +
      input.telemetryAmplificationScore * 0.2,
  );
}

export function scoreObserverAttentionFragmentation(input: RuntimeCognitiveGovernanceObserveInput): number {
  return round(
    input.observerOverheadRatio * 0.35 +
      Math.min(1, input.contextWindowCount / 12) * 0.35 +
      input.duplicateSignalRatio * 0.3,
  );
}

export function scoreReplayNarrativeComplexity(input: RuntimeCognitiveGovernanceObserveInput): number {
  return round(
    Math.min(1, input.replayCount / 100) * 0.35 +
      Math.min(1, input.narrativeNodeCount / 80) * 0.35 +
      input.narrativeDuplicationRatio * 0.3,
  );
}

export function scoreGovernanceAbstractionDepth(input: RuntimeCognitiveGovernanceObserveInput): number {
  return round(Math.min(1, input.governanceLayerCount / 12) * 0.65 + (1 - input.governanceConfidence) * 0.35);
}

export function scoreMetricInterpretationDifficulty(input: RuntimeCognitiveGovernanceObserveInput): number {
  return round(
    Math.min(1, input.uniqueSignalKinds / 24) * 0.25 +
      Math.min(1, input.timelineEventCount / 600) * 0.25 +
      scoreDashboardCognitiveLoad(input) * 0.25 +
      scoreGovernanceAbstractionDepth(input) * 0.25,
  );
}

export function scoreTimelineContextLossRisk(input: RuntimeCognitiveGovernanceObserveInput): number {
  const sessionBoost =
    input.sessionMinutes >= RUNTIME_COGNITIVE_GOVERNANCE_LONG_SESSION_MIN
      ? Math.min(0.35, (input.sessionMinutes - RUNTIME_COGNITIVE_GOVERNANCE_LONG_SESSION_MIN) / 500)
      : 0;
  return round(Math.min(1, input.timelineEventCount / 700) * 0.45 + (input.compressionRatio < 0.45 ? 0.2 : 0) + sessionBoost);
}

export function scoreOperatorDecisionLatencyRisk(input: RuntimeCognitiveGovernanceObserveInput): number {
  return round(
    Math.min(1, input.operatorInteractionLatencyMs / 3000) * 0.45 +
      scoreDashboardCognitiveLoad(input) * 0.3 +
      scoreObserverAttentionFragmentation(input) * 0.25,
  );
}

export function scoreNarrativeContinuity(input: RuntimeCognitiveGovernanceObserveInput): number {
  return round(1 - (input.narrativeDuplicationRatio * 0.35 + scoreTimelineContextLossRisk(input) * 0.35 + scoreSemanticDivergence(input) * 0.3));
}

export function scoreSemanticDivergence(input: RuntimeCognitiveGovernanceObserveInput): number {
  return round(input.duplicateSignalRatio * 0.25 + scoreSemanticNoiseRatio(input) * 0.45 + scoreSignalPriorityDrift(input) * 0.3);
}

export function scoreGovernanceDrift(input: RuntimeCognitiveGovernanceObserveInput): number {
  return round(scoreGovernanceAbstractionDepth(input) * 0.55 + (1 - input.governanceConfidence) * 0.45);
}

export function scoreObserverContextDecay(input: RuntimeCognitiveGovernanceObserveInput): number {
  const sessionFactor = input.sessionMinutes >= 120 ? Math.min(1, (input.sessionMinutes - 120) / 480) : 0;
  return round(sessionFactor * 0.35 + scoreObserverAttentionFragmentation(input) * 0.45 + scoreTimelineContextLossRisk(input) * 0.2);
}

export function scoreRecursiveMeaningAmplification(input: RuntimeCognitiveGovernanceObserveInput): number {
  return round(
    input.telemetryAmplificationScore * 0.3 +
      input.narrativeDuplicationRatio * 0.3 +
      scoreReplayNarrativeComplexity(input) * 0.25 +
      scoreGovernanceDrift(input) * 0.15,
  );
}

export function buildCognitiveGovernanceProfile(
  input: RuntimeCognitiveGovernanceObserveInput,
): RuntimeCognitiveGovernanceProfile {
  return {
    dashboardCognitiveLoad: scoreDashboardCognitiveLoad(input),
    semanticNoiseRatio: scoreSemanticNoiseRatio(input),
    signalPriorityDrift: scoreSignalPriorityDrift(input),
    observerAttentionFragmentation: scoreObserverAttentionFragmentation(input),
    replayNarrativeComplexity: scoreReplayNarrativeComplexity(input),
    governanceAbstractionDepth: scoreGovernanceAbstractionDepth(input),
    metricInterpretationDifficulty: scoreMetricInterpretationDifficulty(input),
    timelineContextLossRisk: scoreTimelineContextLossRisk(input),
    operatorDecisionLatencyRisk: scoreOperatorDecisionLatencyRisk(input),
    narrativeContinuity: scoreNarrativeContinuity(input),
    semanticDivergence: scoreSemanticDivergence(input),
    governanceDrift: scoreGovernanceDrift(input),
    observerContextDecay: scoreObserverContextDecay(input),
    recursiveMeaningAmplification: scoreRecursiveMeaningAmplification(input),
    measuredAt: new Date().toISOString(),
  };
}

