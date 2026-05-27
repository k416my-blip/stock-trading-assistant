import type {
  RuntimeSemanticPhaseObserveInput,
  RuntimeSemanticPhaseTimelineEntry,
} from '../types/runtimeSemanticPhaseTransition';
import { buildRuntimeSemanticPhaseProfile } from './semanticPhaseScorers';
import { recordSemanticPhaseTimeline } from './semanticPhaseTimeline';

export type SemanticPhaseFlowResult = {
  flow: RuntimeSemanticPhaseTimelineEntry['flow'];
  detailJa: string;
};

export function runSemanticPhaseFlows(input: RuntimeSemanticPhaseObserveInput): SemanticPhaseFlowResult[] {
  const profile = buildRuntimeSemanticPhaseProfile(input);
  const results: SemanticPhaseFlowResult[] = [
    {
      flow: 'semantic_phase_transition',
      detailJa: `volatility ${profile.semanticPhaseVolatility} · velocity ${profile.semanticStateTransitionVelocity}`,
    },
    {
      flow: 'ontology_state_shift',
      detailJa: `state shift ${profile.ontologyStateShiftRisk} · entropy ${profile.ontologyStateEntropy}`,
    },
    {
      flow: 'recursive_crystallization',
      detailJa: `crystal ${profile.recursiveMeaningCrystalRisk} · lattice ${profile.semanticLatticeFormation}`,
    },
    {
      flow: 'semantic_fluid_dynamics',
      detailJa: `flow turbulence ${profile.semanticFlowTurbulence} · viscosity ${profile.ontologyViscosityIndex}`,
    },
    {
      flow: 'observer_synchronization',
      detailJa: `sync ${profile.observerStateSynchronizationRisk} · phase lock ${profile.observerPhaseLockRisk}`,
    },
    {
      flow: 'semantic_collapse',
      detailJa: 'semantic collapse observations recorded only; no forcing/stabilization/correction',
    },
  ];
  for (const result of results) recordSemanticPhaseTimeline(result.flow, result.detailJa);
  return results;
}
