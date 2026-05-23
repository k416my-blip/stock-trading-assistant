import type { CausalEventKind } from './runtimeCausalGraph';

export type TemporalDecayStatus = 'strong' | 'moderate' | 'weak' | 'stale';

export type TemporalEdgeWeightInput = {
  sourceTimestampMs: number;
  targetTimestampMs: number;
  fromKind: CausalEventKind;
  toKind: CausalEventKind;
  /** Override strong/max ms (adaptive decay). */
  decayOverride?: { strongMs: number; maxMs: number; minWeight?: number };
};

export type TemporalEdgeWeightResult = {
  temporalConfidence: number;
  gapMs: number;
  decayStatus: TemporalDecayStatus;
  strongMs: number;
  maxMs: number;
};

export type CompositeEdgeConfidenceInput = {
  causalRuleWeight: number;
  temporalWeight: number;
  replayConsistency: number;
  ownershipConsistency: number;
};
