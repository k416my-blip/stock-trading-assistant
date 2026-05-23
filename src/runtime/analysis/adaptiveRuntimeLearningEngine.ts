/**
 * Adaptive Runtime Learning Engine — self-tuning causal / latent inference from runtime observations.
 */
import type { CausalEdge, CausalEventNode, RuntimeCausalGraph, RuntimeCausalGraphInput } from '../../types/runtimeCausalGraph';
import type {
  AdaptiveDecayWindow,
  AdaptiveRuntimeContext,
  AdaptiveRuntimeLearningState,
  AdaptiveRuntimeReport,
  DeviceProfileAdjustments,
  DeviceProfileKind,
  EdgeLearningRecord,
  LearnFromInferenceInput,
  RecoveryActionKind,
  TransitionLearningRecord,
} from '../../types/adaptiveRuntimeLearning';
import type { InferredLatentState, LatentRuntimeStateKind } from '../../types/runtimeLatentStateInference';
import {
  ADAPTIVE_RUNTIME_LEARNING_VERSION,
  DEVICE_PROFILE_SPECS,
  FALSE_POSITIVE_PENALTY,
  GAP_MAX_PERCENTILE,
  GAP_STRONG_PERCENTILE,
  HISTOGRAM_MAX_SAMPLES,
  HYSTERESIS_ENTER,
  HYSTERESIS_EXIT,
  LATENT_PERSISTENCE_BIAS,
  LEARNING_EMA_ALPHA,
  TRANSITION_LEARN_RATE,
  edgeKey,
  isProtectedEdge,
  transitionKey,
} from '../../constants/adaptiveRuntimeLearning';
import { LATENT_STATE_TRANSITIONS, transitionProbability } from '../../constants/hierarchicalLatentRuntimeGraph';
import { LATENT_STATE_POSTERIOR_THRESHOLD } from '../../constants/runtimeLatentStateInference';
import type { ObservableCausalEventKind } from '../../types/runtimeCausalGraph';
import { getAdaptiveLearningStore } from './adaptiveRuntimeLearningStorage';
import { rejectForbiddenLearningUpdate } from '../governance/safeAdaptiveConstraints';
import { shouldBlockLearningPersistence } from '../governance/sessionOverfitGuard';

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

export function resolveDeviceProfile(deviceModel?: string): DeviceProfileKind {
  const m = (deviceModel ?? '').toLowerCase();
  if (m.includes('redmi') || m.includes('xiaomi') || m.includes('poco')) return 'redmi';
  if (m.includes('samsung') || m.includes('sm-') || m.includes('galaxy')) return 'samsung';
  if (m.includes('pixel')) return 'pixel';
  if (m.includes('emulator') || m.includes('sdk') || m.includes('generic')) return 'emulator';
  return 'emulator';
}

export function createAdaptiveRuntimeContext(deviceModel?: string): AdaptiveRuntimeContext {
  const deviceProfile = resolveDeviceProfile(deviceModel);
  return {
    deviceProfile,
    store: getAdaptiveLearningStore(deviceProfile),
  };
}

function getOrCreateEdgeRecord(
  store: AdaptiveRuntimeLearningState,
  from: string,
  to: string,
  relation: string,
): EdgeLearningRecord {
  const key = edgeKey(from, to, relation);
  let rec = store.edges[key];
  if (!rec) {
    rec = {
      edgeKey: key,
      from,
      to,
      relation,
      hitCount: 0,
      successfulPredictionCount: 0,
      falsePositiveCount: 0,
      decayReliability: 1,
      runtimeLearnedWeight: 0.5,
      confidenceEma: 0.5,
      replaySupport: 0,
      stability: 0.5,
      protectedInvariant: isProtectedEdge(from, to, relation),
    };
    store.edges[key] = rec;
  }
  return rec;
}

export function recordGapObservation(
  store: AdaptiveRuntimeLearningState,
  from: ObservableCausalEventKind,
  to: ObservableCausalEventKind,
  gapMs: number,
): void {
  const key = edgeKey(from, to, 'gap');
  const hist = store.gapHistograms[key] ?? [];
  hist.push(gapMs);
  if (hist.length > HISTOGRAM_MAX_SAMPLES) hist.shift();
  store.gapHistograms[key] = hist;
}

export function getAdaptiveDecayWindow(
  from: ObservableCausalEventKind,
  to: ObservableCausalEventKind,
  ctx: AdaptiveRuntimeContext,
): AdaptiveDecayWindow {
  const spec = DEVICE_PROFILE_SPECS[ctx.deviceProfile];
  const histKey = edgeKey(from, to, 'gap');
  const hist = [...(ctx.store.gapHistograms[histKey] ?? [])].sort((a, b) => a - b);

  if (from === 'resume' && to === 'reconnect_schedule') {
    return {
      from,
      to,
      strongMs: hist.length >= 4 ? percentile(hist, GAP_STRONG_PERCENTILE) : spec.resumeReconnectStrongMs,
      maxMs: hist.length >= 4 ? percentile(hist, GAP_MAX_PERCENTILE) : spec.resumeReconnectMaxMs,
      minWeight: 0.2,
      source: hist.length >= 4 ? 'learned_histogram' : 'device_profile',
    };
  }

  if (hist.length >= 4) {
    return {
      from,
      to,
      strongMs: Math.max(100, percentile(hist, GAP_STRONG_PERCENTILE)),
      maxMs: Math.max(500, percentile(hist, GAP_MAX_PERCENTILE)),
      minWeight: 0.2,
      source: 'learned_histogram',
    };
  }

  return {
    from,
    to,
    strongMs: 2_000,
    maxMs: 45_000,
    minWeight: 0.2,
    source: 'fixed',
  };
}

export function getLearnedTransitionProbability(
  from: LatentRuntimeStateKind,
  to: LatentRuntimeStateKind,
  store: AdaptiveRuntimeLearningState,
): number {
  const key = transitionKey(from, to);
  const rec = store.transitions[key];
  const base = transitionProbability(from, to);
  if (!rec || rec.hitCount < 2) return base > 0 ? base : 0.05;
  return clamp01(rec.learnedProbability * 0.7 + base * 0.3);
}

export function recordTransitionObservation(
  store: AdaptiveRuntimeLearningState,
  from: LatentRuntimeStateKind,
  to: LatentRuntimeStateKind,
  observed: boolean,
): void {
  const key = transitionKey(from, to);
  const base = transitionProbability(from, to);
  let rec = store.transitions[key];
  if (!rec) {
    rec = {
      from,
      to,
      hitCount: 0,
      observedCount: 0,
      learnedProbability: base || 0.1,
      baseProbability: base,
    };
    store.transitions[key] = rec;
  }
  rec.hitCount += 1;
  if (observed) rec.observedCount += 1;
  const rate = rec.observedCount / Math.max(1, rec.hitCount);
  rec.learnedProbability = clamp01(
    rec.learnedProbability * (1 - TRANSITION_LEARN_RATE) + rate * TRANSITION_LEARN_RATE,
  );
}

export function synthesizeAdaptiveEdgeConfidence(
  ruleWeight: number,
  temporalWeight: number,
  replayConsistency: number,
  ownershipConsistency: number,
  edgeRec: EdgeLearningRecord,
): { confidence: number; learnedDelta: number; runtimeLearnedWeight: number } {
  const base =
    ruleWeight * 0.35 + temporalWeight * 0.35 + replayConsistency * 0.15 + ownershipConsistency * 0.15;
  const learned = edgeRec.runtimeLearnedWeight;
  const fpPenalty = edgeRec.protectedInvariant
    ? 0
    : edgeRec.falsePositiveCount * FALSE_POSITIVE_PENALTY * 0.05;
  const runtimeLearnedWeight = clamp01(learned - fpPenalty);
  const confidence = clamp01(base * 0.55 + runtimeLearnedWeight * 0.45);
  const learnedDelta = confidence - base;
  edgeRec.confidenceEma =
    edgeRec.confidenceEma * (1 - LEARNING_EMA_ALPHA) + confidence * LEARNING_EMA_ALPHA;
  return { confidence, learnedDelta, runtimeLearnedWeight };
}

export function recordEdgeOutcome(
  store: AdaptiveRuntimeLearningState,
  from: string,
  to: string,
  relation: string,
  predicted: boolean,
  success: boolean,
): void {
  if (rejectForbiddenLearningUpdate(from, to, relation) || shouldBlockLearningPersistence()) {
    return;
  }
  const rec = getOrCreateEdgeRecord(store, from, to, relation);
  rec.hitCount += 1;
  if (success) rec.successfulPredictionCount += 1;
  if (predicted && !success && !rec.protectedInvariant) {
    rec.falsePositiveCount += 1;
    rec.runtimeLearnedWeight = clamp01(rec.runtimeLearnedWeight - FALSE_POSITIVE_PENALTY);
  } else if (success) {
    rec.runtimeLearnedWeight = clamp01(
      rec.runtimeLearnedWeight + TRANSITION_LEARN_RATE * (1 - rec.runtimeLearnedWeight),
    );
  }
  rec.decayReliability = clamp01(rec.successfulPredictionCount / Math.max(1, rec.hitCount));
  rec.stability = clamp01(rec.confidenceEma * 0.6 + rec.decayReliability * 0.4);
  rec.replaySupport = clamp01(rec.hitCount / 20);
}

export function recordFalsePositive(
  store: AdaptiveRuntimeLearningState,
  edgeKeyStr: string,
  predictedRoot: string,
  actualOutcome: string,
): void {
  const existing = store.falsePositives.find((f) => f.edgeKey === edgeKeyStr);
  if (existing) {
    existing.count += 1;
    existing.penalty = clamp01(existing.count * FALSE_POSITIVE_PENALTY);
  } else {
    store.falsePositives.push({
      edgeKey: edgeKeyStr,
      predictedRoot,
      actualOutcome,
      count: 1,
      penalty: FALSE_POSITIVE_PENALTY,
    });
  }
  const rec = store.edges[edgeKeyStr];
  if (rec && !rec.protectedInvariant) {
    rec.falsePositiveCount += 1;
    rec.runtimeLearnedWeight = clamp01(rec.runtimeLearnedWeight - FALSE_POSITIVE_PENALTY);
  }
}

export function recordRecoveryOutcome(
  store: AdaptiveRuntimeLearningState,
  action: RecoveryActionKind,
  success: boolean,
): void {
  const rec = store.recovery[action];
  rec.attempts += 1;
  if (success) rec.successes += 1;
  rec.successRate = rec.successes / Math.max(1, rec.attempts);
}

export function recordRootOutcome(
  store: AdaptiveRuntimeLearningState,
  rootKind: string,
  cascadeConsistent: boolean,
): void {
  const h = store.rootRankingHistory[rootKind] ?? { count: 0, successCount: 0 };
  h.count += 1;
  if (cascadeConsistent) h.successCount += 1;
  store.rootRankingHistory[rootKind] = h;
}

export function computeAdaptiveRootScore(
  node: CausalEventNode,
  edges: CausalEdge[],
  store: AdaptiveRuntimeLearningState,
  graph: RuntimeCausalGraph,
): number {
  const base = 1000 - node.rootPriority * 10;
  const outs = edges.filter((e) => e.from === node.id);
  const temporalSupport =
    outs.length === 0 ? 1 : Math.max(...outs.map((e) => e.temporalWeight ?? 0));
  const hist = store.rootRankingHistory[node.kind] ?? { count: 0, successCount: 0 };
  const historicalSuccess = hist.count > 0 ? hist.successCount / hist.count : 0.5;
  const cascadeOk =
    graph.latentCriticalChain?.length && graph.rootCauseKind === node.kind ? 1 : 0.6;
  const replaySim = outs.reduce((s, e) => s + (e.replaySupport ?? e.replayConsistency ?? 0), 0) /
    Math.max(1, outs.length);
  return (
    base +
    temporalSupport * 40 +
    historicalSuccess * 25 +
    cascadeOk * 15 +
    replaySim * 10 -
    outs.filter((e) => e.edgeStability === 'unstable').length * 8
  );
}

export function stabilizeLatentStates(
  states: InferredLatentState[],
  previous: InferredLatentState[] | undefined,
  store: AdaptiveRuntimeLearningState,
): InferredLatentState[] {
  const prevMap = new Map(previous?.map((s) => [s.state, s]) ?? []);
  return states.map((s) => {
    const prev = prevMap.get(s.state);
    let posterior = s.posterior;
    if (prev) {
      posterior =
        posterior * (1 - LEARNING_EMA_ALPHA) + prev.posterior * LEARNING_EMA_ALPHA + LATENT_PERSISTENCE_BIAS;
      if (prev.posterior >= HYSTERESIS_ENTER && posterior < HYSTERESIS_EXIT) {
        posterior = HYSTERESIS_EXIT;
      }
    }
    posterior = clamp01(posterior);
    return {
      ...s,
      posterior,
      confidence: Math.round(posterior * 1000) / 1000,
    };
  }).filter((s) => s.posterior >= LATENT_STATE_POSTERIOR_THRESHOLD - (prevMap.has(s.state) ? 0.06 : 0));
}

export function annotateEdgesWithAdaptive(
  edges: CausalEdge[],
  store: AdaptiveRuntimeLearningState,
  nodeById: Map<string, CausalEventNode>,
): CausalEdge[] {
  return edges.map((e) => {
    const fromNode = nodeById.get(e.from);
    const toNode = nodeById.get(e.to);
    const fromKind = fromNode?.kind ?? e.from;
    const toKind = toNode?.kind ?? e.to;
    const key = edgeKey(String(fromKind), String(toKind), e.relation);
    const rec = store.edges[key] ?? getOrCreateEdgeRecord(store, String(fromKind), String(toKind), e.relation);
    const syn = synthesizeAdaptiveEdgeConfidence(
      e.causalRuleWeight,
      e.temporalWeight,
      e.replayConsistency,
      e.ownershipConsistency,
      rec,
    );
    let edgeStability: CausalEdge['edgeStability'] = 'stable';
    if (rec.falsePositiveCount >= 2 && !rec.protectedInvariant) edgeStability = 'unstable';
    if (syn.confidence >= 0.82 && rec.hitCount >= 3) edgeStability = 'learned_high';

    return {
      ...e,
      confidence: syn.confidence,
      runtimeLearnedWeight: syn.runtimeLearnedWeight,
      learnedDelta: syn.learnedDelta,
      stability: rec.stability,
      replaySupport: rec.replaySupport,
      edgeStability,
    };
  });
}

export function learnFromInference(input: LearnFromInferenceInput, ctx: AdaptiveRuntimeContext): void {
  const { graph, latentChain, predictedRootKind, recoveryActions, recoverySucceeded } = input;
  const store = ctx.store;
  store.replayCount += 1;
  store.lastUpdatedAt = new Date().toISOString();

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const e of graph.edges) {
    const from = nodeById.get(e.from);
    const to = nodeById.get(e.to);
    if (!from || to?.isLatent) continue;
    const fk = String(from.kind);
    const tk = String(to?.kind ?? '');
    recordGapObservation(store, from.kind as ObservableCausalEventKind, to!.kind as ObservableCausalEventKind, e.gapMs);
    const cascadeOk = graph.cascadeNodeIds.includes(e.to) || graph.rootCauseChain.includes(e.from);
    recordEdgeOutcome(store, fk, tk, e.relation, true, cascadeOk);
  }

  for (let i = 0; i < latentChain.length - 1; i += 1) {
    recordTransitionObservation(store, latentChain[i], latentChain[i + 1], true);
  }

  for (const def of LATENT_STATE_TRANSITIONS) {
    const active = latentChain.includes(def.from) && latentChain.includes(def.to);
    if (active) recordTransitionObservation(store, def.from, def.to, true);
  }

  const actualLeaf =
    graph.nodes.find((n) => n.kind === 'duplicate_socket' || n.kind === 'reconnect_storm')?.kind ?? null;
  if (predictedRootKind && actualLeaf && predictedRootKind !== graph.rootCauseKind) {
    recordFalsePositive(
      store,
      edgeKey(predictedRootKind, actualLeaf, 'root_mismatch'),
      predictedRootKind,
      actualLeaf,
    );
  }

  if (predictedRootKind) {
    recordRootOutcome(store, predictedRootKind, Boolean(graph.latentCriticalChain?.length));
  }

  for (const action of recoveryActions ?? []) {
    recordRecoveryOutcome(store, action, recoverySucceeded ?? false);
  }
}

export function buildDeviceSpecificAdjustments(profile: DeviceProfileKind): DeviceProfileAdjustments {
  const spec = DEVICE_PROFILE_SPECS[profile];
  return {
    profile,
    timerDriftToleranceMs: spec.timerDriftToleranceMs,
    resumeLatencyExpectationMs: spec.resumeLatencyExpectationMs,
    batterySaverAggressiveness: spec.batterySaverAggressiveness,
    decayOverrides: [
      {
        edgeKey: edgeKey('resume', 'reconnect_schedule', 'gap'),
        strongMs: spec.resumeReconnectStrongMs,
        maxMs: spec.resumeReconnectMaxMs,
      },
    ],
  };
}

export function buildAdaptiveRuntimeReport(store: AdaptiveRuntimeLearningState): AdaptiveRuntimeReport {
  const roots = Object.values(store.rootRankingHistory);
  const rootRankingStability =
    roots.length === 0
      ? 0
      : roots.reduce((s, r) => s + r.successCount / Math.max(1, r.count), 0) / roots.length;

  return {
    version: ADAPTIVE_RUNTIME_LEARNING_VERSION,
    builtAt: new Date().toISOString(),
    deviceProfile: store.deviceProfile,
    learnedTransitions: Object.values(store.transitions).sort((a, b) => b.learnedProbability - a.learnedProbability),
    unstableEdges: Object.values(store.edges).filter((e) => e.falsePositiveCount >= 2 && !e.protectedInvariant),
    falsePositiveEdges: [...store.falsePositives],
    deviceSpecificAdjustments: buildDeviceSpecificAdjustments(store.deviceProfile),
    recoverySuccessRates: Object.values(store.recovery),
    rootRankingStability: Math.round(rootRankingStability * 1000) / 1000,
    replayCount: store.replayCount,
  };
}

export function formatAdaptiveRuntimeReportMarkdown(report: AdaptiveRuntimeReport): string {
  const lines = [
    `# Adaptive Runtime Report v${report.version}`,
    '',
    `**Device profile:** ${report.deviceProfile}`,
    `**Replay count:** ${report.replayCount}`,
    `**Root stability:** ${report.rootRankingStability}`,
    '',
    '## Learned transitions',
    report.learnedTransitions
      .slice(0, 10)
      .map((t) => `- ${t.from} → ${t.to}: ${Math.round(t.learnedProbability * 100)}% (n=${t.hitCount})`)
      .join('\n') || '- none',
    '',
    '## Recovery success rates',
    report.recoverySuccessRates
      .map((r) => `- ${r.action}: ${Math.round(r.successRate * 100)}% (${r.successes}/${r.attempts})`)
      .join('\n'),
  ];
  return lines.join('\n');
}
