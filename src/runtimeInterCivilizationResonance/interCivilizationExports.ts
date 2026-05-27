import { RUNTIME_INTER_CIVILIZATION_VERSION } from '../constants/runtimeInterCivilizationResonance';
import type {
  RuntimeInterCivilizationExportBundle,
  RuntimeInterCivilizationObserveInput,
} from '../types/runtimeInterCivilizationResonance';
import {
  getLastRuntimeInterCivilizationProfile,
  getRuntimeInterCivilizationSuggestions,
} from './interCivilizationCoordinator';
import { buildRuntimeInterCivilizationProfile } from './interCivilizationScorers';
import { getInterCivilizationTimeline } from './interCivilizationTimeline';
import {
  buildCivilizationResonanceTopology,
  buildObserverInterferenceHeatmap,
  buildOntologyCollisionGraph,
  buildSemanticPluralityMonitor,
  buildWorldviewDivergenceRadar,
} from './interCivilizationVisualizations';

const defaultInput = (): RuntimeInterCivilizationObserveInput => ({
  observerRealitySelectionPressure: 0.12,
  semanticRealityPreference: 0.12,
  worldviewFixationRisk: 0.1,
  observerInterpretationBiasField: 0.1,
  recursiveRealitySelectionDepth: 0.1,
  semanticRealityAttractor: 0.1,
  observerNarrativeLock: 0.08,
  realitySelectionInstability: 0.1,
  semanticCausalityDrift: 0.1,
  narrativeCauseFragmentation: 0.1,
  recursiveMeaningCausalityLoop: 0.1,
  ontologyCausalInstability: 0.1,
  semanticEffectPropagationRisk: 0.1,
  observerCausalityDistortion: 0.1,
  worldviewCauseCompression: 0.1,
  semanticTemporalCausalityStress: 0.1,
  recursiveInterpretationBranching: 0.1,
  semanticPossibilityDivergence: 0.1,
  observerMeaningForkDensity: 0.1,
  ontologyBranchCollapseRisk: 0.1,
  narrativeBranchAmplification: 0.1,
  recursivePerspectiveSplitting: 0.1,
  semanticTimelineBranching: 0.1,
  interpretationConvergencePressure: 0.1,
  narrativeRealityCouplingStress: 0.1,
  semanticRealityDistance: 0.1,
  observerRealitySynchronization: 0.1,
  worldviewRealityVariance: 0.1,
  semanticReferenceIntegrity: 0.74,
  recursiveRealityFeedbackRisk: 0.1,
  ontologyRealityTension: 0.1,
  semanticRealityPersistence: 0.12,
  observerRealityFixationRisk: 0.08,
  semanticBeliefHardening: 0.08,
  recursiveNarrativeEntrenchment: 0.08,
  ontologyFlexibilityLoss: 0.1,
  semanticPerspectiveLock: 0.08,
  worldviewRigidityAmplification: 0.08,
  observerMeaningInertia: 0.1,
  semanticAdaptationResistance: 0.1,
  observerSignalCompetition: 0.1,
  semanticQueueFragmentation: 0.1,
  crossLayerObservationCongestion: 0.1,
  ontologyMonitoringCongestion: 0.1,
  recursiveNoiseAmplification: 0.1,
  semanticPriorityCollapse: 0.08,
});

export function buildRuntimeInterCivilizationExportBundle(): RuntimeInterCivilizationExportBundle {
  const profile = getLastRuntimeInterCivilizationProfile();
  const fallback = buildRuntimeInterCivilizationProfile(defaultInput());
  const exportProfile = profile ?? fallback;
  return {
    version: RUNTIME_INTER_CIVILIZATION_VERSION,
    exportedAt: new Date().toISOString(),
    civilizationResonanceReport: {
      topology: buildCivilizationResonanceTopology(exportProfile),
      resonance: profile?.interCivilizationResonance,
      timeline: getInterCivilizationTimeline(),
    },
    ontologyCollisionAnalysis: {
      graph: buildOntologyCollisionGraph(exportProfile),
      collisionDensity: profile?.ontologyCollisionDensity,
    },
    observerInterferenceReport: {
      heatmap: buildObserverInterferenceHeatmap(exportProfile),
      interferenceRisk: profile?.observerInterferenceRisk,
    },
    worldviewDivergenceAnalysis: {
      radar: buildWorldviewDivergenceRadar(exportProfile),
      driftVelocity: profile?.civilizationDriftVelocity,
    },
    semanticPluralityReport: {
      monitor: buildSemanticPluralityMonitor(exportProfile),
      pluralityIntegrity: profile?.semanticPluralityIntegrity,
    },
    civilizationSynchronizationAnalysis: {
      synchronization: profile?.observerCollectiveSynchronization,
      cascadeRisk: profile?.semanticResonanceCascadeRisk,
    },
    suggestions: getRuntimeInterCivilizationSuggestions(),
    profile,
  };
}

export function formatRuntimeInterCivilizationExportJson(): string {
  return JSON.stringify(buildRuntimeInterCivilizationExportBundle(), null, 2);
}
