import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { StrategicMemoryGraphTemporalCausalityBundle } from '../types/strategicMemoryGraphTemporalCausality';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import { applyStrategicMemoryGraphOrchestrationOverrides } from './dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';
import {
  appendGraphSnapshot,
  saveStrategicMemoryGraphState,
} from './strategicMemoryGraphStorage';

function clampConfidence(pct: number, cap: number): number {
  return Math.min(pct, cap);
}

function graphAllowsAdaptation(
  graph: StrategicMemoryGraphTemporalCausalityBundle,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): boolean {
  if (systemic?.systemicEmergencySafeMode) return false;
  if (graph.explanationOnlyMode) return false;
  if (graph.causalFreezeActive) return false;
  return true;
}

export async function persistStrategicMemoryGraphCycle(
  graph: StrategicMemoryGraphTemporalCausalityBundle,
): Promise<void> {
  await appendGraphSnapshot(
    {
      at: graph.generatedAt,
      graphHealthPct: graph.graphHealthPct,
      graphState: graph.graphState,
      edgeCount: graph.causalEdges.length,
    },
    graph.causalEdges,
  );
  await saveStrategicMemoryGraphState({
    version: 1,
    lastGraphState: graph.graphState,
    lastGraphHealthPct: graph.graphHealthPct,
    lastOrchestrationBudgetMax: graph.orchestrationBudgetMax,
    graphTimeline: graph.graphTimeline,
    lastEdgeCount: graph.causalEdges.length,
    refreshCount: graph.graphTimeline.length,
    compressedEdges: graph.causalEdges.slice(-24),
  });
  applyStrategicMemoryGraphOrchestrationOverrides({
    budgetMax: graph.orchestrationBudgetMax,
    causalUncertain: graph.graphState === 'GRAPH_CAUSALITY_UNCERTAIN',
    contradicted: graph.graphState === 'GRAPH_CONTRADICTED',
    overconnected: graph.graphState === 'GRAPH_OVERCONNECTED',
    temporallyDrifting: graph.graphState === 'GRAPH_TEMPORALLY_DRIFTING',
    causalFreeze: graph.causalFreezeActive,
    edgePruning: graph.edgePruningActive,
  });
}

export function applyStrategicMemoryGraphToStrategy(
  strategy: StrategyExecutionBundle | null,
  graph: StrategicMemoryGraphTemporalCausalityBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !graph) return strategy;

  const cap = Math.min(graph.causalConfidencePct, 55);

  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => {
      let action = r.action;
      let why = r.whyProposedJa;
      if (!graphAllowsAdaptation(graph, systemic) || graph.explanationOnlyMode) {
        if (action === 'buy') action = 'watch';
        if (action === 'reduce') action = 'hold';
        why = `${why} [因果グラフ: 説明のみ — 因果仮説]`;
      } else if (graph.graphState === 'GRAPH_CAUSALITY_UNCERTAIN') {
        why = `${why} [因果 downgrade — 仮説のみ]`;
      }
      return {
        ...r,
        action,
        confidencePct: clampConfidence(r.confidencePct, cap),
        whyProposedJa: `${why} [${graph.graphStateLabelJa}]`.slice(0, 500),
      };
    }),
  };
}

export function applyStrategicMemoryGraphToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  graph: StrategicMemoryGraphTemporalCausalityBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !graph) return governance;

  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [因果グラフ: ${graph.graphStateLabelJa} · health ${graph.graphHealthPct}% · causal ${graph.causalConfidencePct}%（仮説）]`;
  if (graph.consensusRebuildRequested) {
    summary = `${summary} [合議再構築要求]`;
  }
  summary = `${summary} ${graph.uncertaintyDisclaimerJa}`.slice(0, 800);

  if (systemic?.systemicEmergencySafeMode) {
    summary = `${summary} [因果グラフは systemic safe mode に従属]`;
  }

  let finalDecision = governance.finalDecision;
  let finalDecisionLabelJa = governance.finalDecisionLabelJa;
  if (graph.explanationOnlyMode || !graphAllowsAdaptation(graph, systemic)) {
    if (finalDecision === 'buy') {
      finalDecision = 'watch';
      finalDecisionLabelJa = '監視';
    } else if (finalDecision === 'reduce') {
      finalDecision = 'hold';
      finalDecisionLabelJa = '保有';
    }
  }

  return {
    ...governance,
    finalDecision,
    finalDecisionLabelJa,
    consensusScore: Math.min(governance.consensusScore, graph.causalConfidencePct),
    unifiedAiSummaryJa: summary.slice(0, 800),
  };
}

export function attachStrategicMemoryGraphToContext(
  payload: AiStrategyContextPayload,
  bundle: StrategicMemoryGraphTemporalCausalityBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return { ...payload, strategicMemoryGraphTemporalCausality: bundle };
}

export function enrichStrategicMemoryGraphBundleWithOrchestration(
  graph: StrategicMemoryGraphTemporalCausalityBundle,
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
): StrategicMemoryGraphTemporalCausalityBundle {
  return {
    ...graph,
    mobileRuntimeStateJa: `${graph.mobileRuntimeStateJa} · orch ${orchestration.refreshLatencyMs}ms`,
  };
}
