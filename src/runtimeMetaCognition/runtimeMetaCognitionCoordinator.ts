import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';
import { META_COGNITION_FLOW_DIMENSIONS } from '../constants/runtimeMetaCognition';

const evolution: { at: string; score: number }[] = [];

export function resetRuntimeMetaCognitionCoordinatorForTest(): void {
  evolution.length = 0;
}

function scoreMetaDimension(input: RuntimeMetaCognitionObserveInput, dim: string): number {
  switch (dim) {
    case 'observer':
      return 1 - input.observerOverheadRatio;
    case 'audit':
      return 1 - Math.min(1, input.runtimeAuditCoverage);
    case 'governance':
      return 1 - Math.min(1, input.runtimeGovernanceInflationRisk);
    case 'coherence':
      return input.runtimeStrategicCoherence;
    case 'continuity':
      return input.continuityScore / 100;
    case 'equilibrium':
      return input.runtimeEquilibriumStability;
    case 'agency':
      return input.runtimeAgencyIntegrityScore;
    case 'epistemic':
      return input.runtimeRealityIntegrityScore;
    case 'purpose':
      return input.runtimePurposeIntegrityScore;
    case 'utility':
      return input.runtimeUnifiedUtilityScore;
    default:
      return 0.5;
  }
}

export function scoreRuntimeMetaCognition(input: RuntimeMetaCognitionObserveInput): number {
  const dims = META_COGNITION_FLOW_DIMENSIONS.map((d) => scoreMetaDimension(input, d));
  const mean = dims.reduce((a, b) => a + b, 0) / dims.length;
  const spread = Math.max(...dims) - Math.min(...dims);
  let score = mean * (1 - spread * 0.2) * 0.48;
  score += input.runtimeAgencyIntegrityScore * 0.12;
  score += input.runtimeEpistemicConfidence * 0.1;
  score += input.crossLayerAgencyConsistency * 0.08;
  score -= input.recursiveAutonomyInflationRisk * 0.06;
  score -= input.observerAgencyFusionRisk * 0.06;
  score -= input.metaRecursionRisk * 0.05;
  const rounded = Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
  evolution.push({ at: new Date().toISOString(), score: rounded });
  if (evolution.length > 64) evolution.shift();
  return rounded;
}

export function getMetaCognitionEvolution(): { at: string; score: number }[] {
  return [...evolution];
}
