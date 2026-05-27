import type {
  CausalIntelligenceObserveInput,
  CausalTimelineEntry,
} from '../types/runtimeCausalIntelligence';
import { ingestObserveSignals, computeRuntimeCorrelationStrength } from './timelineCorrelationEngine';
import { identifyRootCauseCandidates } from './failureAttributionEngine';
import {
  assignWeightedRootCauses,
  mergeCorrelatedFactors,
} from './multiFactorFailureMerger';
import { reconstructCausalChain } from './causalChainReconstruction';
import { scoreCausalConfidence } from './causalConfidenceScorer';
import { noteDependency } from './runtimeEventDependencyTracker';
import {
  analyzeRecoveryRootCause,
  scoreRecoveryAttribution,
} from './recoveryRootCauseAnalyzer';
import { estimateRecoveryContribution } from './recoveryEffectivenessCausality';
import { renderCascadeChain, scoreCascadeSeverity } from './renderCascadeAnalyzer';
import {
  buildPropagationEdges,
  propagationFlowLabels,
} from './runtimePressurePropagationTracker';
import {
  computeCausalDrift,
  longSessionDegradationEdges,
  noteSessionPhase,
} from './longSessionDegradationGraph';
import { noteAnomalySample, scoreAnomalyCluster } from './runtimeAnomalyClustering';
import {
  linkObserverInteraction,
  getObserverInteractionEdges,
} from './observerInteractionGraph';
import { recordCausalTimeline } from './survivabilityCausalityTimeline';

export type CausalFlowResult = {
  flow: CausalTimelineEntry['flow'];
  detailJa: string;
};

export function runCausalReconstructionFlow(input: CausalIntelligenceObserveInput): CausalFlowResult {
  ingestObserveSignals(input);
  const correlation = computeRuntimeCorrelationStrength();
  const chain = reconstructCausalChain(input);
  const candidates = identifyRootCauseCandidates(input);
  const confidence = scoreCausalConfidence(input, candidates, correlation);
  for (let i = 0; i < chain.length - 1; i += 1) {
    noteDependency(chain[i], chain[i + 1], 0.5, 1000);
  }
  return {
    flow: 'causal_reconstruction',
    detailJa: `confidence ${confidence} · chain ${chain.join('→')} · correlation ${correlation}`,
  };
}

export function runFailureAttributionFlow(input: CausalIntelligenceObserveInput): CausalFlowResult {
  const raw = identifyRootCauseCandidates(input);
  const merged = mergeCorrelatedFactors(raw);
  const weighted = assignWeightedRootCauses(merged);
  noteAnomalySample(input);
  return {
    flow: 'failure_attribution',
    detailJa: `roots ${weighted.map((w) => `${w.id}:${w.weight}`).join(' · ') || 'none'}`,
  };
}

export function runRecoveryAttributionFlow(input: CausalIntelligenceObserveInput): CausalFlowResult {
  const path = analyzeRecoveryRootCause(input);
  const attribution = scoreRecoveryAttribution(input);
  const contribution = estimateRecoveryContribution(input);
  return {
    flow: 'recovery_attribution',
    detailJa: `attribution ${attribution} · path ${path.join('→')} · contrib ${Object.keys(contribution).length}`,
  };
}

export function runCascadeAnalysisFlow(input: CausalIntelligenceObserveInput): CausalFlowResult {
  const cascade = renderCascadeChain(input);
  const severity = scoreCascadeSeverity(input);
  const edges = buildPropagationEdges(input);
  for (const e of edges) noteDependency(e.from, e.to, e.weight, e.correlationMs);
  linkObserverInteraction('observer', 'bridge', input.observerOverheadRatio * 0.5);
  const flow = propagationFlowLabels(edges);
  void getObserverInteractionEdges();
  return {
    flow: 'cascade_analysis',
    detailJa: `severity ${severity} · cascade ${cascade.join('→')} · flow ${flow.join(' ')}`,
  };
}

export function runLongSessionDriftFlow(input: CausalIntelligenceObserveInput): CausalFlowResult {
  noteSessionPhase(input);
  const drift = computeCausalDrift();
  const degEdges = longSessionDegradationEdges(input);
  for (const e of degEdges) noteDependency(e.from, e.to, e.weight, e.correlationMs);
  return {
    flow: 'long_session_drift',
    detailJa: `drift ${drift} · cluster ${scoreAnomalyCluster()} · deg ${degEdges.length}`,
  };
}

export function runCausalIntelligenceFlows(input: CausalIntelligenceObserveInput): CausalFlowResult[] {
  const results = [
    runCausalReconstructionFlow(input),
    runFailureAttributionFlow(input),
    runRecoveryAttributionFlow(input),
    runCascadeAnalysisFlow(input),
    runLongSessionDriftFlow(input),
  ];
  for (const r of results) recordCausalTimeline(r.flow, r.detailJa);
  return results;
}
