/**
 * Hierarchical latent runtime graph — latent→latent transitions, Markov prior, escalation, recovery.
 */
import type { CausalEdge, CausalEventNode, RuntimeCausalGraph } from '../../types/runtimeCausalGraph';
import type {
  HierarchicalLatentGraphInput,
  HierarchicalLatentRuntimeGraph,
  LatentEscalationLevel,
  LatentRecoveryEvent,
  LatentTransitionEdge,
} from '../../types/hierarchicalLatentRuntimeGraph';
import type { InferredLatentState, LatentRuntimeStateKind } from '../../types/runtimeLatentStateInference';
import { getLearnedTransitionProbability } from './adaptiveRuntimeLearningEngine';
import {
  ESCALATION_CRITICAL_POSTERIOR,
  ESCALATION_CRITICAL_TICKS,
  ESCALATION_DEGRADED_POSTERIOR,
  HIERARCHICAL_LATENT_GRAPH_VERSION,
  LATENT_CHAIN_ROOT_ORDER,
  LATENT_STATE_TRANSITIONS,
  LATENT_TRANSITION_ACTIVE_THRESHOLD,
  transitionProbability,
} from '../../constants/hierarchicalLatentRuntimeGraph';

export function resolveEscalationLevel(state: InferredLatentState): LatentEscalationLevel {
  if (
    state.critical ||
    state.posterior >= ESCALATION_CRITICAL_POSTERIOR ||
    state.observationTicks >= ESCALATION_CRITICAL_TICKS
  ) {
    return 'critical';
  }
  if (state.persistence === 'sustained' || state.posterior >= ESCALATION_DEGRADED_POSTERIOR) {
    return 'degraded';
  }
  return 'transient';
}

export function applyEscalationToStates(states: InferredLatentState[]): InferredLatentState[] {
  return states.map((s) => ({
    ...s,
    escalation: resolveEscalationLevel(s),
    critical: resolveEscalationLevel(s) === 'critical',
  }));
}

export function inferRecoveryEvents(
  current: InferredLatentState[],
  previous: InferredLatentState[] | undefined,
  nowIso: string,
): LatentRecoveryEvent[] {
  if (!previous?.length) return [];
  const active = new Set(current.map((s) => s.state));
  const recoveries: LatentRecoveryEvent[] = [];
  for (const prev of previous) {
    if (active.has(prev.state)) continue;
    recoveries.push({
      state: prev.state,
      recoveredAt: nowIso,
      previousPosterior: prev.posterior,
      previousEscalation: prev.escalation ?? resolveEscalationLevel(prev),
      detailJa: `${prev.state} cleared (was ${Math.round(prev.posterior * 100)}%)`,
    });
  }
  return recoveries;
}

function activeStateSet(states: InferredLatentState[]): Set<LatentRuntimeStateKind> {
  return new Set(states.map((s) => s.state));
}

export function buildLatentTransitionEdges(
  states: InferredLatentState[],
  learningStore?: import('../../types/adaptiveRuntimeLearning').AdaptiveRuntimeLearningState,
): LatentTransitionEdge[] {
  const active = activeStateSet(states);
  const posteriorBy = new Map(states.map((s) => [s.state, s.posterior]));
  const edges: LatentTransitionEdge[] = [];

  for (const def of LATENT_STATE_TRANSITIONS) {
    if (!active.has(def.from) || !active.has(def.to)) continue;
    const prob = learningStore
      ? getLearnedTransitionProbability(def.from, def.to, learningStore)
      : def.probability;
    const joint = prob * (posteriorBy.get(def.from) ?? 0) * (posteriorBy.get(def.to) ?? 0);
    edges.push({
      from: def.from,
      to: def.to,
      transitionProbability: prob,
      active: joint >= LATENT_TRANSITION_ACTIVE_THRESHOLD,
    });
  }

  return edges.filter((e) => e.active);
}

/** Longest high-P path through active latent transitions. */
export function extractCriticalLatentChain(
  transitions: LatentTransitionEdge[],
  states: InferredLatentState[],
): { chain: LatentRuntimeStateKind[]; confidence: number } {
  const active = activeStateSet(states);
  if (active.size === 0) return { chain: [], confidence: 0 };

  const adj = new Map<LatentRuntimeStateKind, LatentTransitionEdge[]>();
  for (const t of transitions) {
    const list = adj.get(t.from) ?? [];
    list.push(t);
    adj.set(t.from, list);
  }

  const targets = new Set(transitions.map((t) => t.to));
  const sources = [...active].filter((s) => !targets.has(s) || LATENT_CHAIN_ROOT_ORDER.includes(s));
  sources.sort(
    (a, b) => LATENT_CHAIN_ROOT_ORDER.indexOf(a) - LATENT_CHAIN_ROOT_ORDER.indexOf(b),
  );

  let bestChain: LatentRuntimeStateKind[] = [];
  let bestScore = 0;

  function walk(from: LatentRuntimeStateKind, path: LatentRuntimeStateKind[], score: number): void {
    if (score > bestScore) {
      bestScore = score;
      bestChain = [...path];
    }
    for (const t of adj.get(from) ?? []) {
      if (path.includes(t.to)) continue;
      walk(t.to, [...path, t.to], score * t.transitionProbability);
    }
  }

  const start =
    sources.find((s) => LATENT_CHAIN_ROOT_ORDER.includes(s)) ??
    [...active].sort(
      (a, b) => LATENT_CHAIN_ROOT_ORDER.indexOf(a) - LATENT_CHAIN_ROOT_ORDER.indexOf(b),
    )[0];

  if (start) {
    walk(start, [start], states.find((s) => s.state === start)?.posterior ?? 0.5);
  }

  if (bestChain.length === 0 && states.length > 0) {
    bestChain = [states.sort((a, b) => b.posterior - a.posterior)[0].state];
    bestScore = states[0].posterior;
  }

  return {
    chain: bestChain,
    confidence: Math.round(Math.min(0.98, bestScore) * 1000) / 1000,
  };
}

export function buildHierarchicalLatentRuntimeGraph(
  input: HierarchicalLatentGraphInput,
): HierarchicalLatentRuntimeGraph {
  const states = applyEscalationToStates(input.inference.states);
  const transitions = buildLatentTransitionEdges(states, input.learningStore);
  const { chain, confidence } = extractCriticalLatentChain(transitions, states);
  const recoveries = inferRecoveryEvents(states, input.previous, input.inference.builtAt);

  const criticalLatentNodeIds: string[] = [];
  for (const kind of chain) {
    const id = input.latentNodeIdByState?.[kind];
    if (id) criticalLatentNodeIds.push(id);
  }

  return {
    version: HIERARCHICAL_LATENT_GRAPH_VERSION,
    builtAt: input.inference.builtAt,
    transitions,
    criticalLatentChain: chain,
    criticalLatentNodeIds,
    chainConfidence: confidence,
    recoveries,
    markovPriorApplied: (input.previous?.length ?? 0) > 0,
  };
}

export function mergeHierarchicalLatentIntoGraph(
  graph: RuntimeCausalGraph,
  hierarchical: HierarchicalLatentRuntimeGraph,
): RuntimeCausalGraph {
  const nodes = [...graph.nodes];
  const edges: CausalEdge[] = [...graph.edges];
  let edgeSeq = edges.length;
  let nodeSeq = nodes.length;

  const nodeByLatent = new Map<LatentRuntimeStateKind, CausalEventNode>();
  for (const n of nodes) {
    if (n.isLatent && n.latentState) {
      nodeByLatent.set(n.latentState, n);
    }
  }

  for (const r of hierarchical.recoveries) {
    if (nodeByLatent.has(r.state)) continue;
    nodeSeq += 1;
    const id = `latent-recovered-${r.state}-${nodeSeq}`;
    nodes.push({
      id,
      kind: `latent_${r.state}` as CausalEventNode['kind'],
      at: r.recoveredAt,
      sortKey: Date.parse(r.recoveredAt),
      detailJa: `${r.state} recovered`,
      rootPriority: 58,
      cascadeOnly: true,
      isLatent: true,
      latentState: r.state,
      latentRecovered: true,
      latentCritical: false,
      latentEscalation: 'transient',
    });
    nodeByLatent.set(r.state, nodes[nodes.length - 1]);
  }

  for (const n of nodes) {
    if (!n.isLatent || !n.latentState) continue;
    if (hierarchical.criticalLatentChain.includes(n.latentState)) {
      n.latentCritical = true;
      n.latentEscalation = 'critical';
    }
  }

  for (const t of hierarchical.transitions) {
    const fromNode = nodeByLatent.get(t.from);
    const toNode = nodeByLatent.get(t.to);
    if (!fromNode || !toNode) continue;
    edgeSeq += 1;
    edges.push({
      id: `lt-${edgeSeq}`,
      from: fromNode.id,
      to: toNode.id,
      relation: 'latent→latent',
      confidence: t.transitionProbability,
      gapMs: Math.max(0, toNode.sortKey - fromNode.sortKey),
      causalRuleWeight: t.transitionProbability,
      temporalWeight: 0.9,
      replayConsistency: 0.85,
      ownershipConsistency: 0.85,
      decayStatus: 'strong',
      edgeClass: 'latent_transition',
      transitionProbability: t.transitionProbability,
    });
  }

  return {
    ...graph,
    nodes,
    edges,
    latentCriticalChain: hierarchical.criticalLatentChain,
    latentRootChain: hierarchical.criticalLatentChain,
    latentChainConfidence: hierarchical.chainConfidence,
    latentRecoveries: hierarchical.recoveries,
  };
}

export function formatHierarchicalLatentMarkdown(h: HierarchicalLatentRuntimeGraph): string {
  const lines = [
    `# Hierarchical latent graph v${h.version}`,
    '',
    `**Chain confidence:** ${h.chainConfidence}`,
    `**Markov prior:** ${h.markovPriorApplied ? 'yes' : 'no'}`,
    '',
    '## Critical latent chain (root path)',
    h.criticalLatentChain.length === 0
      ? '- none'
      : h.criticalLatentChain.map((s, i) => `${i + 1}. \`${s}\``).join('\n'),
    '',
    '## Latent transitions',
    h.transitions.length === 0
      ? '- none'
      : h.transitions
          .map((t) => `- ${t.from} → ${t.to} P=${Math.round(t.transitionProbability * 100)}%`)
          .join('\n'),
  ];

  if (h.recoveries.length > 0) {
    lines.push('', '## Recoveries');
    for (const r of h.recoveries) {
      lines.push(`- \`${r.state}\` @ ${r.recoveredAt} — ${r.detailJa}`);
    }
  }

  return lines.join('\n');
}
