import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildRuntimeInterCivilizationExportBundle,
  getRuntimeInterCivilizationDashboard,
  initRuntimeInterCivilization,
  observeRuntimeInterCivilization,
  resetRuntimeInterCivilizationForTest,
  shouldRunRuntimeInterCivilizationSample,
} from '../../../src/runtimeInterCivilizationResonance';

function baseInput() {
  return {
    observerRealitySelectionPressure: 0.72,
    semanticRealityPreference: 0.7,
    worldviewFixationRisk: 0.68,
    observerInterpretationBiasField: 0.7,
    recursiveRealitySelectionDepth: 0.72,
    semanticRealityAttractor: 0.7,
    observerNarrativeLock: 0.68,
    realitySelectionInstability: 0.7,
    semanticCausalityDrift: 0.68,
    narrativeCauseFragmentation: 0.7,
    recursiveMeaningCausalityLoop: 0.72,
    ontologyCausalInstability: 0.68,
    semanticEffectPropagationRisk: 0.7,
    observerCausalityDistortion: 0.68,
    worldviewCauseCompression: 0.66,
    semanticTemporalCausalityStress: 0.68,
    recursiveInterpretationBranching: 0.72,
    semanticPossibilityDivergence: 0.7,
    observerMeaningForkDensity: 0.68,
    ontologyBranchCollapseRisk: 0.66,
    narrativeBranchAmplification: 0.7,
    recursivePerspectiveSplitting: 0.72,
    semanticTimelineBranching: 0.68,
    interpretationConvergencePressure: 0.66,
    narrativeRealityCouplingStress: 0.7,
    semanticRealityDistance: 0.68,
    observerRealitySynchronization: 0.66,
    worldviewRealityVariance: 0.7,
    semanticReferenceIntegrity: 0.34,
    recursiveRealityFeedbackRisk: 0.7,
    ontologyRealityTension: 0.68,
    semanticRealityPersistence: 0.66,
    observerRealityFixationRisk: 0.68,
    semanticBeliefHardening: 0.7,
    recursiveNarrativeEntrenchment: 0.72,
    ontologyFlexibilityLoss: 0.68,
    semanticPerspectiveLock: 0.7,
    worldviewRigidityAmplification: 0.68,
    observerMeaningInertia: 0.7,
    semanticAdaptationResistance: 0.68,
    observerSignalCompetition: 0.7,
    semanticQueueFragmentation: 0.68,
    crossLayerObservationCongestion: 0.66,
    ontologyMonitoringCongestion: 0.68,
    recursiveNoiseAmplification: 0.7,
    semanticPriorityCollapse: 0.68,
  };
}

describe('runtimeInterCivilizationResonance', () => {
  beforeEach(() => resetRuntimeInterCivilizationForTest());

  it('observes inter-civilization profile and dashboard', () => {
    initRuntimeInterCivilization();
    const p = observeRuntimeInterCivilization(baseInput());
    expect(p.interCivilizationResonance).toBeGreaterThan(0);
    expect(p.ontologyCollisionDensity).toBeGreaterThan(0);
    expect(p.civilizationDriftVelocity).toBeGreaterThan(0);
    expect(p.observerInterferenceRisk).toBeGreaterThan(0);
    expect(p.semanticPluralityIntegrity).toBeGreaterThan(0);

    const dash = getRuntimeInterCivilizationDashboard();
    expect(dash?.civilizationResonanceTopology.nodes.length).toBeGreaterThan(0);
    expect(dash?.ontologyCollisionGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.worldviewDivergenceRadar.length).toBeGreaterThan(0);
    expect(dash?.observerInterferenceHeatmap.length).toBeGreaterThan(0);
    expect(dash?.civilizationSynchronizationTimeline.length).toBeGreaterThan(0);
    expect(dash?.semanticPluralityMonitor.length).toBeGreaterThan(0);
    expect(dash?.ontologyPartitionTopology.nodes.length).toBeGreaterThan(0);
    expect(dash?.recursiveResonanceCascadeGraph.nodes.length).toBeGreaterThan(0);
  });

  it('records observe-only suggestions', () => {
    initRuntimeInterCivilization();
    observeRuntimeInterCivilization(baseInput());
    const dash = getRuntimeInterCivilizationDashboard();
    expect(dash?.suggestions.every((s) => s.observeOnly)).toBe(true);
  });

  it('throttles samples', () => {
    initRuntimeInterCivilization();
    expect(shouldRunRuntimeInterCivilizationSample(baseInput())).toBe(true);
    expect(shouldRunRuntimeInterCivilizationSample(baseInput())).toBe(false);
  });

  it('exports inter-civilization sections', () => {
    initRuntimeInterCivilization();
    observeRuntimeInterCivilization(baseInput());
    const bundle = buildRuntimeInterCivilizationExportBundle();
    expect(bundle.civilizationResonanceReport).toBeTruthy();
    expect(bundle.ontologyCollisionAnalysis).toBeTruthy();
    expect(bundle.observerInterferenceReport).toBeTruthy();
    expect(bundle.worldviewDivergenceAnalysis).toBeTruthy();
    expect(bundle.semanticPluralityReport).toBeTruthy();
    expect(bundle.civilizationSynchronizationAnalysis).toBeTruthy();
  });
});
