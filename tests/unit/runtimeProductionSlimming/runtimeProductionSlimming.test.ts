import { describe, expect, it } from 'vitest';
import { AUTOMATED_SOAK_SCENARIO_IDS } from '../../../src/types/automatedSoakRunner';
import {
  ARCHIVED_SOAK_SCENARIO_IDS,
  COLD_STORAGE_SCENARIO_INVENTORY,
  OPTIONAL_SOAK_SCENARIO_IDS,
  PRODUCTION_SOAK_SCENARIO_IDS,
  RUNTIME_LIGHT_VERIFY_SCRIPTS,
  VERIFY_TIER_REGISTRY,
} from '../../../src/tooling/runtimeProductionSlimmingRegistry';
import {
  buildProductionSlimmingMetrics,
  buildProductionSlimmingReportBundle,
} from '../../../src/tooling/runtimeProductionSlimming';

describe('runtimeProductionSlimming', () => {
  it('segments scenario registries without deleting frozen scenarios', () => {
    const segmented = [
      ...PRODUCTION_SOAK_SCENARIO_IDS,
      ...OPTIONAL_SOAK_SCENARIO_IDS,
      ...ARCHIVED_SOAK_SCENARIO_IDS,
    ];
    expect(segmented).toHaveLength(AUTOMATED_SOAK_SCENARIO_IDS.length);
    expect(new Set(segmented).size).toBe(AUTOMATED_SOAK_SCENARIO_IDS.length);
    expect(COLD_STORAGE_SCENARIO_INVENTORY).toHaveLength(ARCHIVED_SOAK_SCENARIO_IDS.length);
  });

  it('separates verify tiers and keeps runtime-light critical plus standard only', () => {
    expect(VERIFY_TIER_REGISTRY.critical.length).toBeGreaterThan(0);
    expect(VERIFY_TIER_REGISTRY.standard.length).toBeGreaterThan(0);
    expect(VERIFY_TIER_REGISTRY.extended).toContain('verify:runtime-full');
    expect(RUNTIME_LIGHT_VERIFY_SCRIPTS).toEqual([
      ...VERIFY_TIER_REGISTRY.critical,
      ...VERIFY_TIER_REGISTRY.standard,
    ]);
  });

  it('builds operational slimming metrics', () => {
    const metrics = buildProductionSlimmingMetrics();
    expect(metrics.runtimeWeightReduction).toBeGreaterThan(0);
    expect(metrics.registryCompressionGain).toBeGreaterThan(0);
    expect(metrics.verifyExecutionReduction).toBeGreaterThan(0);
    expect(metrics.operationalSimplicityGain).toBeGreaterThan(0);
  });

  it('exports production slimming reports', () => {
    const bundle = buildProductionSlimmingReportBundle();
    expect(bundle.freezeTag).toBe('runtime-freeze-v1');
    expect(bundle.productionSlimmingReport).toBeTruthy();
    expect(bundle.runtimeWeightReport).toBeTruthy();
    expect(bundle.verifyCostReport).toBeTruthy();
    expect(bundle.dashboardCostReport).toBeTruthy();
    expect(bundle.dependencySlimmingReport).toBeTruthy();
    expect(bundle.archiveMigrationReport).toBeTruthy();
  });
});
