import type {
  RuntimeSemanticCompressionObserveInput,
  RuntimeSemanticCompressionProfile,
  SemanticCompressionGraph,
} from '../types/runtimeSemanticCompression';
import {
  SEMANTIC_COMPRESSION_LAYERS,
  SEMANTIC_METRIC_FAMILIES,
} from '../constants/runtimeSemanticCompression';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetSemanticCompressionVisualizationsForTest(): void {
  /* stateless */
}

function buildGraph(labels: readonly string[], density: number, overlap: number): SemanticCompressionGraph {
  const nodes = labels.map((label, index) => ({
    id: `${label}_${index}`,
    label,
    density: round(density * (0.72 + index * 0.05)),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({
      from: node.id,
      to: nodes[index + 1]?.id ?? node.id,
      overlap: round(overlap),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function buildSemanticOverlapHeatmap(
  input: RuntimeSemanticCompressionObserveInput,
  profile: RuntimeSemanticCompressionProfile,
): { layer: string; overlap: number }[] {
  const values = [
    input.duplicateMetricRatio,
    input.semanticRedundancyRatio,
    profile.semanticNamingDrift,
    profile.crossLayerSemanticOverlap,
    profile.metricIdentityInstability,
    profile.metricCanonicalizationPressure,
  ];
  return SEMANTIC_COMPRESSION_LAYERS.map((layer, index) => ({
    layer,
    overlap: round(values[index] ?? profile.crossLayerSemanticOverlap),
  }));
}

export function buildCanonicalMetricGraph(profile: RuntimeSemanticCompressionProfile): SemanticCompressionGraph {
  return buildGraph(SEMANTIC_METRIC_FAMILIES, profile.canonicalMetricConfidence, profile.metricCanonicalizationPressure);
}

export function buildMetricFamilyTopology(profile: RuntimeSemanticCompressionProfile): SemanticCompressionGraph {
  return buildGraph(['metric', 'alias', 'family', 'canonical', 'dashboard', 'observer'], profile.duplicateMeaningDensity, profile.crossLayerSemanticOverlap);
}

export function buildObserverDependencyGraph(profile: RuntimeSemanticCompressionProfile): SemanticCompressionGraph {
  return buildGraph(['observer', 'metric-ref', 'alias-ref', 'canonical-ref', 'observer'], profile.observerAliasRisk, profile.observerDependencyLoopRisk);
}

export function buildSemanticRedundancyRadar(profile: RuntimeSemanticCompressionProfile): { axis: string; value: number }[] {
  return [
    { axis: 'overlap', value: profile.crossLayerSemanticOverlap },
    { axis: 'duplicate density', value: profile.duplicateMeaningDensity },
    { axis: 'vocabulary entropy', value: profile.metricVocabularyEntropy },
    { axis: 'panel redundancy', value: profile.semanticPanelRedundancy },
    { axis: 'deadlock', value: profile.canonicalizationDeadlockRisk },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildCompressionPressureTimeline(
  profile: RuntimeSemanticCompressionProfile,
  prior: { at: string; pressure: number }[],
): { at: string; pressure: number }[] {
  return [...prior, { at: new Date().toISOString(), pressure: profile.metricCanonicalizationPressure }].slice(-48);
}
