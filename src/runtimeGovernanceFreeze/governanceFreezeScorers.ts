import type {
  RuntimeGovernanceFreezeObserveInput,
  RuntimeGovernanceFreezeProfile,
} from '../types/runtimeGovernanceFreeze';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
const invert = (value: number): number => 1 - Math.max(0, Math.min(1, value));
const avg = (...values: number[]): number =>
  round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));
const scale = (value: number, max: number): number => round(value / max);

export function resetGovernanceFreezeScorersForTest(): void {
  /* stateless */
}

export function buildRuntimeGovernanceFreezeProfile(
  input: RuntimeGovernanceFreezeObserveInput,
): RuntimeGovernanceFreezeProfile {
  const layerDensity = scale(input.runtimeStackScriptCount, 16);
  const scenarioDensity = scale(input.automatedSoakScenarioCount, 26);
  const dashboardDensity = scale(input.dashboardLayerCount, 16);
  const docDensity = scale(input.reviewDocCount, 40);

  const runtimeExpansionEntropy = avg(layerDensity, scenarioDensity, dashboardDensity, docDensity);
  const recursiveLayerProliferationRisk = avg(layerDensity, input.recursiveInterpretationInterference, input.semanticResonanceCascadeRisk);
  const stackObservabilityOverhead = avg(dashboardDensity, scenarioDensity, input.observerInterferenceRisk, input.ontologyCollisionDensity);
  const semanticArchitectureDrift = avg(input.civilizationDriftVelocity, input.semanticConsensusInstability, input.ontologyPartitionStress);
  const runtimeComplexityAcceleration = avg(runtimeExpansionEntropy, recursiveLayerProliferationRisk, stackObservabilityOverhead);
  const operationalConvergenceScore = avg(
    input.semanticPluralityIntegrity,
    input.ontologyCoexistenceStability,
    input.worldviewElasticityIndex,
    input.civilizationBoundaryResilience,
    input.recursiveMeaningBalance,
  );
  const governanceStabilizationReadiness = avg(
    operationalConvergenceScore,
    input.ontologyEquilibriumPressure,
    invert(runtimeComplexityAcceleration),
  );
  const recursiveInstrumentationPressure = avg(input.recursiveInterpretationInterference, input.semanticResonanceCascadeRisk, scenarioDensity);

  const verifyExecutionStress = avg(layerDensity, scenarioDensity, scale(input.runtimeStackScriptCount + input.automatedSoakScenarioCount, 42));
  const dashboardOperationalWeight = avg(dashboardDensity, input.observerInterferenceRisk, input.semanticConsensusInstability);
  const telemetryMaintenanceLoad = avg(input.semanticResonanceCascadeRisk, input.recursiveInterpretationInterference, input.observerSynchronizationCollapse);
  const recursiveDependencyAccumulation = avg(recursiveLayerProliferationRisk, recursiveInstrumentationPressure, input.recursiveInterpretationInterference);
  const soakScenarioExpansionPressure = scenarioDensity;
  const runtimeIndexingOverhead = avg(docDensity, dashboardDensity, layerDensity);
  const observabilityCostGradient = avg(
    stackObservabilityOverhead,
    verifyExecutionStress,
    dashboardOperationalWeight,
    telemetryMaintenanceLoad,
    runtimeIndexingOverhead,
  );
  const stackMaintainabilityIndex = avg(
    invert(observabilityCostGradient),
    governanceStabilizationReadiness,
    operationalConvergenceScore,
  );

  const architectureConvergencePressure = avg(runtimeExpansionEntropy, semanticArchitectureDrift, recursiveLayerProliferationRisk);
  const stabilizationNecessityIndex = avg(observabilityCostGradient, input.ontologyCollisionDensity, input.observerInterferenceRisk);
  const semanticExpansionFatigue = avg(input.semanticConsensusInstability, input.semanticResonanceCascadeRisk, semanticArchitectureDrift);
  const observerOperationalSaturation = avg(input.observerInterferenceRisk, input.observerSynchronizationCollapse, dashboardOperationalWeight);
  const recursiveGovernanceStress = avg(recursiveInstrumentationPressure, recursiveDependencyAccumulation, stabilizationNecessityIndex);
  const civilizationLayerDensity = layerDensity;
  const ontologyExpansionExhaustion = avg(input.ontologyCollisionDensity, input.ontologyPartitionStress, invert(input.ontologyCoexistenceStability));
  const runtimeOperationalFragility = avg(invert(stackMaintainabilityIndex), observabilityCostGradient, ontologyExpansionExhaustion);

  const recursiveGrowthTerminationPressure = avg(runtimeExpansionEntropy, architectureConvergencePressure, recursiveGovernanceStress);
  const runtimeStabilityThreshold = avg(operationalConvergenceScore, stackMaintainabilityIndex, invert(runtimeOperationalFragility));
  const operationalSteadyStateScore = avg(operationalConvergenceScore, input.ontologyEquilibriumPressure, invert(observabilityCostGradient));
  const observabilityEquilibriumState = avg(invert(stackObservabilityOverhead), operationalSteadyStateScore, stackMaintainabilityIndex);
  const architectureClosureIntegrity = avg(
    governanceStabilizationReadiness,
    operationalSteadyStateScore,
    invert(semanticArchitectureDrift),
  );
  const stackFinalizationReadiness = avg(
    recursiveGrowthTerminationPressure,
    architectureClosureIntegrity,
    governanceStabilizationReadiness,
    stackMaintainabilityIndex,
  );
  const expansionFreezeConfidence = avg(
    stackFinalizationReadiness,
    recursiveGrowthTerminationPressure,
    architectureConvergencePressure,
  );
  const governanceLockRecommendation = avg(expansionFreezeConfidence, stabilizationNecessityIndex, recursiveGrowthTerminationPressure);

  return {
    runtimeExpansionEntropy,
    recursiveLayerProliferationRisk,
    stackObservabilityOverhead,
    semanticArchitectureDrift,
    runtimeComplexityAcceleration,
    governanceStabilizationReadiness,
    operationalConvergenceScore,
    recursiveInstrumentationPressure,
    stackMaintainabilityIndex,
    verifyExecutionStress,
    dashboardOperationalWeight,
    telemetryMaintenanceLoad,
    recursiveDependencyAccumulation,
    soakScenarioExpansionPressure,
    runtimeIndexingOverhead,
    observabilityCostGradient,
    architectureConvergencePressure,
    stabilizationNecessityIndex,
    semanticExpansionFatigue,
    observerOperationalSaturation,
    recursiveGovernanceStress,
    civilizationLayerDensity,
    ontologyExpansionExhaustion,
    runtimeOperationalFragility,
    expansionFreezeConfidence,
    runtimeStabilityThreshold,
    governanceLockRecommendation,
    operationalSteadyStateScore,
    recursiveGrowthTerminationPressure,
    stackFinalizationReadiness,
    observabilityEquilibriumState,
    architectureClosureIntegrity,
    measuredAt: new Date().toISOString(),
  };
}
