/**
 * Runtime latent state inference — P(state|evidence) from causal graph + signals.
 */
import type {
  CausalEdge,
  CausalEventNode,
  RuntimeCausalGraph,
} from '../../types/runtimeCausalGraph';
import type {
  InferredLatentState,
  LatentEvidenceSignal,
  LatentStateInferenceInput,
  LatentStateInferenceResult,
  LatentStatePersistence,
  LatentSupportingEvidence,
  LatentRuntimeStateKind,
} from '../../types/runtimeLatentStateInference';
import {
  CAUSAL_KIND_TO_EVIDENCE,
  LATENT_STATE_CRITICAL_POSTERIOR,
  LATENT_STATE_MODELS,
  LATENT_STATE_POSTERIOR_THRESHOLD,
  LATENT_SUSTAINED_MIN_MS,
  LATENT_SUSTAINED_MIN_OBSERVATIONS,
  LATENT_TRANSIENT_MAX_MS,
  RUNTIME_LATENT_STATE_INFERENCE_VERSION,
} from '../../constants/runtimeLatentStateInference';
import { MARKOV_PRIOR_BLEND, transitionProbability } from '../../constants/hierarchicalLatentRuntimeGraph';
import {
  applyEscalationToStates,
  resolveEscalationLevel,
} from './hierarchicalLatentRuntimeGraph';
import {
  POST_SOAK_FAIL_DELAYED_RESUME_MS,
  POST_SOAK_FAIL_TIMER_DRIFT_MS,
} from '../../constants/postSoakAnalysis';
import { REDMI_SOAK_RECONNECT_STORM_PER_MIN } from '../../constants/redmiLongSoakValidation';

export type EvidenceContext = {
  active: Set<LatentEvidenceSignal>;
  details: LatentSupportingEvidence[];
  nowMs: number;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function countKind(nodes: CausalEventNode[], kind: string): number {
  return nodes.filter((n) => n.kind === kind && !n.isLatent).length;
}

function buildEvidenceContext(input: LatentStateInferenceInput): EvidenceContext {
  const { graph, raw } = input;
  const active = new Set<LatentEvidenceSignal>();
  const details: LatentSupportingEvidence[] = [];
  const observable = graph.nodes.filter((n) => !n.isLatent);

  for (const n of observable) {
    const sig = CAUSAL_KIND_TO_EVIDENCE[n.kind];
    if (sig) {
      active.add(sig);
      details.push({
        signal: sig,
        weight: 1,
        detailJa: n.detailJa,
        sourceNodeId: n.id,
      });
    }
  }

  const miui = raw?.miui;
  if (miui && miui.timerDriftMs >= POST_SOAK_FAIL_TIMER_DRIFT_MS) {
    active.add('timer_drift');
    details.push({
      signal: 'timer_drift',
      weight: clamp01(miui.timerDriftMs / 5000),
      detailJa: `MIUI timer drift ${miui.timerDriftMs}ms`,
    });
  }
  if (miui && miui.resumeLatencyMs >= POST_SOAK_FAIL_DELAYED_RESUME_MS) {
    active.add('delayed_resume');
    details.push({
      signal: 'delayed_resume',
      weight: clamp01(miui.resumeLatencyMs / 6000),
      detailJa: `resume latency ${miui.resumeLatencyMs}ms`,
    });
  }
  if (miui && miui.silentDisconnectCount >= 1) {
    active.add('silent_disconnect');
    details.push({
      signal: 'silent_disconnect',
      weight: Math.min(1, miui.silentDisconnectCount / 3),
      detailJa: `silent disconnect ×${miui.silentDisconnectCount}`,
    });
  }

  for (const cp of raw?.checkpoints ?? []) {
    if (cp.reconnectPerMin >= REDMI_SOAK_RECONNECT_STORM_PER_MIN) {
      active.add('reconnect_storm');
      details.push({
        signal: 'reconnect_storm',
        weight: clamp01(cp.reconnectPerMin / 8),
        detailJa: `checkpoint storm ${cp.reconnectPerMin}/min`,
      });
    }
    if (cp.asyncQueueLagMs >= 200) {
      active.add('async_saturation');
      details.push({
        signal: 'async_saturation',
        weight: clamp01(cp.asyncQueueLagMs / 500),
        detailJa: `async lag ${cp.asyncQueueLagMs}ms`,
      });
    }
  }

  const weakEdges = graph.edges.filter((e) => e.decayStatus === 'stale' || e.temporalWeight < 0.45);
  const strongEdges = graph.edges.filter((e) => e.decayStatus === 'strong' && e.confidence >= 0.75);
  if (weakEdges.length >= 2) {
    active.add('causal_chain_weak');
    details.push({
      signal: 'causal_chain_weak',
      weight: clamp01(weakEdges.length / 5),
      detailJa: `${weakEdges.length} temporally stale causal edges`,
    });
  }
  if (strongEdges.length >= 2) {
    active.add('causal_chain_strong');
    details.push({
      signal: 'causal_chain_strong',
      weight: clamp01(strongEdges.length / 4),
      detailJa: `${strongEdges.length} strong causal edges`,
    });
  }

  if (countKind(observable, 'reconnect_storm') >= 1 || countKind(observable, 'reconnect_schedule') >= 3) {
    active.add('reconnect_storm');
  }

  return {
    active,
    details,
    nowMs: input.nowMs ?? Date.now(),
  };
}

function markovAdjustedPrior(
  state: LatentRuntimeStateKind,
  basePrior: number,
  previous?: InferredLatentState[],
): number {
  if (!previous?.length) return basePrior;
  const prev = [...previous].sort((a, b) => b.posterior - a.posterior)[0];
  const p = transitionProbability(prev.state, state);
  return basePrior * (1 - MARKOV_PRIOR_BLEND) + Math.max(p, 0.02) * MARKOV_PRIOR_BLEND;
}

function logScore(
  prior: number,
  ctx: EvidenceContext,
  model: (typeof LATENT_STATE_MODELS)[0],
  previous?: InferredLatentState[],
): number {
  const adjPrior = markovAdjustedPrior(model.state, prior, previous);
  let logP = Math.log(Math.max(adjPrior, 1e-6));
  for (const [signal, ll] of Object.entries(model.likelihoods) as [LatentEvidenceSignal, number][]) {
    if (!ctx.active.has(signal)) continue;
    const ev = ctx.details.find((d) => d.signal === signal);
    const w = ev?.weight ?? 1;
    logP += ll * w;
  }
  return logP;
}

function softmaxNormalize(scores: { state: LatentRuntimeStateKind; logP: number }[]): Map<LatentRuntimeStateKind, number> {
  const maxLog = Math.max(...scores.map((s) => s.logP));
  const exps = scores.map((s) => ({ state: s.state, v: Math.exp(s.logP - maxLog) }));
  const sum = exps.reduce((a, b) => a + b.v, 0);
  const out = new Map<LatentRuntimeStateKind, number>();
  for (const e of exps) {
    out.set(e.state, sum > 0 ? e.v / sum : 0);
  }
  return out;
}

function resolvePersistence(
  state: LatentRuntimeStateKind,
  posterior: number,
  ctx: EvidenceContext,
  previous?: InferredLatentState[],
): { persistence: LatentStatePersistence; firstSeenAt: string; lastSeenAt: string; observationTicks: number } {
  const nowIso = new Date(ctx.nowMs).toISOString();
  const prev = previous?.find((p) => p.state === state);
  const observationTicks = (prev?.observationTicks ?? 0) + (posterior >= LATENT_STATE_POSTERIOR_THRESHOLD ? 1 : 0);
  const firstSeenAt = prev?.firstSeenAt ?? nowIso;
  const lastSeenAt = nowIso;
  const spanMs = ctx.nowMs - Date.parse(firstSeenAt);

  let persistence: LatentStatePersistence = 'transient';
  if (
    observationTicks >= LATENT_SUSTAINED_MIN_OBSERVATIONS &&
    spanMs >= LATENT_SUSTAINED_MIN_MS &&
    posterior >= LATENT_STATE_POSTERIOR_THRESHOLD
  ) {
    persistence = 'sustained';
  } else if (spanMs > LATENT_TRANSIENT_MAX_MS && posterior >= LATENT_STATE_POSTERIOR_THRESHOLD) {
    persistence = 'sustained';
  }

  return { persistence, firstSeenAt, lastSeenAt, observationTicks };
}

function evidenceForState(
  state: LatentRuntimeStateKind,
  ctx: EvidenceContext,
): LatentSupportingEvidence[] {
  const model = LATENT_STATE_MODELS.find((m) => m.state === state)!;
  return ctx.details.filter((d) => model.likelihoods[d.signal] != null && ctx.active.has(d.signal));
}

function isCritical(state: InferredLatentState): boolean {
  const highImpact: LatentRuntimeStateKind[] = [
    'reconnect_feedback_loop',
    'hydration_deadlock_risk',
    'ownership_desync',
  ];
  return (
    state.posterior >= LATENT_STATE_CRITICAL_POSTERIOR ||
    (state.persistence === 'sustained' &&
      state.posterior >= 0.65 &&
      highImpact.includes(state.state))
  );
}

/**
 * Approximate P(state | evidence) via log-prior + log-likelihood sum, softmax normalized.
 */
export function inferLatentRuntimeStates(input: LatentStateInferenceInput): LatentStateInferenceResult {
  const ctx = buildEvidenceContext(input);
  const logScores = LATENT_STATE_MODELS.map((m) => ({
    state: m.state,
    logP: logScore(m.prior, ctx, m, input.previous),
  }));
  const posteriors = softmaxNormalize(logScores);

  const states: InferredLatentState[] = [];
  for (const m of LATENT_STATE_MODELS) {
    const posterior = posteriors.get(m.state) ?? 0;
    if (posterior < LATENT_STATE_POSTERIOR_THRESHOLD) continue;

    const persistenceMeta = resolvePersistence(m.state, posterior, ctx, input.previous);
    const supportingEvidence = evidenceForState(m.state, ctx);
    const draft: InferredLatentState = {
      state: m.state,
      confidence: Math.round(posterior * 1000) / 1000,
      posterior,
      prior: markovAdjustedPrior(m.state, m.prior, input.previous),
      ...persistenceMeta,
      supportingEvidence,
      critical: false,
    };
    draft.escalation = resolveEscalationLevel(draft);
    draft.critical = draft.escalation === 'critical';
    states.push(draft);
  }

  const escalated = applyEscalationToStates(states);
  escalated.sort((a, b) => b.posterior - a.posterior);

  const posteriorByState: Partial<Record<LatentRuntimeStateKind, number>> = {};
  for (const [k, v] of posteriors) {
    posteriorByState[k] = Math.round(v * 1000) / 1000;
  }

  return {
    version: RUNTIME_LATENT_STATE_INFERENCE_VERSION,
    builtAt: new Date(ctx.nowMs).toISOString(),
    states: escalated,
    posteriorByState,
    dominantState: escalated[0]?.state ?? null,
    overallConfidence: escalated[0]?.confidence ?? 0,
    markovPriorApplied: (input.previous?.length ?? 0) > 0,
  };
}

let latentNodeSeq = 0;

function latentKindToNodeKind(state: LatentRuntimeStateKind): CausalEventNode['kind'] {
  return `latent_${state}` as CausalEventNode['kind'];
}

/** Insert inferred latent states as graph nodes with edges from supporting observables. */
export function mergeLatentStatesIntoCausalGraph(
  graph: RuntimeCausalGraph,
  inference: LatentStateInferenceResult,
): RuntimeCausalGraph {
  latentNodeSeq = 0;
  const nodes = [...graph.nodes];
  const edges: CausalEdge[] = [...graph.edges];
  let edgeSeq = edges.length;

  for (const ls of inference.states) {
    latentNodeSeq += 1;
    const id = `latent-${ls.state}-${latentNodeSeq}`;
    const kind = latentKindToNodeKind(ls.state);
    const at = ls.lastSeenAt;
    const sortKey = Date.parse(at);

    nodes.push({
      id,
      kind,
      at,
      sortKey: Number.isFinite(sortKey) ? sortKey : Date.now(),
      detailJa: `${ls.state} P=${Math.round(ls.posterior * 100)}% (${ls.escalation ?? ls.persistence})`,
      rootPriority: 58,
      cascadeOnly: true,
      isLatent: true,
      latentState: ls.state,
      latentCritical: ls.critical,
      latentEscalation: ls.escalation,
      latentRecovered: ls.recovered,
    });

    for (const ev of ls.supportingEvidence) {
      if (!ev.sourceNodeId) continue;
      edgeSeq += 1;
      edges.push({
        id: `le-${edgeSeq}`,
        from: ev.sourceNodeId,
        to: id,
        relation: 'evidence→latent',
        confidence: ls.confidence * ev.weight,
        gapMs: 0,
        causalRuleWeight: ls.prior,
        temporalWeight: ev.weight,
        replayConsistency: 0.8,
        ownershipConsistency: 0.8,
        decayStatus: 'strong',
      });
    }

    const downstream = latentDownstreamKinds(ls.state);
    for (const obs of nodes.filter((n) => !n.isLatent && downstream.includes(n.kind))) {
      edgeSeq += 1;
      edges.push({
        id: `le-${edgeSeq}`,
        from: id,
        to: obs.id,
        relation: 'latent→observable',
        confidence: ls.confidence * 0.85,
        gapMs: Math.max(0, obs.sortKey - sortKey),
        causalRuleWeight: 0.7,
        temporalWeight: 0.75,
        replayConsistency: 0.75,
        ownershipConsistency: 0.75,
        decayStatus: 'moderate',
        edgeClass: 'latent_evidence',
      });
    }
  }

  return { ...graph, nodes, edges };
}

function latentDownstreamKinds(state: LatentRuntimeStateKind): string[] {
  const map: Record<LatentRuntimeStateKind, string[]> = {
    scheduler_frozen: ['delayed_resume', 'timer_drift', 'event_loop_lag'],
    timer_suspended: ['timer_drift', 'delayed_resume'],
    bridge_congested: ['event_loop_lag', 'async_saturation'],
    hydration_deadlock_risk: ['hydration_lock_overlap', 'duplicate_schedule', 'duplicate_socket'],
    reconnect_feedback_loop: ['reconnect_storm', 'duplicate_socket', 'reconnect_schedule'],
    ownership_desync: ['ownership_violation', 'duplicate_socket'],
    async_queue_starvation: ['async_saturation', 'event_loop_lag'],
  };
  return map[state];
}

export function formatLatentStateMarkdown(inference: LatentStateInferenceResult): string {
  const lines = [
    `# Latent runtime states v${inference.version}`,
    '',
    `**Built:** ${inference.builtAt}`,
    `**Dominant:** ${inference.dominantState ?? 'none'} (${Math.round(inference.overallConfidence * 100)}%)`,
    '',
  ];
  if (inference.states.length === 0) {
    lines.push('_No latent states above posterior threshold._');
    return lines.join('\n');
  }
  for (const s of inference.states) {
    lines.push(
      `## ${s.state}${s.escalation === 'critical' ? ' ⚠ critical' : ''}`,
      `- Posterior: ${Math.round(s.posterior * 100)}% · prior ${s.prior} · ${s.escalation ?? s.persistence}`,
      `- Observations: ${s.observationTicks} (${s.firstSeenAt} → ${s.lastSeenAt})`,
      '- Evidence:',
    );
    for (const ev of s.supportingEvidence) {
      lines.push(`  - \`${ev.signal}\` ${ev.detailJa}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
