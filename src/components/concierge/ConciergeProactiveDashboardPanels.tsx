import type { ReactNode } from 'react';
import type { AiPreferences } from '../../types/aiStrategy';
import type { ExplainableGovernanceTransparentReasoningBundle } from '../../types/explainableGovernanceTransparentReasoning';
import type { RuntimeSurvivalMobileResilienceBundle } from '../../types/runtimeSurvivalMobileResilience';
import type { RuntimeTelemetryDashboardBundle } from '../../types/runtimeTelemetry';
import type { StrategicMemoryGraphTemporalCausalityBundle } from '../../types/strategicMemoryGraphTemporalCausality';
import type { UnifiedCognitiveStateExecutiveAwarenessBundle } from '../../types/unifiedCognitiveStateExecutiveAwareness';
import { useProactiveConciergeOptional } from '../../context/ProactiveConciergeContext';
import { ConciergePanelSlot } from './ConciergePanelErrorBoundary';
import { StaleSafeDashboardShell } from './StaleSafeDashboardShell';
import {
  AdaptiveExplorationDashboardPanel,
  AiActionCenterAwaitingBundle,
  AiActionCenterPanel,
  AiGovernancePanel,
  AiPerformanceCenterPanel,
  ArbitrationDashboardPanel,
  AutonomousMonitoringPanel,
  CapitalAllocationPanel,
  CognitiveConsensusDashboardPanel,
  CognitiveResourceEconomyDashboardPanel,
  ConstitutionalGovernanceDashboardPanel,
  DataReliabilityPanel,
  DynamicOrchestrationDashboardPanel,
  EpistemicIntegrityDashboardPanel,
  ExecutionDashboardPanel,
  ExecutionRecoveryDashboardPanel,
  ExplainabilityDashboardPanel,
  ExplainableGovernanceDashboardPanel,
  HumanIntentContinuityDashboardPanel,
  IntegrityDashboardPanel,
  MarketRegimeDashboardPanel,
  MemoryCompressionDashboardPanel,
  MetaAuditDashboardPanel,
  MetaReliabilityDashboardPanel,
  MetaTopPrioritiesPanel,
  PortfolioRiskExposurePanel,
  ReactiveEventDashboardPanel,
  ReliabilityDashboardPanel,
  ResourceDashboardPanel,
  RuntimeStabilityDashboardPanel,
  RuntimeSurvivalDashboardPanel,
  RuntimeTelemetryDashboardPanel,
  SelfArchitectureDashboardPanel,
  SelfEvaluationPanel,
  SemanticDashboardPanel,
  StrategicMemoryGraphDashboardPanel,
  SystemicStabilityDashboardPanel,
  SystemStabilityIntegrityPanel,
  UnifiedCognitiveStateDashboardPanel,
  WorldStatePanel,
} from './conciergeDashboardPanels';

type ProactiveCtx = NonNullable<ReturnType<typeof useProactiveConciergeOptional>>;

type Props = {
  proactive: ProactiveCtx;
  aiPreferences: AiPreferences;
  strategicMemoryBundle: StrategicMemoryGraphTemporalCausalityBundle | null;
  unifiedCognitiveBundle: UnifiedCognitiveStateExecutiveAwarenessBundle | null;
  explainableGovernanceBundle: ExplainableGovernanceTransparentReasoningBundle | null;
  runtimeSurvivalBundle: RuntimeSurvivalMobileResilienceBundle | null;
  runtimeTelemetryBundle: RuntimeTelemetryDashboardBundle | null;
};

function Panel({ name, children }: { name: string; children: ReactNode }) {
  return <ConciergePanelSlot panelName={name}>{children}</ConciergePanelSlot>;
}

/** Eager-loaded proactive dashboards (no React.lazy — Expo tunnel split bundles fail). */
export function ConciergeProactiveDashboardPanels({
  proactive,
  aiPreferences,
  strategicMemoryBundle,
  unifiedCognitiveBundle,
  explainableGovernanceBundle,
  runtimeSurvivalBundle,
  runtimeTelemetryBundle,
}: Props) {
  return (
    <>
      {proactive.metaBundle && aiPreferences.metaDecisionEnabled ? (
        <Panel name="AI Top Priorities">
          <MetaTopPrioritiesPanel bundle={proactive.metaBundle} />
        </Panel>
      ) : null}
      {proactive.realityBundle && aiPreferences.realityValidationEnabled ? (
        <Panel name="AI Performance Center">
          <AiPerformanceCenterPanel bundle={proactive.realityBundle} />
        </Panel>
      ) : null}
      {proactive.executionBundle && aiPreferences.paperBrokerEnabled ? (
        <Panel name="Execution Dashboard">
          <ExecutionDashboardPanel bundle={proactive.executionBundle} />
        </Panel>
      ) : null}
      {proactive.capitalAllocationBundle && aiPreferences.capitalAllocationEnabled ? (
        <Panel name="Capital Allocation">
          <CapitalAllocationPanel
            bundle={proactive.capitalAllocationBundle}
            onPrefsSaved={() => void proactive.refreshProactive()}
          />
        </Panel>
      ) : null}
      {proactive.selfEvaluationBundle && aiPreferences.selfEvaluationEnabled ? (
        <Panel name="AI Self Evaluation">
          <SelfEvaluationPanel bundle={proactive.selfEvaluationBundle} />
        </Panel>
      ) : null}
      {proactive.macroIntelligenceBundle && aiPreferences.macroIntelligenceEnabled ? (
        <Panel name="World State & Macro">
          <WorldStatePanel bundle={proactive.macroIntelligenceBundle} />
        </Panel>
      ) : null}
      {proactive.dataReliabilityBundle && aiPreferences.dataReliabilityEnabled ? (
        <Panel name="Data Reliability">
          <DataReliabilityPanel bundle={proactive.dataReliabilityBundle} />
        </Panel>
      ) : null}
      <Panel name="AI Action Center">
        {proactive.strategyBundle ? (
          <AiActionCenterPanel bundle={proactive.strategyBundle} />
        ) : (
          <AiActionCenterAwaitingBundle />
        )}
      </Panel>
      {proactive.portfolioRiskExposureBundle && aiPreferences.portfolioRiskExposureEnabled ? (
        <Panel name="Portfolio Risk & Exposure">
          <PortfolioRiskExposurePanel
            bundle={proactive.portfolioRiskExposureBundle}
            onOverrideSaved={() => void proactive.refreshProactive()}
          />
        </Panel>
      ) : null}
      {proactive.systemStabilityIntegrityBundle &&
      aiPreferences.systemStabilityIntegrityEnabled !== false ? (
        <Panel name="System Stability">
          <SystemStabilityIntegrityPanel bundle={proactive.systemStabilityIntegrityBundle} />
        </Panel>
      ) : null}
      {proactive.aiGovernanceDecisionBundle &&
      aiPreferences.aiGovernanceDecisionEnabled !== false ? (
        <Panel name="AI Governance">
          <AiGovernancePanel
            bundle={proactive.aiGovernanceDecisionBundle}
            onOverrideSaved={() => void proactive.refreshProactive()}
          />
        </Panel>
      ) : null}
      {proactive.reactiveEventOrchestrationBundle &&
      aiPreferences.reactiveEventOrchestrationEnabled !== false ? (
        <Panel name="Reactive Event Dashboard">
          <ReactiveEventDashboardPanel bundle={proactive.reactiveEventOrchestrationBundle} />
        </Panel>
      ) : null}
      {proactive.explainableCognitiveTraceBundle &&
      aiPreferences.explainableCognitiveTraceEnabled !== false ? (
        <Panel name="Explainability Dashboard">
          <ExplainabilityDashboardPanel bundle={proactive.explainableCognitiveTraceBundle} />
        </Panel>
      ) : null}
      {proactive.adaptiveResourceComputeBudgetBundle &&
      aiPreferences.adaptiveResourceComputeBudgetEnabled !== false ? (
        <Panel name="Resource Dashboard">
          <ResourceDashboardPanel bundle={proactive.adaptiveResourceComputeBudgetBundle} />
        </Panel>
      ) : null}
      {proactive.stateIntegrityTemporalConsistencyBundle &&
      aiPreferences.stateIntegrityTemporalConsistencyEnabled !== false ? (
        <Panel name="Integrity Dashboard">
          <IntegrityDashboardPanel bundle={proactive.stateIntegrityTemporalConsistencyBundle} />
        </Panel>
      ) : null}
      {proactive.semanticConsistencyDecisionCoherenceBundle &&
      aiPreferences.semanticConsistencyDecisionCoherenceEnabled !== false ? (
        <Panel name="Semantic Dashboard">
          <SemanticDashboardPanel bundle={proactive.semanticConsistencyDecisionCoherenceBundle} />
        </Panel>
      ) : null}
      {proactive.epistemicReliabilityEvidenceWeightBundle &&
      aiPreferences.epistemicReliabilityEvidenceWeightEnabled !== false ? (
        <Panel name="Reliability Dashboard">
          <ReliabilityDashboardPanel bundle={proactive.epistemicReliabilityEvidenceWeightBundle} />
        </Panel>
      ) : null}
      {proactive.cognitiveGoalArbitrationIntentPriorityBundle &&
      aiPreferences.cognitiveGoalArbitrationIntentPriorityEnabled !== false ? (
        <Panel name="Arbitration Dashboard">
          <ArbitrationDashboardPanel bundle={proactive.cognitiveGoalArbitrationIntentPriorityBundle} />
        </Panel>
      ) : null}
      {proactive.metaCognitiveRiskReflectionSelfCritiqueBundle &&
      aiPreferences.metaCognitiveRiskReflectionSelfCritiqueEnabled !== false ? (
        <Panel name="Meta Audit Dashboard">
          <MetaAuditDashboardPanel bundle={proactive.metaCognitiveRiskReflectionSelfCritiqueBundle} />
        </Panel>
      ) : null}
      {proactive.recursiveMemoryCompressionStrategicAbstractionBundle &&
      aiPreferences.recursiveMemoryCompressionStrategicAbstractionEnabled !== false ? (
        <Panel name="Memory Compression">
          <MemoryCompressionDashboardPanel
            bundle={proactive.recursiveMemoryCompressionStrategicAbstractionBundle}
          />
        </Panel>
      ) : null}
      {proactive.systemicStabilityRecursiveGovernanceBundle &&
      aiPreferences.systemicStabilityRecursiveGovernanceEnabled !== false ? (
        <Panel name="Systemic Stability">
          <SystemicStabilityDashboardPanel bundle={proactive.systemicStabilityRecursiveGovernanceBundle} />
        </Panel>
      ) : null}
      {proactive.executionRecoveryAdaptiveConfidenceBundle &&
      aiPreferences.executionRecoveryAdaptiveConfidenceEnabled !== false ? (
        <Panel name="Recovery Dashboard">
          <ExecutionRecoveryDashboardPanel bundle={proactive.executionRecoveryAdaptiveConfidenceBundle} />
        </Panel>
      ) : null}
      {proactive.dynamicLayerOrchestrationMobileRuntimeOptimizationBundle &&
      aiPreferences.dynamicLayerOrchestrationMobileRuntimeOptimizationEnabled !== false ? (
        <Panel name="Orchestration Dashboard">
          <DynamicOrchestrationDashboardPanel
            bundle={proactive.dynamicLayerOrchestrationMobileRuntimeOptimizationBundle}
          />
        </Panel>
      ) : null}
      {proactive.autonomousMarketRegimeDetectionBundle &&
      aiPreferences.autonomousMarketRegimeDetectionEnabled !== false ? (
        <Panel name="Market Regime Dashboard">
          <MarketRegimeDashboardPanel bundle={proactive.autonomousMarketRegimeDetectionBundle} />
        </Panel>
      ) : null}
      {proactive.cognitiveArbitrationConsensusBundle &&
      aiPreferences.cognitiveArbitrationConsensusEnabled !== false ? (
        <Panel name="Cognitive Consensus">
          <CognitiveConsensusDashboardPanel bundle={proactive.cognitiveArbitrationConsensusBundle} />
        </Panel>
      ) : null}
      {proactive.metaReliabilityLongitudinalTrustBundle &&
      aiPreferences.metaReliabilityLongitudinalTrustEnabled !== false ? (
        <Panel name="Meta Reliability">
          <MetaReliabilityDashboardPanel bundle={proactive.metaReliabilityLongitudinalTrustBundle} />
        </Panel>
      ) : null}
      {proactive.selfEvolvingArchitectureReflectiveRefactorBundle &&
      aiPreferences.selfEvolvingArchitectureReflectiveRefactorEnabled !== false ? (
        <Panel name="Self Architecture">
          <SelfArchitectureDashboardPanel
            bundle={proactive.selfEvolvingArchitectureReflectiveRefactorBundle}
          />
        </Panel>
      ) : null}
      {proactive.epistemicIntegrityTruthCalibrationBundle &&
      aiPreferences.epistemicIntegrityTruthCalibrationEnabled !== false ? (
        <Panel name="Epistemic Integrity">
          <EpistemicIntegrityDashboardPanel bundle={proactive.epistemicIntegrityTruthCalibrationBundle} />
        </Panel>
      ) : null}
      {strategicMemoryBundle &&
      aiPreferences.strategicMemoryGraphTemporalCausalityEnabled !== false ? (
        <Panel name="Strategic Memory Graph">
          <StaleSafeDashboardShell bundle={strategicMemoryBundle}>
            {(b) => <StrategicMemoryGraphDashboardPanel bundle={b} />}
          </StaleSafeDashboardShell>
        </Panel>
      ) : null}
      {proactive.cognitiveResourceEconomyAttentionAllocationBundle &&
      aiPreferences.cognitiveResourceEconomyAttentionAllocationEnabled !== false ? (
        <Panel name="Cognitive Resource Economy">
          <CognitiveResourceEconomyDashboardPanel
            bundle={proactive.cognitiveResourceEconomyAttentionAllocationBundle}
          />
        </Panel>
      ) : null}
      {unifiedCognitiveBundle &&
      aiPreferences.unifiedCognitiveStateExecutiveAwarenessEnabled !== false ? (
        <Panel name="Unified Cognitive State">
          <StaleSafeDashboardShell bundle={unifiedCognitiveBundle}>
            {(b) => <UnifiedCognitiveStateDashboardPanel bundle={b} />}
          </StaleSafeDashboardShell>
        </Panel>
      ) : null}
      {proactive.humanIntentContinuityAlignmentPreservationBundle &&
      aiPreferences.humanIntentContinuityAlignmentPreservationEnabled !== false ? (
        <Panel name="Human Intent Continuity">
          <HumanIntentContinuityDashboardPanel
            bundle={proactive.humanIntentContinuityAlignmentPreservationBundle}
          />
        </Panel>
      ) : null}
      {proactive.adaptiveExplorationAntiDogmaBundle &&
      aiPreferences.adaptiveExplorationAntiDogmaEnabled !== false ? (
        <Panel name="Adaptive Exploration">
          <AdaptiveExplorationDashboardPanel bundle={proactive.adaptiveExplorationAntiDogmaBundle} />
        </Panel>
      ) : null}
      {proactive.constitutionalGovernanceSystemCoherenceBundle &&
      aiPreferences.constitutionalGovernanceSystemCoherenceEnabled !== false ? (
        <Panel name="Constitutional Governance">
          <ConstitutionalGovernanceDashboardPanel
            bundle={proactive.constitutionalGovernanceSystemCoherenceBundle}
          />
        </Panel>
      ) : null}
      {explainableGovernanceBundle &&
      aiPreferences.explainableGovernanceTransparentReasoningEnabled !== false ? (
        <Panel name="Explainable Governance">
          <StaleSafeDashboardShell bundle={explainableGovernanceBundle}>
            {(b) => <ExplainableGovernanceDashboardPanel bundle={b} />}
          </StaleSafeDashboardShell>
        </Panel>
      ) : null}
      {runtimeSurvivalBundle && aiPreferences.runtimeSurvivalMobileResilienceEnabled !== false ? (
        <Panel name="Runtime Survival">
          <StaleSafeDashboardShell bundle={runtimeSurvivalBundle}>
            {(b) => <RuntimeSurvivalDashboardPanel bundle={b} />}
          </StaleSafeDashboardShell>
        </Panel>
      ) : null}
      {runtimeTelemetryBundle && aiPreferences.runtimeSurvivalMobileResilienceEnabled !== false ? (
        <>
          <Panel name="Runtime Telemetry">
            <RuntimeTelemetryDashboardPanel bundle={runtimeTelemetryBundle} />
          </Panel>
          <Panel name="Runtime Stability">
            <RuntimeStabilityDashboardPanel />
          </Panel>
        </>
      ) : null}
      {proactive.autonomousBundle && aiPreferences.autonomousMonitoringEnabled ? (
        <Panel name="Autonomous Monitoring">
          <AutonomousMonitoringPanel bundle={proactive.autonomousBundle} />
        </Panel>
      ) : null}
    </>
  );
}
