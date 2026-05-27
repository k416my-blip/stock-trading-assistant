import type {
  RuntimeCognitiveGovernanceObserveInput,
  RuntimeCognitiveGovernanceProfile,
  SemanticSignalTopology,
} from '../types/runtimeCognitiveGovernance';
import { COGNITIVE_GOVERNANCE_LAYERS } from '../constants/runtimeCognitiveGovernance';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetCognitiveVisualizationBuildersForTest(): void {
  /* stateless */
}

export function buildCognitiveHeatmap(
  profile: RuntimeCognitiveGovernanceProfile,
): { layer: string; load: number }[] {
  const values = [
    profile.dashboardCognitiveLoad,
    profile.semanticNoiseRatio,
    profile.governanceAbstractionDepth,
    profile.replayNarrativeComplexity,
    profile.timelineContextLossRisk,
    profile.operatorDecisionLatencyRisk,
  ];
  return COGNITIVE_GOVERNANCE_LAYERS.map((layer, index) => ({
    layer,
    load: round(values[index] ?? profile.dashboardCognitiveLoad),
  }));
}

export function buildSemanticDensityGraph(
  input: RuntimeCognitiveGovernanceObserveInput,
  profile: RuntimeCognitiveGovernanceProfile,
): SemanticSignalTopology {
  const nodes = ['critical', 'governance', 'telemetry', 'replay', 'dashboard', 'low_value'].map(
    (label, index) => ({
      id: `${label}_${index}`,
      label,
      importance: round(
        label === 'critical'
          ? Math.min(1, input.criticalSignalCount / Math.max(1, input.semanticSignalCount) * 6)
          : Math.max(0.05, 1 - profile.semanticNoiseRatio - index * 0.04),
      ),
    }),
  );
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({
      from: node.id,
      to: nodes[index + 1]?.id ?? node.id,
      drift: profile.signalPriorityDrift,
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function buildAttentionFragmentationRadar(
  profile: RuntimeCognitiveGovernanceProfile,
): { axis: string; value: number }[] {
  return [
    { axis: 'attention', value: profile.observerAttentionFragmentation },
    { axis: 'noise', value: profile.semanticNoiseRatio },
    { axis: 'context', value: profile.observerContextDecay },
    { axis: 'latency', value: profile.operatorDecisionLatencyRisk },
  ];
}

export function buildReplayComplexityTimeline(
  profile: RuntimeCognitiveGovernanceProfile,
  prior: { at: string; level: number }[],
): { at: string; level: number }[] {
  return [...prior, { at: new Date().toISOString(), level: profile.replayNarrativeComplexity }].slice(-48);
}

export function buildGovernanceAbstractionLadder(
  profile: RuntimeCognitiveGovernanceProfile,
): { rung: string; depth: number }[] {
  return ['signal', 'metric', 'policy', 'governance', 'meta'].map((rung, index) => ({
    rung,
    depth: round(profile.governanceAbstractionDepth * (0.65 + index * 0.08)),
  }));
}

export function buildSignalImportanceMap(
  input: RuntimeCognitiveGovernanceObserveInput,
  profile: RuntimeCognitiveGovernanceProfile,
): { signal: string; importance: number }[] {
  return [
    { signal: 'critical', importance: round(input.criticalSignalCount / Math.max(1, input.semanticSignalCount) * 6) },
    { signal: 'governance', importance: round(1 - profile.governanceDrift) },
    { signal: 'operator', importance: round(1 - profile.operatorDecisionLatencyRisk) },
    { signal: 'replay', importance: round(1 - profile.replayNarrativeComplexity) },
    { signal: 'low_value', importance: round(1 - profile.semanticNoiseRatio) },
  ];
}
