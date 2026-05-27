import type {
  RuntimeSemanticPhaseExportBundle,
  RuntimeSemanticPhaseObserveInput,
} from '../types/runtimeSemanticPhaseTransition';
import { RUNTIME_SEMANTIC_PHASE_VERSION } from '../constants/runtimeSemanticPhaseTransition';
import {
  getLastRuntimeSemanticPhaseProfile,
  getRuntimeSemanticPhaseWarnings,
} from './semanticPhaseCoordinator';
import { getSemanticPhaseTimeline } from './semanticPhaseTimeline';
import { buildRuntimeSemanticPhaseProfile } from './semanticPhaseScorers';
import {
  buildOntologyStateTopology,
  buildRecursiveCrystallizationGraph,
  buildSemanticCollapseMonitor,
  buildSemanticFluidDynamicsField,
  buildSemanticPhaseMap,
} from './semanticPhaseVisualizations';

const defaultInput = (): RuntimeSemanticPhaseObserveInput => ({
  semanticEntropyLevel: 0.18,
  semanticHeatDensity: 0.16,
  ontologyThermalPressure: 0.14,
  recursiveMeaningTemperature: 0.12,
  semanticEnergyPropagation: 0.12,
  entropyAmplificationRisk: 0.14,
  semanticHeatAccumulation: 0.14,
  runtimeMeaningHeatIndex: 0.16,
  semanticDissipationEfficiency: 0.72,
  ontologyCoolingPotential: 0.72,
  observerEntropyDrain: 0.72,
  semanticThermalLeakage: 0.12,
  replayEntropyPropagation: 0.12,
  dashboardHeatRetention: 0.14,
  semanticPressurePersistence: 0.12,
  entropyContainmentStress: 0.16,
  ontologyTurbulenceIntensity: 0.12,
  semanticVortexFormation: 0.1,
  recursiveMeaningTurbulence: 0.1,
  worldviewConvectionRisk: 0.1,
  observerInterpretationInstability: 0.1,
  semanticPressureWaveRisk: 0.1,
  ontologyFlowFragmentation: 0.1,
  observerThermalFatigue: 0.12,
  cognitiveHeatOverload: 0.12,
  dashboardThermalSaturation: 0.12,
  semanticAttentionBurnout: 0.1,
  interpretationHeatStress: 0.1,
  replayObservationExhaustion: 0.1,
  observerCoolingDeficit: 0.1,
  semanticHeatDeathRisk: 0.08,
  ontologySignalDecay: 0.08,
  meaningResolutionCollapse: 0.08,
  semanticNoiseDominance: 0.1,
  metricThermalEquilibriumFailure: 0.1,
  observerMeaningBlindness: 0.08,
  semanticExhaustionPotential: 0.08,
  recursiveEnergyFeedback: 0.1,
  semanticEnergyLoopRisk: 0.1,
  ontologyPropagationCascade: 0.1,
  replayHeatAmplification: 0.1,
  observerChainThermalPropagation: 0.1,
  semanticResonancePressure: 0.1,
  semanticEquilibriumScore: 0.76,
  ontologyPluralityIntegrity: 0.74,
  semanticDiversityRetention: 0.72,
  observerPerspectiveBalance: 0.74,
  narrativeEntropyBalance: 0.74,
  semanticTensionStability: 0.72,
  canonicalTruthPressure: 0.12,
  semanticMonocultureRisk: 0.1,
  semanticOrthodoxyPressure: 0.1,
  recursiveTruthAmplification: 0.1,
  observerDoctrineFormation: 0.1,
  metricSacralizationRisk: 0.1,
  observerDependencyLoopRisk: 0.1,
  topologyCollapseRisk: 0.1,
  boundednessConfidence: 0.76,
  runtimeFiniteBoundaryIndex: 0.74,
  compressionRatio: 0.72,
});

export function buildRuntimeSemanticPhaseExportBundle(): RuntimeSemanticPhaseExportBundle {
  const profile = getLastRuntimeSemanticPhaseProfile();
  const fallback = buildRuntimeSemanticPhaseProfile(defaultInput());
  const exportProfile = profile ?? fallback;
  return {
    version: RUNTIME_SEMANTIC_PHASE_VERSION,
    exportedAt: new Date().toISOString(),
    semanticPhaseTransitionReport: {
      profile,
      phaseMap: buildSemanticPhaseMap(exportProfile),
      timeline: getSemanticPhaseTimeline(),
    },
    ontologyStateAnalysis: {
      topology: buildOntologyStateTopology(exportProfile),
      stateShift: profile?.ontologyStateShiftRisk,
    },
    recursiveCrystallizationReport: {
      graph: buildRecursiveCrystallizationGraph(exportProfile),
      crystalRisk: profile?.recursiveMeaningCrystalRisk,
    },
    semanticFluidDynamicsAnalysis: {
      field: buildSemanticFluidDynamicsField(exportProfile),
      turbulence: profile?.semanticFlowTurbulence,
    },
    observerSynchronizationReport: {
      synchronizationRisk: profile?.observerStateSynchronizationRisk,
      phaseLockRisk: profile?.observerPhaseLockRisk,
    },
    semanticCollapseRiskAnalysis: {
      monitor: buildSemanticCollapseMonitor(exportProfile),
      collapseRisk: profile?.semanticStateCollapseRisk,
    },
    warnings: getRuntimeSemanticPhaseWarnings(),
    profile,
  };
}

export function formatRuntimeSemanticPhaseExportJson(): string {
  return JSON.stringify(buildRuntimeSemanticPhaseExportBundle(), null, 2);
}
