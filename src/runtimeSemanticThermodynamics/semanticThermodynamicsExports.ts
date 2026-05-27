import type {
  RuntimeSemanticThermodynamicsExportBundle,
  RuntimeSemanticThermodynamicsObserveInput,
} from '../types/runtimeSemanticThermodynamics';
import { RUNTIME_SEMANTIC_THERMODYNAMICS_VERSION } from '../constants/runtimeSemanticThermodynamics';
import {
  getLastRuntimeSemanticThermodynamicsProfile,
  getRuntimeSemanticThermodynamicsWarnings,
} from './semanticThermodynamicsCoordinator';
import { getSemanticThermodynamicsTimeline } from './semanticThermodynamicsTimeline';
import { buildRuntimeSemanticThermodynamicsProfile } from './semanticThermodynamicsScorers';
import {
  buildEntropyDissipationFlowMap,
  buildObserverThermalSaturationGraph,
  buildOntologyTurbulenceField,
  buildRuntimeHeatDeathMonitor,
  buildSemanticTemperatureHeatmap,
} from './semanticThermodynamicsVisualizations';

const defaultInput = (): RuntimeSemanticThermodynamicsObserveInput => ({
  semanticGravityMass: 0.18,
  semanticSingularityRisk: 0.12,
  semanticCollapsePotential: 0.16,
  semanticAnchorDivergence: 0.14,
  semanticOrbitInstability: 0.12,
  anchorCouplingStress: 0.12,
  ontologyDensityPressure: 0.14,
  ontologyOverCentralizationRisk: 0.12,
  ontologyPluralityIntegrity: 0.74,
  semanticEquilibriumScore: 0.76,
  semanticDiversityRetention: 0.72,
  observerPerspectiveBalance: 0.76,
  narrativeEntropyBalance: 0.74,
  semanticTensionStability: 0.72,
  canonicalTruthPressure: 0.14,
  semanticMonocultureRisk: 0.12,
  semanticOrthodoxyPressure: 0.1,
  recursiveTruthAmplification: 0.12,
  observerDoctrineFormation: 0.1,
  metricSacralizationRisk: 0.12,
  metricVocabularyEntropy: 0.16,
  duplicateMeaningDensity: 0.12,
  semanticEntropyBudget: 0.18,
  crossLayerMeaningCollapse: 0.12,
  recursiveMeaningDependency: 0.1,
  observerDependencyLoopRisk: 0.08,
  metricReferenceCycleDepth: 0.08,
  dashboardSemanticCrowding: 0.14,
  operatorSemanticFatigue: 0.12,
  replayCount: 8,
  replayAmplificationRisk: 0.1,
  observerChainDepth: 4,
  observerContextDecay: 0.1,
  topologyCollapseRisk: 0.1,
  ontologyFragmentationIndex: 0.1,
  recursiveOntologyDepth: 0.08,
  compressionRatio: 0.72,
  metricContainmentRatio: 0.74,
  boundednessConfidence: 0.78,
  runtimeFiniteBoundaryIndex: 0.76,
});

export function buildRuntimeSemanticThermodynamicsExportBundle(): RuntimeSemanticThermodynamicsExportBundle {
  const profile = getLastRuntimeSemanticThermodynamicsProfile();
  const fallback = buildRuntimeSemanticThermodynamicsProfile(defaultInput());
  const exportProfile = profile ?? fallback;
  return {
    version: RUNTIME_SEMANTIC_THERMODYNAMICS_VERSION,
    exportedAt: new Date().toISOString(),
    semanticThermodynamicsReport: {
      profile,
      heatmap: buildSemanticTemperatureHeatmap(exportProfile),
      timeline: getSemanticThermodynamicsTimeline(),
    },
    ontologyTurbulenceAnalysis: {
      field: buildOntologyTurbulenceField(exportProfile),
      turbulence: profile?.ontologyTurbulenceIntensity,
    },
    observerThermalSaturationReport: {
      graph: buildObserverThermalSaturationGraph(exportProfile),
      fatigue: profile?.observerThermalFatigue,
    },
    entropyPropagationAnalysis: {
      flowMap: buildEntropyDissipationFlowMap(exportProfile),
      propagation: profile?.semanticEnergyPropagation,
    },
    semanticHeatAccumulationReport: {
      heatIndex: profile?.runtimeMeaningHeatIndex,
      heatAccumulation: profile?.semanticHeatAccumulation,
    },
    runtimeHeatDeathRiskAnalysis: {
      monitor: buildRuntimeHeatDeathMonitor(exportProfile),
      risk: profile?.semanticHeatDeathRisk,
    },
    warnings: getRuntimeSemanticThermodynamicsWarnings(),
    profile,
  };
}

export function formatRuntimeSemanticThermodynamicsExportJson(): string {
  return JSON.stringify(buildRuntimeSemanticThermodynamicsExportBundle(), null, 2);
}
