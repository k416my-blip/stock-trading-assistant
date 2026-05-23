/**
 * Causal contradiction detector — inconsistent edges, loops, conflicting latent paths.
 */
import type { RuntimeCausalGraph } from '../../types/runtimeCausalGraph';
import type { CausalContradiction } from '../../types/adaptiveRuntimeGovernance';
import type { LatentRuntimeStateKind } from '../../types/runtimeLatentStateInference';
import { LATENT_STATE_TRANSITIONS } from '../../constants/hierarchicalLatentRuntimeGraph';

export function detectCausalContradictions(
  graph: RuntimeCausalGraph,
  latentChain: LatentRuntimeStateKind[],
): CausalContradiction[] {
  const contradictions: CausalContradiction[] = [];

  const unstable = graph.edges.filter((e) => e.edgeStability === 'unstable');
  if (unstable.length >= 2) {
    contradictions.push({
      kind: 'mutual_inconsistency',
      detailJa: `${unstable.length} unstable edges in same graph`,
      edgeKeys: unstable.map((e) => `${e.from}->${e.to}`),
      quarantined: true,
    });
  }

  const parentMap = new Map<string, string[]>();
  for (const e of graph.edges) {
    const list = parentMap.get(e.to) ?? [];
    list.push(e.from);
    parentMap.set(e.to, list);
  }

  function hasCycle(start: string, maxDepth = 8): boolean {
    const stack = [start];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (visited.has(id)) return true;
      visited.add(id);
      for (const p of parentMap.get(id) ?? []) {
        if (p === start) return true;
        if (visited.size < maxDepth) stack.push(p);
      }
    }
    return false;
  }

  for (const n of graph.nodes.slice(0, 8)) {
    if (hasCycle(n.id)) {
      contradictions.push({
        kind: 'circular_reinforcement',
        detailJa: `cycle detected near ${n.kind}`,
        edgeKeys: [],
        quarantined: true,
      });
      break;
    }
  }

  for (const def of LATENT_STATE_TRANSITIONS) {
    if (latentChain.includes(def.to) && latentChain.includes(def.from)) {
      const iFrom = latentChain.indexOf(def.from);
      const iTo = latentChain.indexOf(def.to);
      if (iTo < iFrom) {
        contradictions.push({
          kind: 'impossible_loop',
          detailJa: `${def.from}→${def.to} temporal inversion in latent chain`,
          edgeKeys: [`${def.from}->${def.to}`],
          quarantined: true,
        });
      }
    }
  }

  if (graph.latentCriticalChain?.length && graph.rootCauseKind) {
    const latentRoot = graph.latentCriticalChain[0];
    const rootStr = String(graph.rootCauseKind);
    if (latentRoot && !rootStr.startsWith('latent_')) {
      const hasLatent = graph.nodes.some((n) => n.isLatent);
      const hasObservableRoot = graph.nodes.some((n) => n.kind === graph.rootCauseKind);
      if (hasLatent && hasObservableRoot) {
        contradictions.push({
          kind: 'conflicting_latent_path',
          detailJa: `latent root ${latentRoot} vs observable ${graph.rootCauseKind}`,
          edgeKeys: [],
          quarantined: true,
        });
      }
    }
  }

  return contradictions;
}

export function applyContradictionQuarantine(
  graph: RuntimeCausalGraph,
  contradictions: CausalContradiction[],
): RuntimeCausalGraph {
  if (contradictions.length === 0) return graph;
  const quarantined = new Set(
    contradictions.filter((c) => c.quarantined).flatMap((c) => c.edgeKeys),
  );
  const edges = graph.edges.map((e) => {
    const key = `${e.from}->${e.to}`;
    if (!quarantined.has(key) && !contradictions.some((c) => c.quarantined && e.edgeStability === 'unstable')) {
      return e;
    }
    return {
      ...e,
      confidence: e.confidence * 0.65,
      edgeStability: 'unstable' as const,
    };
  });
  return { ...graph, edges };
}
