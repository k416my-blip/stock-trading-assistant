import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';
import { NARRATIVE_FLOW_DIMENSIONS } from '../constants/runtimeNarrativeIntegrity';

const evolution: { at: string; score: number }[] = [];

export function resetRuntimeNarrativeIntegrityCoordinatorForTest(): void {
  evolution.length = 0;
}

function scoreNarrativeDimension(input: RuntimeNarrativeIntegrityObserveInput, dim: string): number {
  switch (dim) {
    case 'observer':
      return 1 - input.observerOverheadRatio;
    case 'agency':
      return input.runtimeAgencyIntegrityScore;
    case 'epistemic':
      return input.runtimeRealityIntegrityScore;
    case 'coherence':
      return input.runtimeStrategicCoherence;
    case 'governance':
      return 1 - Math.min(1, input.runtimeGovernanceInflationRisk);
    case 'utility':
      return input.runtimeUnifiedUtilityScore;
    case 'purpose':
      return input.runtimePurposeIntegrityScore;
    case 'continuity':
      return input.continuityScore / 100;
    case 'meta_cognition':
      return input.runtimeMetaCognitionScore;
    default:
      return 0.5;
  }
}

export function scoreRuntimeNarrativeIntegrity(input: RuntimeNarrativeIntegrityObserveInput): number {
  const dims = NARRATIVE_FLOW_DIMENSIONS.map((d) => scoreNarrativeDimension(input, d));
  const mean = dims.reduce((a, b) => a + b, 0) / dims.length;
  const spread = Math.max(...dims) - Math.min(...dims);
  let score = mean * (1 - spread * 0.2) * 0.46;
  score += input.runtimeMetaCognitionScore * 0.12;
  score += input.crossLayerSelfConsistency * 0.1;
  score += input.runtimeEpistemicConfidence * 0.08;
  score -= input.recursiveSelfObservationRisk * 0.06;
  score -= input.recursiveBeliefReinforcementRisk * 0.06;
  score -= input.metaRecursionRisk * 0.05;
  const rounded = Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
  evolution.push({ at: new Date().toISOString(), score: rounded });
  if (evolution.length > 64) evolution.shift();
  return rounded;
}

export function getNarrativeIntegrityEvolution(): { at: string; score: number }[] {
  return [...evolution];
}
