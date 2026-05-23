/**
 * Runtime temporal causality weighting — edge confidence from time distance + burst collapse.
 */
import type { CausalEventKind, CausalEventNode } from '../../types/runtimeCausalGraph';
import type {
  CompositeEdgeConfidenceInput,
  TemporalDecayStatus,
  TemporalEdgeWeightInput,
  TemporalEdgeWeightResult,
} from '../../types/runtimeTemporalCausality';
import {
  BURST_COLLAPSE_DEFAULT_MS,
  BURST_COLLAPSE_WINDOW_MS,
  EDGE_CONFIDENCE_WEIGHTS,
  TEMPORAL_DECAY_DEFAULT,
  TEMPORAL_DECAY_WINDOWS,
} from '../../constants/runtimeTemporalCausality';

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function decayWindowFor(from: CausalEventKind, to: CausalEventKind) {
  return (
    TEMPORAL_DECAY_WINDOWS.find((w) => w.from === from && w.to === to) ?? {
      from,
      to,
      ...TEMPORAL_DECAY_DEFAULT,
    }
  );
}

function classifyDecayStatus(temporalConfidence: number, gapMs: number, strongMs: number): TemporalDecayStatus {
  if (gapMs <= strongMs) return 'strong';
  if (temporalConfidence >= 0.75) return 'moderate';
  if (temporalConfidence >= 0.4) return 'weak';
  return 'stale';
}

/**
 * Temporal confidence from source→target gap and per-pair decay window.
 */
export function computeTemporalEdgeWeight(input: TemporalEdgeWeightInput): TemporalEdgeWeightResult {
  const gapMs = input.targetTimestampMs - input.sourceTimestampMs;
  const baseWindow = decayWindowFor(input.fromKind, input.toKind);
  const window = input.decayOverride
    ? {
        ...baseWindow,
        strongMs: input.decayOverride.strongMs,
        maxMs: input.decayOverride.maxMs,
        minWeight: input.decayOverride.minWeight ?? baseWindow.minWeight,
      }
    : baseWindow;

  if (gapMs <= 0) {
    return {
      temporalConfidence: 0,
      gapMs,
      decayStatus: 'stale',
      strongMs: window.strongMs,
      maxMs: window.maxMs,
    };
  }

  if (gapMs <= window.strongMs) {
    return {
      temporalConfidence: 1,
      gapMs,
      decayStatus: 'strong',
      strongMs: window.strongMs,
      maxMs: window.maxMs,
    };
  }

  if (gapMs > window.maxMs) {
    return {
      temporalConfidence: 0,
      gapMs,
      decayStatus: 'stale',
      strongMs: window.strongMs,
      maxMs: window.maxMs,
    };
  }

  const span = window.maxMs - window.strongMs;
  const t = (gapMs - window.strongMs) / span;
  const temporalConfidence = clamp01(1 - t * (1 - window.minWeight));
  return {
    temporalConfidence,
    gapMs,
    decayStatus: classifyDecayStatus(temporalConfidence, gapMs, window.strongMs),
    strongMs: window.strongMs,
    maxMs: window.maxMs,
  };
}

export function synthesizeEdgeConfidence(input: CompositeEdgeConfidenceInput): number {
  const w = EDGE_CONFIDENCE_WEIGHTS;
  const blended =
    input.causalRuleWeight * w.causalRule +
    input.temporalWeight * w.temporal +
    input.replayConsistency * w.replay +
    input.ownershipConsistency * w.ownership;
  const product =
    Math.pow(clamp01(input.causalRuleWeight), w.causalRule) *
    Math.pow(clamp01(input.temporalWeight), w.temporal) *
    Math.pow(clamp01(input.replayConsistency), w.replay) *
    Math.pow(clamp01(input.ownershipConsistency), w.ownership);
  return Math.round(clamp01(blended * 0.55 + product * 0.45) * 1000) / 1000;
}

export function computeReplayConsistency(
  from: CausalEventNode,
  to: CausalEventNode,
  fromKind: CausalEventKind,
  toKind: CausalEventKind,
): number {
  if (from.reconnectUuid && to.reconnectUuid) {
    return from.reconnectUuid === to.reconnectUuid ? 1 : 0.35;
  }
  if (
    (fromKind === 'reconnect_schedule' && toKind === 'reconnect_execute') ||
    (fromKind === 'resume' && toKind === 'reconnect_schedule')
  ) {
    return from.sortKey <= to.sortKey ? 0.85 : 0.4;
  }
  if (from.sortKey === to.sortKey) return 0.9;
  return 0.75;
}

export function computeOwnershipConsistency(
  from: CausalEventNode,
  to: CausalEventNode,
  fromKind: CausalEventKind,
  toKind: CausalEventKind,
): number {
  const ownershipKinds: CausalEventKind[] = [
    'ownership_violation',
    'duplicate_socket',
    'duplicate_schedule',
  ];
  if (!ownershipKinds.includes(fromKind) && !ownershipKinds.includes(toKind)) {
    return 0.8;
  }
  if (fromKind === 'ownership_violation' && toKind === 'duplicate_socket') {
    if (from.reconnectUuid && to.reconnectUuid && from.reconnectUuid === to.reconnectUuid) return 1;
    return 0.55;
  }
  if (from.source && to.source && from.source === to.source) return 0.95;
  return 0.6;
}

/** Coalesce same-kind bursts within per-kind windows to limit storm graph size. */
export function collapseEventBursts(nodes: CausalEventNode[]): CausalEventNode[] {
  const sorted = [...nodes].sort((a, b) => a.sortKey - b.sortKey);
  const out: CausalEventNode[] = [];

  let i = 0;
  while (i < sorted.length) {
    const head = sorted[i];
    const windowMs = BURST_COLLAPSE_WINDOW_MS[head.kind] ?? BURST_COLLAPSE_DEFAULT_MS;
    const burst: CausalEventNode[] = [head];
    let j = i + 1;
    while (j < sorted.length && sorted[j].kind === head.kind && sorted[j].sortKey - head.sortKey <= windowMs) {
      burst.push(sorted[j]);
      j += 1;
    }

    if (burst.length === 1) {
      out.push(head);
    } else {
      const rep = burst[0];
      out.push({
        ...rep,
        detailJa: `${rep.detailJa} [burst×${burst.length}]`,
      });
    }
    i = j;
  }

  return out;
}

export function rootTemporalSupportScore(
  nodeId: string,
  edges: { from: string; to: string; temporalWeight: number; decayStatus: TemporalDecayStatus }[],
): number {
  const outs = edges.filter((e) => e.from === nodeId);
  if (outs.length === 0) return 1;
  const best = Math.max(...outs.map((e) => e.temporalWeight));
  const staleCount = outs.filter((e) => e.decayStatus === 'stale').length;
  return clamp01(best - staleCount * 0.15);
}
