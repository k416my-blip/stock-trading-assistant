import { RUNTIME_GOVERNANCE_FREEZE_VERSION } from '../constants/runtimeGovernanceFreeze';
import type {
  RuntimeGovernanceFreezeExportBundle,
  RuntimeGovernanceFreezeObserveInput,
} from '../types/runtimeGovernanceFreeze';
import {
  getLastRuntimeGovernanceFreezeProfile,
  getRuntimeGovernanceFreezeSuggestions,
} from './governanceFreezeCoordinator';
import { buildRuntimeGovernanceFreezeProfile } from './governanceFreezeScorers';
import { getGovernanceFreezeTimeline } from './governanceFreezeTimeline';
import {
  buildExpansionEntropyGraph,
  buildGovernanceFreezeReadinessMonitor,
  buildRuntimeOperationalPressureHeatmap,
  buildStackSaturationDashboard,
} from './governanceFreezeVisualizations';

const defaultInput = (): RuntimeGovernanceFreezeObserveInput => ({
  interCivilizationResonance: 0.12,
  semanticResonanceCascadeRisk: 0.12,
  ontologyCollisionDensity: 0.1,
  civilizationDriftVelocity: 0.1,
  observerInterferenceRisk: 0.1,
  semanticPluralityIntegrity: 0.74,
  ontologyCoexistenceStability: 0.74,
  worldviewElasticityIndex: 0.74,
  civilizationBoundaryResilience: 0.74,
  recursiveMeaningBalance: 0.74,
  ontologyEquilibriumPressure: 0.74,
  semanticConsensusInstability: 0.1,
  ontologyPartitionStress: 0.1,
  recursiveInterpretationInterference: 0.1,
  observerSynchronizationCollapse: 0.1,
  automatedSoakScenarioCount: 26,
  runtimeStackScriptCount: 16,
  dashboardLayerCount: 16,
  reviewDocCount: 40,
});

export function buildRuntimeGovernanceFreezeExportBundle(): RuntimeGovernanceFreezeExportBundle {
  const profile = getLastRuntimeGovernanceFreezeProfile();
  const fallback = buildRuntimeGovernanceFreezeProfile(defaultInput());
  const exportProfile = profile ?? fallback;
  return {
    version: RUNTIME_GOVERNANCE_FREEZE_VERSION,
    exportedAt: new Date().toISOString(),
    governanceFreezeAnalysis: {
      entropyGraph: buildExpansionEntropyGraph(exportProfile),
      freezeConfidence: profile?.expansionFreezeConfidence,
      timeline: getGovernanceFreezeTimeline(),
    },
    runtimeMaintainabilityReport: {
      maintainability: profile?.stackMaintainabilityIndex,
      pressureHeatmap: buildRuntimeOperationalPressureHeatmap(exportProfile),
    },
    operationalConvergenceAnalysis: {
      convergence: profile?.operationalConvergenceScore,
      steadyState: profile?.operationalSteadyStateScore,
    },
    stackSaturationReport: {
      saturation: buildStackSaturationDashboard(exportProfile),
      fragility: profile?.runtimeOperationalFragility,
    },
    observabilityCostReport: {
      cost: profile?.observabilityCostGradient,
      verifyStress: profile?.verifyExecutionStress,
    },
    stabilizationReadinessReport: {
      monitor: buildGovernanceFreezeReadinessMonitor(exportProfile),
      finalization: profile?.stackFinalizationReadiness,
    },
    suggestions: getRuntimeGovernanceFreezeSuggestions(),
    profile,
  };
}

export function formatRuntimeGovernanceFreezeExportJson(): string {
  return JSON.stringify(buildRuntimeGovernanceFreezeExportBundle(), null, 2);
}
