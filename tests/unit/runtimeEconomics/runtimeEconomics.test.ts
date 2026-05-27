import { describe, expect, it } from 'vitest';
import {
  buildBottleneckTopologyAnalysis,
  buildFailureSurfaceMetrics,
  buildObservabilityEconomicsMetrics,
  buildOperationalFragilityAnalysis,
  buildRuntimeEconomicsExportBundle,
  buildScalabilityAnalysis,
  runRuntimeEconomicsSimulations,
} from '../../../src/freeze/runtimeObservabilityEconomics';

describe('runtimeObservabilityEconomics', () => {
  it('builds observability economics metrics', () => {
    const metrics = buildObservabilityEconomicsMetrics();
    expect(metrics.observabilityCostIndex).toBeGreaterThan(0);
    expect(metrics.runtimeMaintenanceEntropy).toBeGreaterThan(0);
    expect(metrics.verificationScalabilityIndex).toBeGreaterThan(0);
    expect(metrics.operatorAttentionConsumption).toBeGreaterThan(0);
  });

  it('builds failure surface metrics', () => {
    const failure = buildFailureSurfaceMetrics();
    expect(failure.registryFailurePropagationRisk).toBeGreaterThan(0);
    expect(failure.verifyCascadeFailureRisk).toBeGreaterThan(0);
    expect(failure.runtimeFragmentationRisk).toBeGreaterThan(0);
  });

  it('builds scalability projections and bottleneck topology', () => {
    const scalability = buildScalabilityAnalysis();
    const topology = buildBottleneckTopologyAnalysis();
    expect(scalability.registryGrowthCurve).toHaveLength(5);
    expect(scalability.verifyTimeProjection).toHaveLength(5);
    expect(topology.importHotspotMap.length).toBeGreaterThan(0);
    expect(topology.verifyCriticalPath).toHaveLength(16);
    expect(topology.scenarioDependencyClusters).toHaveLength(26);
  });

  it('builds operational fragility analysis', () => {
    const fragility = buildOperationalFragilityAnalysis();
    expect(fragility.maintainabilityFragilityScore).toBeGreaterThan(0);
    expect(fragility.freezeIntegrityRisk).toBeGreaterThanOrEqual(0);
    expect(fragility.observabilityOverextensionRisk).toBeGreaterThan(0);
  });

  it('runs observe-only simulations', () => {
    const simulations = runRuntimeEconomicsSimulations();
    expect(simulations).toHaveLength(6);
    expect(simulations.every((s) => s.observeOnly)).toBe(true);
  });

  it('exports all economics report sections', () => {
    const bundle = buildRuntimeEconomicsExportBundle();
    expect(bundle.freezeTag).toBe('runtime-freeze-v1');
    expect(bundle.observabilityEconomicsReport).toBeTruthy();
    expect(bundle.failureSurfaceReport).toBeTruthy();
    expect(bundle.runtimeBottleneckAnalysis).toBeTruthy();
    expect(bundle.scalabilityProjectionReport).toBeTruthy();
    expect(bundle.operationalFragilityReport).toBeTruthy();
    expect(bundle.simulationResults).toHaveLength(6);
  });
});
