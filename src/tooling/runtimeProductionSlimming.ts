import { AUTOMATED_SOAK_SCENARIO_IDS } from '../types/automatedSoakRunner';
import {
  FROZEN_FULL_RUNTIME_VERIFY_COUNT,
  FROZEN_RUNTIME_LIGHT_SCRIPTS,
} from '../freeze/runtimeStabilizationOptimization';
import {
  buildArchivePlanningAnalysis,
  buildDashboardOperationalReduction,
  buildObservabilityReductionMetrics,
  buildOperationalSustainabilityAnalysis,
  buildScenarioReductionAnalysis,
  buildVerifyReductionAnalysis,
} from '../freeze/runtimeOperationalCoreExtraction';
import {
  ARCHIVED_SOAK_SCENARIO_IDS,
  COLD_STORAGE_SCENARIO_INVENTORY,
  DASHBOARD_SLIMMING_REGISTRY,
  EXPORT_REGISTRY_SEGMENTS,
  OPTIONAL_SOAK_SCENARIO_IDS,
  PRODUCTION_SOAK_SCENARIO_IDS,
  RUNTIME_LIGHT_VERIFY_SCRIPTS,
  VERIFY_TIER_REGISTRY,
} from './runtimeProductionSlimmingRegistry';

export type ProductionSlimmingMetrics = {
  runtimeWeightReduction: number;
  registryCompressionGain: number;
  verifyExecutionReduction: number;
  dashboardRenderReduction: number;
  observabilityCostReduction: number;
  dependencyLoadReduction: number;
  operationalSimplicityGain: number;
};

export type ProductionSlimmingReportBundle = {
  freezeTag: 'runtime-freeze-v1';
  productionSlimmingReport: Record<string, unknown>;
  runtimeWeightReport: Record<string, unknown>;
  verifyCostReport: Record<string, unknown>;
  dashboardCostReport: Record<string, unknown>;
  dependencySlimmingReport: Record<string, unknown>;
  archiveMigrationReport: Record<string, unknown>;
  metrics: ProductionSlimmingMetrics;
};

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
const avg = (...values: number[]): number => round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));

export function buildProductionSlimmingMetrics(): ProductionSlimmingMetrics {
  const reduction = buildObservabilityReductionMetrics();
  const dashboard = buildDashboardOperationalReduction();
  const productionScenarioRatio = PRODUCTION_SOAK_SCENARIO_IDS.length / AUTOMATED_SOAK_SCENARIO_IDS.length;
  const runtimeLightRatio = RUNTIME_LIGHT_VERIFY_SCRIPTS.length / FROZEN_RUNTIME_LIGHT_SCRIPTS.length;
  const nightlyOrArchiveVerifyRatio =
    buildVerifyReductionAnalysis().filter((row) => row.classification === 'nightly' || row.classification === 'archived').length /
    FROZEN_FULL_RUNTIME_VERIFY_COUNT;
  const dashboardArchiveRatio =
    dashboard.archiveDashboardCandidates.length /
    (dashboard.executiveDashboardCandidates.length +
      dashboard.engineeringDashboardCandidates.length +
      dashboard.archiveDashboardCandidates.length);

  return {
    runtimeWeightReduction: round(1 - productionScenarioRatio),
    registryCompressionGain: round(1 - runtimeLightRatio),
    verifyExecutionReduction: round(nightlyOrArchiveVerifyRatio),
    dashboardRenderReduction: round(dashboardArchiveRatio),
    observabilityCostReduction: reduction.observabilityReductionPotential,
    dependencyLoadReduction: avg(1 - productionScenarioRatio, 1 - runtimeLightRatio),
    operationalSimplicityGain: reduction.operationalSimplicityScore,
  };
}

export function buildProductionSlimmingReportBundle(): ProductionSlimmingReportBundle {
  const metrics = buildProductionSlimmingMetrics();
  const scenarioReduction = buildScenarioReductionAnalysis();
  const verifyReduction = buildVerifyReductionAnalysis();
  const archive = buildArchivePlanningAnalysis();
  const sustainability = buildOperationalSustainabilityAnalysis();

  return {
    freezeTag: 'runtime-freeze-v1',
    productionSlimmingReport: {
      productionScenarios: PRODUCTION_SOAK_SCENARIO_IDS,
      optionalScenarios: OPTIONAL_SOAK_SCENARIO_IDS,
      archivedScenarios: ARCHIVED_SOAK_SCENARIO_IDS,
      runtimeLightScripts: RUNTIME_LIGHT_VERIFY_SCRIPTS,
      freezeMaintained: true,
    },
    runtimeWeightReport: {
      beforeScenarioRegistrySize: AUTOMATED_SOAK_SCENARIO_IDS.length,
      productionScenarioRegistrySize: PRODUCTION_SOAK_SCENARIO_IDS.length,
      registrySizeDelta: AUTOMATED_SOAK_SCENARIO_IDS.length - PRODUCTION_SOAK_SCENARIO_IDS.length,
      runtimeWeightReduction: metrics.runtimeWeightReduction,
    },
    verifyCostReport: {
      tiers: VERIFY_TIER_REGISTRY,
      fullVerifyCount: FROZEN_FULL_RUNTIME_VERIFY_COUNT,
      runtimeLightCount: RUNTIME_LIGHT_VERIFY_SCRIPTS.length,
      reductionCandidates: verifyReduction.filter((row) => row.classification === 'nightly' || row.classification === 'archived').length,
      verifyExecutionReduction: metrics.verifyExecutionReduction,
    },
    dashboardCostReport: {
      slimmingRegistry: DASHBOARD_SLIMMING_REGISTRY,
      dashboardRenderReduction: metrics.dashboardRenderReduction,
      optionalAnalyticsPolicy: 'collapsed mode by default; no dashboard mutation at runtime',
    },
    dependencySlimmingReport: {
      optionalImports: 'scenario modules remain dynamic imports',
      heavyUtilities: 'freeze tooling stays outside runtime execution',
      duplicatedHelperDetection: ['round/avg helper duplication in freeze tooling candidates'],
      deadExportAnalysis: ['archive-only freeze report exports should stay outside runtime-light'],
      dependencyLoadReduction: metrics.dependencyLoadReduction,
    },
    archiveMigrationReport: {
      coldStorageScenarioInventory: COLD_STORAGE_SCENARIO_INVENTORY,
      archivePlanning: archive,
      scenarioReduction,
      sustainability,
      exportSegments: EXPORT_REGISTRY_SEGMENTS,
    },
    metrics,
  };
}
