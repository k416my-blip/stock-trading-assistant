import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildRuntimeGovernanceFreezeExportBundle,
  getRuntimeGovernanceFreezeDashboard,
  initRuntimeGovernanceFreeze,
  observeRuntimeGovernanceFreeze,
  resetRuntimeGovernanceFreezeForTest,
  shouldRunRuntimeGovernanceFreezeSample,
} from '../../../src/runtimeGovernanceFreeze';

function baseInput() {
  return {
    interCivilizationResonance: 0.72,
    semanticResonanceCascadeRisk: 0.7,
    ontologyCollisionDensity: 0.68,
    civilizationDriftVelocity: 0.66,
    observerInterferenceRisk: 0.68,
    semanticPluralityIntegrity: 0.34,
    ontologyCoexistenceStability: 0.34,
    worldviewElasticityIndex: 0.34,
    civilizationBoundaryResilience: 0.34,
    recursiveMeaningBalance: 0.34,
    ontologyEquilibriumPressure: 0.34,
    semanticConsensusInstability: 0.68,
    ontologyPartitionStress: 0.66,
    recursiveInterpretationInterference: 0.7,
    observerSynchronizationCollapse: 0.68,
    automatedSoakScenarioCount: 26,
    runtimeStackScriptCount: 16,
    dashboardLayerCount: 16,
    reviewDocCount: 40,
  };
}

describe('runtimeGovernanceFreeze', () => {
  beforeEach(() => resetRuntimeGovernanceFreezeForTest());

  it('observes governance freeze profile and dashboard', () => {
    initRuntimeGovernanceFreeze();
    const p = observeRuntimeGovernanceFreeze(baseInput());
    expect(p.runtimeExpansionEntropy).toBeGreaterThan(0);
    expect(p.stackMaintainabilityIndex).toBeGreaterThan(0);
    expect(p.architectureConvergencePressure).toBeGreaterThan(0);
    expect(p.expansionFreezeConfidence).toBeGreaterThan(0);

    const dash = getRuntimeGovernanceFreezeDashboard();
    expect(dash?.expansionEntropyGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.architectureConvergenceRadar.length).toBeGreaterThan(0);
    expect(dash?.observabilityCostTimeline.length).toBeGreaterThan(0);
    expect(dash?.runtimeOperationalPressureHeatmap.length).toBeGreaterThan(0);
    expect(dash?.governanceFreezeReadinessMonitor.length).toBeGreaterThan(0);
    expect(dash?.recursiveExpansionTopology.nodes.length).toBeGreaterThan(0);
    expect(dash?.stabilizationEquilibriumGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.stackSaturationDashboard.length).toBeGreaterThan(0);
  });

  it('records observe-only suggestions', () => {
    initRuntimeGovernanceFreeze();
    observeRuntimeGovernanceFreeze(baseInput());
    const dash = getRuntimeGovernanceFreezeDashboard();
    expect(dash?.suggestions.every((s) => s.observeOnly)).toBe(true);
  });

  it('throttles samples', () => {
    initRuntimeGovernanceFreeze();
    expect(shouldRunRuntimeGovernanceFreezeSample(baseInput())).toBe(true);
    expect(shouldRunRuntimeGovernanceFreezeSample(baseInput())).toBe(false);
  });

  it('exports governance freeze sections', () => {
    initRuntimeGovernanceFreeze();
    observeRuntimeGovernanceFreeze(baseInput());
    const bundle = buildRuntimeGovernanceFreezeExportBundle();
    expect(bundle.governanceFreezeAnalysis).toBeTruthy();
    expect(bundle.runtimeMaintainabilityReport).toBeTruthy();
    expect(bundle.operationalConvergenceAnalysis).toBeTruthy();
    expect(bundle.stackSaturationReport).toBeTruthy();
    expect(bundle.observabilityCostReport).toBeTruthy();
    expect(bundle.stabilizationReadinessReport).toBeTruthy();
  });
});
