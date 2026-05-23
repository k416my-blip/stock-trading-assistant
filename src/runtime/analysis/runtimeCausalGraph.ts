/**
 * Runtime causal graph — DAG from traces with relation priority (not timestamp-only root).
 */
import type {
  CausalAnomalyAttribution,
  CausalEdge,
  CausalEventKind,
  CausalEventNode,
  RuntimeCausalGraph,
  RuntimeCausalGraphBundle,
  RuntimeCausalGraphInput,
} from '../../types/runtimeCausalGraph';
import type { RedmiLongSoakExport } from '../../types/redmiLongSoakValidation';
import {
  CAUSAL_CASCADE_ONLY_KINDS,
  CAUSAL_RELATION_RULES,
  CAUSAL_ROOT_PRIORITY,
  CAUSAL_WINDOW_MS,
  RUNTIME_CAUSAL_GRAPH_VERSION,
} from '../../constants/runtimeCausalGraph';
import {
  POST_SOAK_FAIL_DELAYED_RESUME_MS,
  POST_SOAK_FAIL_TIMER_DRIFT_MS,
} from '../../constants/postSoakAnalysis';
import { REDMI_SOAK_RECONNECT_STORM_PER_MIN } from '../../constants/redmiLongSoakValidation';
import {
  collapseEventBursts,
  computeOwnershipConsistency,
  computeReplayConsistency,
  computeTemporalEdgeWeight,
  rootTemporalSupportScore,
  synthesizeEdgeConfidence,
} from './runtimeTemporalCausality';
import {
  ROOT_MIN_OUTGOING_TEMPORAL,
  ROOT_STALE_EDGE_PENALTY,
  ROOT_STALE_TEMPORAL_THRESHOLD,
} from '../../constants/runtimeTemporalCausality';
import {
  inferLatentRuntimeStates,
  mergeLatentStatesIntoCausalGraph,
  formatLatentStateMarkdown,
} from './runtimeLatentStateInference';
import {
  buildHierarchicalLatentRuntimeGraph,
  formatHierarchicalLatentMarkdown,
  mergeHierarchicalLatentIntoGraph,
} from './hierarchicalLatentRuntimeGraph';
import type { AdaptiveRuntimeContext } from '../../types/adaptiveRuntimeLearning';
import {
  annotateEdgesWithAdaptive,
  buildAdaptiveRuntimeReport,
  computeAdaptiveRootScore,
  formatAdaptiveRuntimeReportMarkdown,
  getAdaptiveDecayWindow,
  learnFromInference,
  stabilizeLatentStates,
} from './adaptiveRuntimeLearningEngine';
import {
  runAdaptiveGovernance,
  formatGovernanceDashboardMarkdown,
} from '../governance/adaptiveRuntimeGovernance';

let nodeSeq = 0;

function parseTime(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function nextId(prefix: string): string {
  nodeSeq += 1;
  return `${prefix}-${nodeSeq}`;
}

function makeNode(
  kind: import('../../types/runtimeCausalGraph').ObservableCausalEventKind,
  at: string,
  detailJa: string,
  extra?: { reconnectUuid?: string; source?: string },
): CausalEventNode {
  return {
    id: nextId(kind),
    kind,
    at,
    sortKey: parseTime(at),
    detailJa,
    reconnectUuid: extra?.reconnectUuid,
    source: extra?.source,
    rootPriority: CAUSAL_ROOT_PRIORITY[kind],
    cascadeOnly: CAUSAL_CASCADE_ONLY_KINDS.includes(kind),
  };
}

function extractNodes(input: RuntimeCausalGraphInput): CausalEventNode[] {
  const nodes: CausalEventNode[] = [];
  const baseAt = new Date().toISOString();

  if (input.miui.resumeLatencyMs >= POST_SOAK_FAIL_DELAYED_RESUME_MS) {
    nodes.push(
      makeNode('resume', baseAt, `foreground resume latency ${input.miui.resumeLatencyMs}ms`),
      makeNode('delayed_resume', baseAt, `delayed resume ${input.miui.resumeLatencyMs}ms`),
    );
  } else if (input.miui.lastResumeAt > 0) {
    nodes.push(makeNode('resume', new Date(input.miui.lastResumeAt).toISOString(), 'foreground resume'));
  }

  if (input.miui.timerDriftMs >= POST_SOAK_FAIL_TIMER_DRIFT_MS) {
    nodes.push(makeNode('timer_drift', baseAt, `timer drift ${input.miui.timerDriftMs}ms`));
  }

  if (input.miui.silentDisconnectCount >= 1) {
    nodes.push(
      makeNode('silent_disconnect', baseAt, `silent disconnect x${input.miui.silentDisconnectCount}`),
    );
  }

  for (const t of input.lifecycleTimeline) {
    if (t.kind === 'foreground' || t.kind === 'resume') {
      nodes.push(makeNode('resume', t.at, t.detailJa));
    }
    if (t.kind === 'trim_memory' && t.native) {
      nodes.push(makeNode('trim_memory', t.at, t.detailJa));
      nodes.push(makeNode('native_lifecycle', t.at, `native ${t.detailJa}`));
    }
    if (t.kind === 'reconnect_start') {
      nodes.push(makeNode('reconnect_schedule', t.at, t.detailJa));
    }
    if (t.kind === 'reconnect_end') {
      nodes.push(makeNode('reconnect_execute', t.at, t.detailJa));
    }
    if (t.kind === 'hydration_start') {
      nodes.push(makeNode('hydration_lock_overlap', t.at, t.detailJa));
    }
  }

  for (const b of input.boundaryTrace) {
    if (b.kind === 'native_lifecycle') {
      nodes.push(makeNode('trim_memory', b.at, b.detailJa), makeNode('native_lifecycle', b.at, b.detailJa));
    }
    if (b.kind === 'hydration_overlap') {
      nodes.push(makeNode('hydration_lock_overlap', b.at, b.detailJa));
    }
    if (b.kind === 'async_saturation') {
      nodes.push(makeNode('async_saturation', b.at, b.detailJa));
    }
    if (b.kind === 'telemetry_burst') {
      nodes.push(makeNode('event_loop_lag', b.at, b.detailJa));
    }
    if (b.kind === 'coordinator_reconnect') {
      nodes.push(
        makeNode('reconnect_schedule', b.at, b.detailJa, {
          reconnectUuid: b.reconnectUuid,
          source: b.reconnectSource,
        }),
      );
    }
    if (b.kind === 'js_reconnect_execute') {
      nodes.push(
        makeNode('reconnect_execute', b.at, b.detailJa, {
          reconnectUuid: b.reconnectUuid,
          source: b.reconnectSource,
        }),
      );
    }
    if (b.kind === 'ownership_mismatch') {
      nodes.push(makeNode('ownership_violation', b.at, b.detailJa, { reconnectUuid: b.reconnectUuid }));
    }
    if (b.kind === 'app_phase' && b.detailJa.includes('foreground')) {
      nodes.push(makeNode('resume', b.at, b.detailJa));
    }
  }

  for (const t of input.reconnectTimeline) {
    if (t.phase === 'schedule') {
      nodes.push(
        makeNode('reconnect_schedule', t.at, t.detailJa, { reconnectUuid: t.token, source: t.source }),
      );
    }
    if (t.phase === 'execute') {
      nodes.push(
        makeNode('reconnect_execute', t.at, t.detailJa, { reconnectUuid: t.token, source: t.source }),
      );
    }
    if (t.phase === 'coalesce') {
      nodes.push(makeNode('coalesce', t.at, t.detailJa));
      nodes.push(makeNode('duplicate_schedule', t.at, t.detailJa));
    }
    if (t.phase === 'budget_block') {
      nodes.push(makeNode('budget_block', t.at, t.detailJa));
    }
  }

  const traces = input.reconnectTrace ?? [];
  for (const t of traces) {
    if (t.phase === 'schedule') {
      nodes.push(
        makeNode('reconnect_schedule', t.at, t.detailJa, { reconnectUuid: t.token, source: t.source }),
      );
    }
    if (t.phase === 'execute') {
      nodes.push(
        makeNode('reconnect_execute', t.at, t.detailJa, { reconnectUuid: t.token, source: t.source }),
      );
    }
  }

  for (const row of input.websocketOwnership) {
    if (row.duplicate) {
      nodes.push(
        makeNode('duplicate_socket', row.scheduledAt, `duplicate ${row.reconnectUuid}`, {
          reconnectUuid: row.reconnectUuid,
          source: row.source,
        }),
      );
    }
    if (row.owner === 'native_untagged') {
      nodes.push(makeNode('ownership_violation', row.scheduledAt, 'native untagged', {
        reconnectUuid: row.reconnectUuid,
      }));
    }
    if (
      row.owner === 'js_execute' &&
      !input.websocketOwnership.some(
        (s) => s.reconnectUuid === row.reconnectUuid && s.owner === 'js_coordinator',
      )
    ) {
      nodes.push(makeNode('ownership_violation', row.executedAt ?? row.scheduledAt, 'orphan execute', {
        reconnectUuid: row.reconnectUuid,
      }));
    }
  }

  for (const cp of input.checkpoints) {
    if (cp.reconnectPerMin >= REDMI_SOAK_RECONNECT_STORM_PER_MIN) {
      nodes.push(makeNode('reconnect_storm', cp.at, `${cp.reconnectPerMin}/min`));
    }
    if (cp.duplicateSockets > 0) {
      nodes.push(makeNode('duplicate_socket', cp.at, `dup ${cp.duplicateSockets}`));
    }
    if (['severe', 'critical', 'emergency', 'shutdown'].includes(cp.thermalLevel)) {
      nodes.push(makeNode('thermal_throttle', cp.at, cp.thermalLevel));
    }
    if (cp.asyncQueueLagMs >= 200) {
      nodes.push(makeNode('async_saturation', cp.at, `lag ${cp.asyncQueueLagMs}ms`));
    }
    if (cp.resumeLatencyMs >= POST_SOAK_FAIL_DELAYED_RESUME_MS) {
      nodes.push(makeNode('delayed_resume', cp.at, `${cp.resumeLatencyMs}ms`));
    }
  }

  return dedupeNodes(nodes);
}

function dedupeNodes(nodes: CausalEventNode[]): CausalEventNode[] {
  const seen = new Set<string>();
  const out: CausalEventNode[] = [];
  for (const n of nodes.sort((a, b) => a.sortKey - b.sortKey)) {
    const key = `${n.kind}|${n.sortKey}|${n.reconnectUuid ?? ''}|${n.detailJa.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

function buildEdges(nodes: CausalEventNode[], adaptive?: AdaptiveRuntimeContext): CausalEdge[] {
  const edges: CausalEdge[] = [];
  let edgeSeq = 0;

  for (const rule of CAUSAL_RELATION_RULES) {
    const fromNodes = nodes.filter((n) => n.kind === rule.from);
    const toNodes = nodes.filter((n) => n.kind === rule.to);
    for (const from of fromNodes) {
      for (const to of toNodes) {
        const decay =
          adaptive?.store &&
          getAdaptiveDecayWindow(rule.from, rule.to, adaptive);
        const temporal = computeTemporalEdgeWeight({
          sourceTimestampMs: from.sortKey,
          targetTimestampMs: to.sortKey,
          fromKind: rule.from,
          toKind: rule.to,
          decayOverride: decay
            ? { strongMs: decay.strongMs, maxMs: decay.maxMs, minWeight: decay.minWeight }
            : undefined,
        });
        if (temporal.gapMs <= 0 || temporal.temporalConfidence <= 0) continue;
        const maxGap = decay?.maxMs ?? rule.maxGapMs;
        if (temporal.gapMs > maxGap) continue;
        if (from.reconnectUuid && to.reconnectUuid && from.reconnectUuid !== to.reconnectUuid) {
          if (rule.from !== 'resume' && rule.to !== 'reconnect_storm') continue;
        }
        const replayConsistency = computeReplayConsistency(from, to, rule.from, rule.to);
        const ownershipConsistency = computeOwnershipConsistency(from, to, rule.from, rule.to);
        const confidence = synthesizeEdgeConfidence({
          causalRuleWeight: rule.confidence,
          temporalWeight: temporal.temporalConfidence,
          replayConsistency,
          ownershipConsistency,
        });
        edgeSeq += 1;
        edges.push({
          id: `e-${edgeSeq}`,
          from: from.id,
          to: to.id,
          relation: rule.label,
          confidence,
          gapMs: temporal.gapMs,
          causalRuleWeight: rule.confidence,
          temporalWeight: temporal.temporalConfidence,
          replayConsistency,
          ownershipConsistency,
          decayStatus: temporal.decayStatus,
        });
      }
    }
  }

  if (adaptive) {
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    return annotateEdgesWithAdaptive(edges, adaptive.store, nodeById);
  }
  return edges;
}

function incomingEdges(nodeId: string, edges: CausalEdge[]): CausalEdge[] {
  return edges.filter((e) => e.to === nodeId);
}

function outgoingEdges(nodeId: string, edges: CausalEdge[]): CausalEdge[] {
  return edges.filter((e) => e.from === nodeId);
}

function rootCandidateScore(
  node: CausalEventNode,
  edges: CausalEdge[],
  adaptive?: AdaptiveRuntimeContext,
  graph?: RuntimeCausalGraph,
): number {
  if (adaptive && graph) {
    return computeAdaptiveRootScore(node, edges, adaptive.store, graph);
  }
  const temporalSupport = rootTemporalSupportScore(node.id, edges);
  const bestOut = edges
    .filter((e) => e.from === node.id)
    .sort((a, b) => b.temporalWeight - a.temporalWeight)[0];
  let score = 1000 - node.rootPriority * 10 + temporalSupport * 40;
  if (bestOut && bestOut.temporalWeight < ROOT_STALE_TEMPORAL_THRESHOLD) {
    score -= ROOT_STALE_EDGE_PENALTY;
  }
  if (bestOut && bestOut.decayStatus === 'stale') {
    score -= ROOT_STALE_EDGE_PENALTY * 0.5;
  }
  const staleIns = incomingEdges(node.id, edges).filter((e) => e.decayStatus === 'stale').length;
  score -= staleIns * 4;
  return score;
}

/** Root = priority DAG + temporal support (stale outgoing hops penalized). */
function selectRootNode(
  nodes: CausalEventNode[],
  edges: CausalEdge[],
  adaptive?: AdaptiveRuntimeContext,
  graph?: RuntimeCausalGraph,
): CausalEventNode | null {
  if (nodes.length === 0) return null;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  function hasHigherPriorityParent(node: CausalEventNode): boolean {
    for (const e of incomingEdges(node.id, edges)) {
      if (e.temporalWeight < ROOT_MIN_OUTGOING_TEMPORAL && e.decayStatus === 'stale') continue;
      const parent = nodeById.get(e.from);
      if (!parent) continue;
      if (parent.rootPriority < node.rootPriority) return true;
      if (parent.rootPriority === node.rootPriority && parent.sortKey < node.sortKey) return true;
    }
    return false;
  }

  const candidates = nodes.filter(
    (n) => !n.isLatent && !n.cascadeOnly && !hasHigherPriorityParent(n),
  );
  const pool =
    candidates.length > 0
      ? candidates
      : nodes.filter((n) => !n.isLatent && !hasHigherPriorityParent(n));
  if (pool.length === 0) return nodes.sort((a, b) => a.rootPriority - b.rootPriority)[0] ?? null;

  pool.sort(
    (a, b) =>
      rootCandidateScore(b, edges, adaptive, graph) - rootCandidateScore(a, edges, adaptive, graph) ||
      a.rootPriority - b.rootPriority ||
      a.sortKey - b.sortKey,
  );
  return pool[0];
}

function buildRootCauseChain(rootId: string | null, nodes: CausalEventNode[], edges: CausalEdge[]): string[] {
  if (!rootId) return [];
  const chain: string[] = [rootId];
  let current = rootId;
  const visited = new Set<string>([rootId]);

  for (let depth = 0; depth < 12; depth += 1) {
    const outs = outgoingEdges(current, edges)
      .filter((e) => !visited.has(e.to))
      .sort((a, b) => b.confidence - a.confidence || a.gapMs - b.gapMs);
    if (outs.length === 0) break;
    const next = outs[0].to;
    visited.add(next);
    chain.push(next);
    current = next;
  }

  return chain;
}

function collectCascadeIds(rootId: string | null, edges: CausalEdge[]): string[] {
  if (!rootId) return [];
  const cascade = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const e of outgoingEdges(id, edges)) {
      if (!cascade.has(e.to)) {
        cascade.add(e.to);
        queue.push(e.to);
      }
    }
  }
  cascade.delete(rootId);
  return [...cascade];
}

function computeGraphConfidence(root: CausalEventNode | null, edges: CausalEdge[], chain: string[]): number {
  if (!root) return 0;
  const chainEdges = edges.filter((e) => {
    const idxFrom = chain.indexOf(e.from);
    const idxTo = chain.indexOf(e.to);
    return idxFrom >= 0 && idxTo === idxFrom + 1;
  });
  if (chainEdges.length === 0) return 0.55;
  const avg = chainEdges.reduce((s, e) => s + e.confidence, 0) / chainEdges.length;
  return Math.round(Math.min(0.98, avg + (root.cascadeOnly ? -0.2 : 0)) * 100) / 100;
}

function attributeAnomalies(
  input: RuntimeCausalGraphInput,
  nodes: CausalEventNode[],
  edges: CausalEdge[],
  root: CausalEventNode | null,
): CausalAnomalyAttribution[] {
  const anomalies = input.stabilityAnomalies ?? input.failureTimeline.map((f) => ({
    kind: f.check,
    summaryJa: f.detailJa,
    at: f.at,
  }));

  const kindForFailure: Record<string, CausalEventKind> = {
    duplicate_reconnect: 'duplicate_socket',
    coordinator_ownership_violation: 'ownership_violation',
    native_reconnect_bypass: 'ownership_violation',
    reconnect_storm: 'reconnect_storm',
    hydration_race: 'hydration_lock_overlap',
    timer_resurrection: 'timer_drift',
    silent_websocket_disconnect: 'silent_disconnect',
    miui_delayed_resume: 'delayed_resume',
  };

  const nodeByKind = (kind: CausalEventKind) => nodes.filter((n) => n.kind === kind);

  return anomalies.map((a, i) => {
    const targetKind = kindForFailure[a.kind] ?? 'reconnect_storm';
    const targetNodes = nodeByKind(targetKind);
    const target = targetNodes.sort((x, y) => y.sortKey - x.sortKey)[0];
    let primaryNode = root;
    let primaryKind = root?.kind ?? targetKind;

    if (target && root) {
      if (isDescendantOf(root.id, target.id, edges) || target.id === root.id) {
        primaryNode = root;
        primaryKind = root.kind;
      } else {
        const parent = findNearestAncestor(target.id, root.id, edges, nodes);
        if (parent && parent.rootPriority < (target.rootPriority ?? 99)) {
          primaryNode = parent;
          primaryKind = parent.kind;
        }
      }
    }

    const secondary = outgoingEdges(primaryNode?.id ?? '', edges)
      .map((e) => nodes.find((n) => n.id === e.to)?.kind)
      .filter((k): k is CausalEventKind => k != null && k !== primaryKind);

    return {
      anomalyId: `anomaly-${i}`,
      summaryJa: a.summaryJa,
      primaryCause: primaryKind,
      primaryNodeId: primaryNode?.id ?? '',
      secondaryCascade: [...new Set(secondary)],
      confidence: primaryNode ? 0.85 : 0.5,
    };
  });
}

function isDescendantOf(ancestorId: string, nodeId: string, edges: CausalEdge[]): boolean {
  const queue = [ancestorId];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    if (id === nodeId) return true;
    for (const e of outgoingEdges(id, edges)) {
      queue.push(e.to);
    }
  }
  return false;
}

/** Closest ancestor on causal path toward root (not the cascade leaf). */
function findNearestAncestor(
  targetId: string,
  rootId: string,
  edges: CausalEdge[],
  nodes: CausalEventNode[],
): CausalEventNode | null {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const parentMap = new Map<string, string[]>();
  for (const e of edges) {
    const list = parentMap.get(e.to) ?? [];
    list.push(e.from);
    parentMap.set(e.to, list);
  }

  const queue: string[] = [targetId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    if (id === rootId) return nodeById.get(rootId) ?? null;
    for (const p of parentMap.get(id) ?? []) {
      if (p === rootId) return nodeById.get(id) ?? null;
      queue.push(p);
    }
  }

  return nodeById.get(rootId) ?? null;
}

export function buildRuntimeCausalGraph(
  input: RuntimeCausalGraphInput,
  adaptive?: AdaptiveRuntimeContext,
): RuntimeCausalGraph {
  nodeSeq = 0;
  const rawNodes = extractNodes(input);
  const nodes = collapseEventBursts(rawNodes);
  const edges = buildEdges(nodes, adaptive);
  const draft: RuntimeCausalGraph = {
    version: RUNTIME_CAUSAL_GRAPH_VERSION,
    builtAt: new Date().toISOString(),
    nodes,
    edges,
    rootCauseChain: [],
    cascadeNodeIds: [],
    rootNodeId: null,
    rootCauseKind: null,
    confidenceScore: 0,
    anomalyAttributions: [],
  };
  const root = selectRootNode(nodes, edges, adaptive, draft);
  const rootCauseChain = buildRootCauseChain(root?.id ?? null, nodes, edges);
  const cascadeNodeIds = collectCascadeIds(root?.id ?? null, edges);
  const confidenceScore = computeGraphConfidence(root, edges, rootCauseChain);
  const anomalyAttributions = attributeAnomalies(input, nodes, edges, root);

  draft.rootCauseChain = rootCauseChain;
  draft.cascadeNodeIds = cascadeNodeIds;
  draft.rootNodeId = root?.id ?? null;
  draft.rootCauseKind = root?.kind ?? null;
  draft.confidenceScore = confidenceScore;
  draft.anomalyAttributions = anomalyAttributions;
  return draft;
}

export function causalGraphFromSoakExport(exp: RedmiLongSoakExport): RuntimeCausalGraphInput {
  return {
    reconnectTimeline: exp.boundaryValidation.reconnectTimeline,
    websocketOwnership: exp.boundaryValidation.websocketOwnership,
    boundaryTrace: [
      ...exp.boundaryValidation.recentBoundaryTrace,
      ...exp.anomalyReplaySnapshot.nativeBoundaryTrace,
    ],
    lifecycleTimeline: [
      ...exp.boundaryValidation.lifecycleTimeline,
      ...exp.anomalyReplaySnapshot.lifecycleTimeline,
    ],
    failureTimeline: exp.failureTimeline,
    checkpoints: exp.checkpoints,
    miui: exp.anomalyReplaySnapshot.miui,
    reconnectTrace: exp.anomalyReplaySnapshot.reconnectTrace,
    stabilityAnomalies: exp.anomalyReplaySnapshot.stability?.anomalies.map((a) => ({
      kind: a.kind,
      summaryJa: a.summaryJa,
    })),
  };
}

export function buildRuntimeCausalGraphFromSoak(exp: RedmiLongSoakExport): RuntimeCausalGraph {
  return buildRuntimeCausalGraph(causalGraphFromSoakExport(exp));
}

function nodeLabel(n: CausalEventNode): string {
  return `${n.kind} ${n.at.slice(11, 19)}`;
}

function mermaidNodeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

export function formatCausalGraphMermaid(graph: RuntimeCausalGraph): string {
  const lines = [
    '```mermaid',
    'flowchart TD',
    '  classDef criticalLatent fill:#fff5f5,stroke:#e53935,stroke-width:4px',
    '  classDef recoveredLatent fill:#f1f8f4,stroke:#2e7d32,stroke-width:2px',
  ];
  const root = graph.rootNodeId;
  const latentChain = new Set(graph.latentCriticalChain ?? []);
  for (const n of graph.nodes) {
    const label = nodeLabel(n).replace(/"/g, "'");
    const mid = mermaidNodeId(n.id);
    if (n.isLatent) {
      if (n.latentRecovered) {
        lines.push(`  ${mid}(("${label}")):::recoveredLatent`);
      } else if (
        n.latentCritical ||
        n.latentEscalation === 'critical' ||
        (n.latentState && latentChain.has(n.latentState))
      ) {
        lines.push(`  ${mid}[["${label}"]]:::criticalLatent`);
      } else {
        lines.push(`  ${mid}(("${label}"))`);
      }
    } else if (n.id === root) {
      lines.push(`  ${mid}["${label} ★"]`);
    } else {
      lines.push(`  ${mid}["${label}"]`);
    }
  }
  for (const e of graph.edges) {
    const from = mermaidNodeId(e.from);
    const to = mermaidNodeId(e.to);
    if (e.edgeClass === 'latent_transition') {
      const p = Math.round((e.transitionProbability ?? e.confidence) * 100);
      lines.push(`  ${from} -.->|"P=${p}%"| ${to}`);
      continue;
    }
    if (e.edgeClass === 'recovery') {
      lines.push(`  ${from} -.->|"recovery"| ${to}`);
      continue;
    }
    const parts = [
      e.relation,
      `conf ${Math.round(e.confidence * 100)}%`,
      `lag ${e.gapMs}ms`,
      e.decayStatus,
    ];
    if (e.learnedDelta != null) parts.push(`Δ${(e.learnedDelta * 100).toFixed(0)}`);
    if (e.stability != null) parts.push(`stab ${(e.stability * 100).toFixed(0)}`);
    if (e.replaySupport != null) parts.push(`replay ${(e.replaySupport * 100).toFixed(0)}`);
    const label = parts.join(' · ');
    if (e.edgeStability === 'unstable') {
      lines.push(`  ${from} -.->|"${label.replace(/"/g, "'")}"| ${to}:::unstableEdge`);
    } else if (e.edgeStability === 'learned_high') {
      lines.push(`  ${from} ==>|"${label.replace(/"/g, "'")}"| ${to}:::learnedEdge`);
    } else {
      lines.push(`  ${from} -->|"${label.replace(/"/g, "'")}"| ${to}`);
    }
  }
  lines.push('```');
  return lines.join('\n');
}

export function formatCausalGraphMarkdown(graph: RuntimeCausalGraph): string {
  const lines = [
    `# Runtime Causal Graph v${graph.version}`,
    '',
    `**Built:** ${graph.builtAt}`,
    `**Root:** ${graph.rootCauseKind ?? 'none'} (${graph.rootNodeId ?? '-'})`,
    `**Confidence:** ${graph.confidenceScore}`,
    '',
    '## Root cause chain',
    graph.rootCauseChain
      .map((id) => {
        const n = graph.nodes.find((x) => x.id === id);
        return n ? `- ${n.kind}: ${n.detailJa}` : `- ${id}`;
      })
      .join('\n'),
    '',
    '## Cascade nodes',
    graph.cascadeNodeIds.length === 0
      ? '- none'
      : graph.cascadeNodeIds
          .map((id) => {
            const n = graph.nodes.find((x) => x.id === id);
            return n ? `- ${n.kind}` : `- ${id}`;
          })
          .join('\n'),
  ];

  if (graph.anomalyAttributions.length > 0) {
    lines.push('', '## Anomaly attributions');
    for (const a of graph.anomalyAttributions) {
      lines.push(
        `- **${a.summaryJa}** → primary \`${a.primaryCause}\` (${Math.round(a.confidence * 100)}%) cascade: ${a.secondaryCascade.join(' → ') || 'none'}`,
      );
    }
  }

  lines.push('', '## Mermaid (observable)', '', formatCausalGraphMermaid(graph));
  return lines.join('\n');
}

export {
  inferLatentRuntimeStates,
  mergeLatentStatesIntoCausalGraph,
  formatLatentStateMarkdown,
} from './runtimeLatentStateInference';

export {
  buildHierarchicalLatentRuntimeGraph,
  mergeHierarchicalLatentIntoGraph,
  formatHierarchicalLatentMarkdown,
  extractCriticalLatentChain,
} from './hierarchicalLatentRuntimeGraph';

export function exportCausalGraphJson(graph: RuntimeCausalGraph): string {
  return JSON.stringify(graph, null, 2);
}

export function buildRuntimeCausalGraphBundle(
  input: RuntimeCausalGraphInput,
  options?: {
    previousLatent?: import('../../types/runtimeLatentStateInference').InferredLatentState[];
    adaptive?: AdaptiveRuntimeContext;
  },
): RuntimeCausalGraphBundle {
  const adaptive = options?.adaptive;
  const baseGraph = buildRuntimeCausalGraph(input, adaptive);
  let rawInference = inferLatentRuntimeStates({
    graph: baseGraph,
    raw: input,
    previous: options?.previousLatent,
  });
  const stabilizedStates = adaptive
    ? stabilizeLatentStates(rawInference.states, options?.previousLatent, adaptive.store)
    : rawInference.states;
  const latentInference = {
    ...rawInference,
    states: stabilizedStates,
    dominantState: stabilizedStates[0]?.state ?? null,
    overallConfidence: stabilizedStates[0]?.confidence ?? 0,
  };
  let graph = mergeLatentStatesIntoCausalGraph(baseGraph, latentInference);

  const latentNodeIdByState: Partial<Record<string, string>> = {};
  for (const n of graph.nodes) {
    if (n.isLatent && n.latentState) {
      latentNodeIdByState[n.latentState] = n.id;
    }
  }

  const hierarchicalLatent = buildHierarchicalLatentRuntimeGraph({
    inference: latentInference,
    previous: options?.previousLatent,
    learningStore: adaptive?.store,
    latentNodeIdByState: latentNodeIdByState as Partial<
      Record<import('../../types/runtimeLatentStateInference').LatentRuntimeStateKind, string>
    >,
  });
  graph = mergeHierarchicalLatentIntoGraph(graph, hierarchicalLatent);

  if (adaptive) {
    const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
    graph = {
      ...graph,
      edges: annotateEdgesWithAdaptive(graph.edges, adaptive.store, nodeById),
    };
    learnFromInference(
      {
        graph,
        latentChain: hierarchicalLatent.criticalLatentChain,
        predictedRootKind: baseGraph.rootCauseKind,
        recoveryActions: ['storm_suppression', 'coalesce'],
        recoverySucceeded: (input.failureTimeline?.length ?? 0) === 0,
      },
      adaptive,
    );
  }

  let governanceReport: import('../../types/adaptiveRuntimeGovernance').AdaptiveGovernanceReport | undefined;
  if (adaptive) {
    governanceReport = runAdaptiveGovernance(adaptive, {
      graph,
      latentChain: hierarchicalLatent.criticalLatentChain,
      deviceProfile: adaptive.deviceProfile,
      sessionElapsedMs: 120_000,
      previousRootKind: baseGraph.rootCauseKind,
      rootKind: graph.rootCauseKind,
    });
    if (governanceReport.quarantinedGraph) {
      graph = governanceReport.quarantinedGraph;
    }
  }

  const adaptiveReport = adaptive ? buildAdaptiveRuntimeReport(adaptive.store) : undefined;

  const latentChainMd =
    hierarchicalLatent.criticalLatentChain.length > 0
      ? `\n**Latent root chain:** ${hierarchicalLatent.criticalLatentChain.join(' → ')}\n`
      : '';

  const markdown = [
    formatCausalGraphMarkdown(baseGraph),
    latentChainMd,
    '',
    formatLatentStateMarkdown(latentInference),
    '',
    formatHierarchicalLatentMarkdown(hierarchicalLatent),
    adaptiveReport ? `\n${formatAdaptiveRuntimeReportMarkdown(adaptiveReport)}` : '',
    '',
    '## Graph with latent hierarchy',
    '',
    formatCausalGraphMermaid(graph),
  ].join('\n');
  return {
    graph,
    latentInference,
    hierarchicalLatent,
    adaptiveReport,
    governanceReport,
    mermaid: formatCausalGraphMermaid(graph),
    markdown,
    json: exportCausalGraphJson(graph),
  };
}

export function buildRuntimeCausalGraphBundleFromSoak(exp: RedmiLongSoakExport): RuntimeCausalGraphBundle {
  return buildRuntimeCausalGraphBundle(causalGraphFromSoakExport(exp));
}
