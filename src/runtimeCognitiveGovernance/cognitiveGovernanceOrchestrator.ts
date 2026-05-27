import type {
  RuntimeCognitiveGovernanceObserveInput,
  RuntimeCognitiveGovernanceTimelineEntry,
} from '../types/runtimeCognitiveGovernance';
import {
  buildCognitiveGovernanceProfile,
  scoreDashboardCognitiveLoad,
  scoreGovernanceAbstractionDepth,
  scoreMetricInterpretationDifficulty,
  scoreObserverAttentionFragmentation,
  scoreOperatorDecisionLatencyRisk,
  scoreReplayNarrativeComplexity,
  scoreSignalPriorityDrift,
  scoreTimelineContextLossRisk,
} from './cognitiveMetricScorers';
import { recordCognitiveGovernanceTimeline } from './cognitiveGovernanceTimeline';

export type CognitiveGovernanceFlowResult = {
  flow: RuntimeCognitiveGovernanceTimelineEntry['flow'];
  detailJa: string;
};

export function runCognitiveGovernanceFlows(
  input: RuntimeCognitiveGovernanceObserveInput,
): CognitiveGovernanceFlowResult[] {
  const profile = buildCognitiveGovernanceProfile(input);
  const results: CognitiveGovernanceFlowResult[] = [
    {
      flow: 'cognitive_load_flow',
      detailJa: `load ${scoreDashboardCognitiveLoad(input)} · difficulty ${scoreMetricInterpretationDifficulty(input)}`,
    },
    {
      flow: 'semantic_signal_ranking',
      detailJa: `priority drift ${scoreSignalPriorityDrift(input)} · noise ${profile.semanticNoiseRatio}`,
    },
    {
      flow: 'narrative_coherence',
      detailJa: `continuity ${profile.narrativeContinuity} · divergence ${profile.semanticDivergence}`,
    },
    {
      flow: 'governance_abstraction',
      detailJa: `depth ${scoreGovernanceAbstractionDepth(input)} · drift ${profile.governanceDrift}`,
    },
    {
      flow: 'attention_fragmentation',
      detailJa: `attention ${scoreObserverAttentionFragmentation(input)} · context ${profile.observerContextDecay}`,
    },
    {
      flow: 'replay_complexity',
      detailJa: `replay ${scoreReplayNarrativeComplexity(input)} · amplification ${profile.recursiveMeaningAmplification}`,
    },
    {
      flow: 'timeline_context_loss',
      detailJa: `context loss ${scoreTimelineContextLossRisk(input)} · events ${input.timelineEventCount}`,
    },
    {
      flow: 'operator_latency',
      detailJa: `operator latency ${scoreOperatorDecisionLatencyRisk(input)} · ${input.operatorInteractionLatencyMs}ms`,
    },
    {
      flow: 'cognitive_governance_record',
      detailJa: 'semantic suggestions recorded (observe-only)',
    },
  ];
  for (const result of results) recordCognitiveGovernanceTimeline(result.flow, result.detailJa);
  return results;
}
