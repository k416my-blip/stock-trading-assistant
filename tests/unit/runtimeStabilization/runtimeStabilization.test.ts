import { describe, expect, it } from 'vitest';
import { AUTOMATED_SOAK_SCENARIO_IDS } from '../../../src/types/automatedSoakRunner';
import {
  FROZEN_RUNTIME_LIGHT_SCRIPTS,
  buildObservabilityCostMetrics,
  buildRuntimeOptimizationReport,
  buildRuntimeStabilizationExportBundle,
  buildScenarioTiering,
  buildSoakExecutionCostAnalysis,
} from '../../../src/freeze/runtimeStabilizationOptimization';

describe('runtimeStabilizationOptimization', () => {
  it('keeps runtime-freeze-v1 inventory fixed without adding a runtime layer', () => {
    expect(FROZEN_RUNTIME_LIGHT_SCRIPTS).toHaveLength(16);
    expect(buildRuntimeOptimizationReport().freezeTag).toBe('runtime-freeze-v1');
  });

  it('covers all soak scenarios with tiering metadata', () => {
    const tiers = buildScenarioTiering();
    const tiered = [...tiers.core, ...tiers.extended, ...tiers.experimental, ...tiers.archived];
    expect(tiered).toHaveLength(AUTOMATED_SOAK_SCENARIO_IDS.length);
    expect(new Set(tiered).size).toBe(AUTOMATED_SOAK_SCENARIO_IDS.length);
  });

  it('calculates observability cost metrics', () => {
    const metrics = buildObservabilityCostMetrics();
    expect(metrics.runtimeMaintenanceCost).toBeGreaterThan(0);
    expect(metrics.verifyExecutionPressure).toBeGreaterThan(0);
    expect(metrics.stabilizationReadinessScore).toBeGreaterThan(0);
  });

  it('exports optimization analysis sections', () => {
    const bundle = buildRuntimeStabilizationExportBundle();
    expect(bundle.runtimeOptimizationReport.registryLazyLoading.length).toBeGreaterThan(0);
    expect(bundle.observabilityCostReport.observabilityBudgetUsage).toBeGreaterThan(0);
    expect(bundle.soakExecutionCostAnalysis.partialSoakExecution.length).toBeGreaterThan(0);
    expect(bundle.dashboardPerformanceAnalysis.renderBatchingAnalysis.length).toBeGreaterThan(0);
    expect(bundle.dependencyStabilizationReport.verifyChainOptimization.length).toBeGreaterThan(0);
    expect(bundle.cursorOptimizationReport.indexingExclusionSuggestions.length).toBeGreaterThan(0);
  });

  it('provides replay cost estimates for every scenario', () => {
    const cost = buildSoakExecutionCostAnalysis().replayCostEstimation;
    expect(Object.keys(cost)).toHaveLength(AUTOMATED_SOAK_SCENARIO_IDS.length);
  });
});
