import {
  BUDGET_GRAPH_DRIFTING,
  BUDGET_GRAPH_FRAGMENTED,
  BUDGET_GRAPH_RISK,
  BUDGET_GRAPH_STABLE,
  CAUSAL_EDGE_MAX,
  CONTRADICTION_CRITICAL_THRESHOLD,
  GRAPH_HEALTH_DRIFTING_THRESHOLD,
  GRAPH_HEALTH_FRAGMENTED_THRESHOLD,
  GRAPH_STATE_LABELS_JA,
  RECURSIVE_LOOPS_THRESHOLD,
  UNSUPPORTED_CAUSALITY_THRESHOLD,
} from '../constants/strategicMemoryGraphTemporalCausality';
import type {
  BuildStrategicMemoryGraphInput,
  CausalEdgeKind,
  CausalEdgeSnapshot,
  CausalNodeId,
  CausalNodeSnapshot,
  GraphStructureState,
} from '../types/strategicMemoryGraphTemporalCausality';
import { CAUSAL_NODE_LABELS_JA } from '../constants/strategicMemoryGraphTemporalCausality';

export type GraphMetrics = {
  fragmentationPct: number;
  contradictionPct: number;
  unsupportedCausalityPct: number;
  temporalDriftPct: number;
  hallucinationPropagationPct: number;
  recursiveLoopsPct: number;
  graphHealthPct: number;
  eventCorrelationPct: number;
  temporalConsistencyPct: number;
  repetitionStrengthPct: number;
  crossLayerAgreementPct: number;
  causalConfidencePct: number;
  timelineContinuityPct: number;
  memoryIntegrityPct: number;
  edgeDensityPct: number;
  causalDriftPct: number;
};

export type GraphResolution = {
  graphState: GraphStructureState;
  orchestrationBudgetMax: number;
  explanationOnlyMode: boolean;
  causalFreezeActive: boolean;
  consensusRebuildRequested: boolean;
  edgePruningActive: boolean;
  timelineRebuildActive: boolean;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function mkNode(
  id: CausalNodeId,
  active: boolean,
  weight: number,
  detail: string,
): CausalNodeSnapshot {
  return {
    id,
    labelJa: CAUSAL_NODE_LABELS_JA[id],
    active,
    weightPct: clamp(weight),
    lastEventJa: detail,
  };
}

export function captureCausalNodes(input: BuildStrategicMemoryGraphInput): CausalNodeSnapshot[] {
  const mockChain = (input.mockEventChainBoost ?? 0) > 0;
  return [
    mkNode('governanceActions', !!input.governance, input.governance?.consensusScore ?? 50, input.governance?.finalDecision ?? '—'),
    mkNode('recoveryEvents', !!input.recovery, input.recovery?.recoveryHealthPct ?? 0, input.recovery?.thawState ?? '—'),
    mkNode('regimeTransitions', !!input.regime, input.regime?.regimeConfidencePct ?? 0, input.regime?.currentRegime ?? '—'),
    mkNode('confidenceChanges', true, input.consensus?.finalConsensusPct ?? 55, 'confidence'),
    mkNode(
      'hallucinationEvents',
      (input.epistemic?.hallucinationRiskPct ?? 0) > 40 || mockChain,
      mockChain ? 55 : (input.epistemic?.hallucinationRiskPct ?? 0),
      mockChain ? 'mock hallucination chain' : 'hallucination',
    ),
    mkNode(
      'consensusConflicts',
      (input.consensus?.contradictionRiskPct ?? 0) > 50 || mockChain,
      mockChain ? 58 : (input.consensus?.contradictionRiskPct ?? 0),
      mockChain ? 'mock consensus conflict' : (input.consensus?.consensusState ?? '—'),
    ),
    mkNode(
      'contradictionBursts',
      (input.epistemic?.contradictionDensityPct ?? 0) > 45 || mockChain,
      mockChain ? 52 : (input.epistemic?.contradictionDensityPct ?? 0),
      mockChain ? 'mock contradiction burst' : 'burst',
    ),
    mkNode('freezeEscalations', input.systemic?.recursiveFreezeActive === true, 70, 'freeze'),
    mkNode('rollbackEvents', (input.recovery?.rollbackDependencyPct ?? 0) > 30, input.recovery?.rollbackDependencyPct ?? 0, 'rollback'),
    mkNode('macroStateChanges', false, 50, 'macro'),
    mkNode('riskStateChanges', false, 50, 'risk'),
    mkNode('stabilityBreaks', (input.stability?.systemHealthScore ?? 100) < 55, input.stability?.systemHealthScore ?? 60, 'stability'),
    mkNode('orchestrationDecisions', !!input.orchestration, input.orchestration?.orchestrationHealthScore ?? 50, 'orch'),
    mkNode('userBehaviorPatterns', input.refreshCount > 5, Math.min(100, input.refreshCount * 8), `refresh ${input.refreshCount}`),
  ];
}

function mkEdge(
  from: CausalNodeId,
  to: CausalNodeId,
  kind: CausalEdgeKind,
  confidence: number,
  detail: string,
): CausalEdgeSnapshot {
  return {
    id: `${from}-${kind}-${to}`,
    from,
    to,
    kind,
    confidencePct: clamp(confidence),
    hypothesisOnly: true,
    detailJa: detail,
  };
}

export function estimateCausalEdges(
  nodes: CausalNodeSnapshot[],
  input: BuildStrategicMemoryGraphInput,
): CausalEdgeSnapshot[] {
  const active = nodes.filter((n) => n.active);
  const edges: CausalEdgeSnapshot[] = [];

  const pushIf = (from: CausalNodeId, to: CausalNodeId, kind: CausalEdgeKind, conf: number, d: string) => {
    if (edges.length >= CAUSAL_EDGE_MAX) return;
    const a = active.find((n) => n.id === from);
    const b = active.find((n) => n.id === to);
    if (!a || !b) return;
    edges.push(mkEdge(from, to, kind, conf, d));
  };

  pushIf('regimeTransitions', 'confidenceChanges', 'precededBy', 65, 'regime→confidence（時系列）');
  pushIf('confidenceChanges', 'consensusConflicts', 'correlatedWith', 58, '相関のみ');
  pushIf('recoveryEvents', 'confidenceChanges', 'recoveredBy', 52, 'recovery→confidence（仮説）');
  pushIf('governanceActions', 'freezeEscalations', 'suppressedBy', 60, 'gov suppress');
  pushIf('hallucinationEvents', 'contradictionBursts', 'escalatedBy', 55, 'hallucination escalate（仮説）');
  pushIf('contradictionBursts', 'consensusConflicts', 'contradictedBy', 62, 'contradiction');
  pushIf('stabilityBreaks', 'rollbackEvents', 'degradedBy', 50, 'stability degrade');
  pushIf('orchestrationDecisions', 'userBehaviorPatterns', 'correlatedWith', 45, 'orch-user correlate');
  pushIf('freezeEscalations', 'recoveryEvents', 'causedBy', 48, 'freeze→recovery（仮説・低信頼）');

  if (input.mockEventChainBoost) {
    const boost = input.mockEventChainBoost;
    const mockEdges: CausalEdgeSnapshot[] = [
      mkEdge('confidenceChanges', 'hallucinationEvents', 'causedBy', clamp(40 + boost * 0.3), 'mock chain（仮説）'),
      mkEdge('hallucinationEvents', 'contradictionBursts', 'causedBy', clamp(38 + boost * 0.25), 'mock propagate（仮説）'),
      mkEdge('contradictionBursts', 'consensusConflicts', 'escalatedBy', clamp(42 + boost * 0.2), 'mock escalate（仮説）'),
    ];
    for (const edge of mockEdges) {
      if (edges.length >= CAUSAL_EDGE_MAX) break;
      edges.push(edge);
    }
  }

  return edges;
}

export function computeGraphMetrics(
  input: BuildStrategicMemoryGraphInput,
  nodes: CausalNodeSnapshot[],
  edges: CausalEdgeSnapshot[],
): GraphMetrics {
  const activeCount = nodes.filter((n) => n.active).length;
  const edgeCount = edges.length;

  const fragmentationPct = clamp(
    activeCount > 10 ? 15 : 35 + (14 - activeCount) * 4 + (input.mockEventChainBoost ?? 0) * 0.15,
  );

  const contradictionPct = clamp(
    (input.consensus?.contradictionRiskPct ?? 0) * 0.5 +
      (input.epistemic?.contradictionDensityPct ?? 0) * 0.35 +
      (input.mockContradictionBoost ?? 0),
  );

  const unsupportedCausalityPct = clamp(
    edges.filter((e) => e.kind === 'causedBy' && e.confidencePct < 45).length * 12 +
      (input.mockUnsupportedCausalityBoost ?? 0),
  );

  const temporalDriftPct = clamp(
    (input.metaReliability?.semanticDriftPct ?? 0) * 0.35 +
      (input.epistemic?.temporalDriftPct ?? 0) * 0.3 +
      (input.refreshCount > 30 ? 20 : 8),
  );

  const recursiveLoopsPct = clamp(
    edges.filter((e) => e.from === e.to || edges.some((o) => o.to === e.from && o.from === e.to)).length * 15 +
      (input.reflection?.contradictionTrendPct ?? 0) * 0.25 +
      (input.mockRecursiveLoopsBoost ?? 0),
  );

  const hallucinationPropagationPct = clamp(
    recursiveLoopsPct * 0.3 +
      unsupportedCausalityPct * 0.25 +
      (input.epistemic?.hallucinationRiskPct ?? 0) * 0.35 +
      (input.metaReliability?.confidenceInflationPct ?? 0) * 0.1,
  );

  let graphHealthPct = clamp(
    100 -
      fragmentationPct * 0.2 -
      contradictionPct * 0.2 -
      unsupportedCausalityPct * 0.15 -
      temporalDriftPct * 0.15 -
      hallucinationPropagationPct * 0.15 -
      recursiveLoopsPct * 0.15,
  );
  if (typeof input.mockGraphHealthPct === 'number') {
    graphHealthPct = clamp(input.mockGraphHealthPct);
  }

  const eventCorrelationPct = clamp(edgeCount > 0 ? 55 + edgeCount * 2 : 40);
  const temporalConsistencyPct = clamp(100 - temporalDriftPct);
  const repetitionStrengthPct = clamp(Math.min(100, input.refreshCount * 6));
  const crossLayerAgreementPct = clamp(
    100 - (input.consensus?.contradictionRiskPct ?? 0) * 0.45,
  );

  const causalConfidencePct = clamp(
    eventCorrelationPct *
      (temporalConsistencyPct / 100) *
      (repetitionStrengthPct / 100) *
      (crossLayerAgreementPct / 100) *
      100,
  );

  const timelineContinuityPct = clamp(
    temporalConsistencyPct * 0.6 + repetitionStrengthPct * 0.25 + (graphHealthPct > 50 ? 15 : 5),
  );

  const memoryIntegrityPct = clamp(
    70 + timelineContinuityPct * 0.2 + (input.governance ? 10 : 0) - contradictionPct * 0.35,
  );

  const edgeDensityPct = clamp(Math.min(100, edgeCount * 5));
  const causalDriftPct = clamp(temporalDriftPct * 0.6 + unsupportedCausalityPct * 0.25);

  return {
    fragmentationPct,
    contradictionPct,
    unsupportedCausalityPct,
    temporalDriftPct,
    hallucinationPropagationPct,
    recursiveLoopsPct,
    graphHealthPct,
    eventCorrelationPct,
    temporalConsistencyPct,
    repetitionStrengthPct,
    crossLayerAgreementPct,
    causalConfidencePct,
    timelineContinuityPct,
    memoryIntegrityPct,
    edgeDensityPct,
    causalDriftPct,
  };
}

export function classifyGraphState(
  metrics: GraphMetrics,
  governanceBlocks: boolean,
): GraphStructureState {
  if (governanceBlocks) return 'GRAPH_CAUSALITY_UNCERTAIN';
  if (metrics.recursiveLoopsPct > RECURSIVE_LOOPS_THRESHOLD) return 'GRAPH_OVERCONNECTED';
  if (metrics.contradictionPct > CONTRADICTION_CRITICAL_THRESHOLD) return 'GRAPH_CONTRADICTED';
  if (metrics.unsupportedCausalityPct > UNSUPPORTED_CAUSALITY_THRESHOLD) {
    return 'GRAPH_CAUSALITY_UNCERTAIN';
  }
  if (metrics.graphHealthPct < GRAPH_HEALTH_DRIFTING_THRESHOLD) {
    return 'GRAPH_TEMPORALLY_DRIFTING';
  }
  if (metrics.graphHealthPct < GRAPH_HEALTH_FRAGMENTED_THRESHOLD) {
    return 'GRAPH_FRAGMENTED';
  }
  return 'GRAPH_STABLE';
}

export function resolveGraphActions(
  state: GraphStructureState,
  metrics: GraphMetrics,
): GraphResolution {
  const base: GraphResolution = {
    graphState: state,
    orchestrationBudgetMax: BUDGET_GRAPH_STABLE,
    explanationOnlyMode: false,
    causalFreezeActive: false,
    consensusRebuildRequested: false,
    edgePruningActive: false,
    timelineRebuildActive: false,
  };

  switch (state) {
    case 'GRAPH_FRAGMENTED':
      return { ...base, orchestrationBudgetMax: BUDGET_GRAPH_FRAGMENTED };
    case 'GRAPH_TEMPORALLY_DRIFTING':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_GRAPH_DRIFTING,
        timelineRebuildActive: true,
      };
    case 'GRAPH_CAUSALITY_UNCERTAIN':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_GRAPH_RISK,
        explanationOnlyMode: true,
        causalFreezeActive: true,
      };
    case 'GRAPH_CONTRADICTED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_GRAPH_DRIFTING,
        consensusRebuildRequested: true,
        timelineRebuildActive: true,
      };
    case 'GRAPH_OVERCONNECTED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_GRAPH_RISK,
        edgePruningActive: true,
        causalFreezeActive: true,
      };
    default:
      return base;
  }
}

export function graphStateLabelJa(state: GraphStructureState): string {
  return GRAPH_STATE_LABELS_JA[state];
}
