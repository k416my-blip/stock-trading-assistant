import { describe, expect, it } from 'vitest';
import {
  buildArchivePlanningAnalysis,
  buildDashboardOperationalReduction,
  buildObservabilityReductionMetrics,
  buildOperationalCoreExportBundle,
  buildOperationalSustainabilityAnalysis,
  buildScenarioReductionAnalysis,
  buildVerifyReductionAnalysis,
  classifyOperationalCore,
  runOperationalCoreSimulations,
} from '../../../src/freeze/runtimeOperationalCoreExtraction';

describe('runtimeOperationalCoreExtraction', () => {
  it('classifies operational core candidates', () => {
    const classification = classifyOperationalCore();
    expect(classification.coreRuntimeCandidates.length).toBeGreaterThan(0);
    expect(classification.extendedAnalysisCandidates.length).toBeGreaterThan(0);
    expect(classification.archiveCandidates.length).toBeGreaterThan(0);
    expect(classification.criticalObservabilityPaths.length).toBeGreaterThan(0);
  });

  it('classifies all frozen soak scenarios without deletion', () => {
    const scenarios = buildScenarioReductionAnalysis();
    expect(scenarios).toHaveLength(26);
    expect(scenarios.some((row) => row.classification === 'core')).toBe(true);
    expect(scenarios.some((row) => row.classification === 'optional')).toBe(true);
  });

  it('classifies verify inventory without removal', () => {
    const verifies = buildVerifyReductionAnalysis();
    expect(verifies).toHaveLength(41);
    expect(verifies.some((row) => row.classification === 'critical')).toBe(true);
    expect(verifies.some((row) => row.classification === 'nightly')).toBe(true);
  });

  it('builds reduction, archive, sustainability, and dashboard analyses', () => {
    const reduction = buildObservabilityReductionMetrics();
    const archive = buildArchivePlanningAnalysis();
    const sustainability = buildOperationalSustainabilityAnalysis();
    const dashboard = buildDashboardOperationalReduction();
    expect(reduction.observabilityReductionPotential).toBeGreaterThan(0);
    expect(archive.observabilityRetentionPolicy.length).toBeGreaterThan(0);
    expect(sustainability.freezeLongevityEstimate).toBeGreaterThan(0);
    expect(dashboard.executiveDashboardCandidates.length).toBeGreaterThan(0);
  });

  it('runs observe-only reduction simulations', () => {
    const simulations = runOperationalCoreSimulations();
    expect(simulations).toHaveLength(5);
    expect(simulations.every((simulation) => simulation.observeOnly)).toBe(true);
  });

  it('exports all operational core report sections', () => {
    const bundle = buildOperationalCoreExportBundle();
    expect(bundle.freezeTag).toBe('runtime-freeze-v1');
    expect(bundle.operationalCoreReport).toBeTruthy();
    expect(bundle.scenarioReductionAnalysis).toHaveLength(26);
    expect(bundle.verifyReductionAnalysis).toHaveLength(41);
    expect(bundle.observabilityReductionReport).toBeTruthy();
    expect(bundle.archivePlanningReport).toBeTruthy();
    expect(bundle.operationalSustainabilityReport).toBeTruthy();
    expect(bundle.simulationResults).toHaveLength(5);
  });
});
