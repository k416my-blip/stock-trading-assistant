import type {
  RuntimeSemanticPhaseProfile,
  SemanticPhaseGraph,
} from '../types/runtimeSemanticPhaseTransition';
import {
  SEMANTIC_PHASE_LAYERS,
  SEMANTIC_PHASE_STATES,
} from '../constants/runtimeSemanticPhaseTransition';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetSemanticPhaseVisualizationsForTest(): void {
  /* stateless */
}

function buildGraph(labels: readonly string[], phase: number, transition: number): SemanticPhaseGraph {
  const nodes = labels.map((label, index) => ({
    id: `${label}_${index}`,
    label,
    phase: round(phase * (0.72 + index * 0.05)),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({
      from: node.id,
      to: nodes[index + 1]?.id ?? node.id,
      transition: round(transition),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function buildSemanticPhaseMap(profile: RuntimeSemanticPhaseProfile): SemanticPhaseGraph {
  return buildGraph(SEMANTIC_PHASE_STATES, profile.meaningPhaseInstability, profile.semanticStateTransitionVelocity);
}

export function buildOntologyStateTopology(profile: RuntimeSemanticPhaseProfile): SemanticPhaseGraph {
  return buildGraph(SEMANTIC_PHASE_LAYERS, profile.ontologyStateShiftRisk, profile.ontologyCollectiveDrift);
}

export function buildRecursiveCrystallizationGraph(profile: RuntimeSemanticPhaseProfile): SemanticPhaseGraph {
  return buildGraph(['meaning', 'canonical', 'lattice', 'belief', 'topology', 'rigidification'], profile.recursiveMeaningCrystalRisk, profile.semanticCrystallizationPressure);
}

export function buildSemanticFluidDynamicsField(profile: RuntimeSemanticPhaseProfile): SemanticPhaseGraph {
  return buildGraph(['flow', 'viscosity', 'current', 'pressure', 'convection', 'circulation'], profile.semanticFlowTurbulence, profile.semanticCirculationStress);
}

export function buildObserverSynchronizationRadar(profile: RuntimeSemanticPhaseProfile): { axis: string; value: number }[] {
  return [
    { axis: 'sync risk', value: profile.observerStateSynchronizationRisk },
    { axis: 'consensus', value: profile.recursiveConsensusFormation },
    { axis: 'pressure', value: profile.semanticSynchronizationPressure },
    { axis: 'phase lock', value: profile.observerPhaseLockRisk },
    { axis: 'collective drift', value: profile.ontologyCollectiveDrift },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildOntologyRigidityHeatmap(profile: RuntimeSemanticPhaseProfile): { layer: string; rigidity: number }[] {
  const values = [
    profile.ontologyRigidityGradient,
    profile.semanticSolidificationRisk,
    profile.canonicalMeaningSolidification,
    profile.ontologyRigidificationRisk,
    profile.semanticFlexibilityLoss,
    profile.worldviewRigidCollapse,
  ];
  return SEMANTIC_PHASE_LAYERS.map((layer, index) => ({
    layer,
    rigidity: round(values[index] ?? profile.ontologyRigidificationRisk),
  }));
}

export function buildSemanticCollapseMonitor(profile: RuntimeSemanticPhaseProfile): { label: string; value: number }[] {
  return [
    { label: 'collapse', value: profile.semanticStateCollapseRisk },
    { label: 'compression', value: profile.ontologyCompressionCollapse },
    { label: 'freeze', value: profile.recursiveMeaningFreeze },
    { label: 'lock', value: profile.observerInterpretationLock },
    { label: 'recovery difficulty', value: profile.semanticRecoveryDifficulty },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildSemanticStateTransitionTimeline(
  profile: RuntimeSemanticPhaseProfile,
  prior: { at: string; velocity: number }[],
): { at: string; velocity: number }[] {
  return [...prior, { at: new Date().toISOString(), velocity: profile.semanticStateTransitionVelocity }].slice(-48);
}
