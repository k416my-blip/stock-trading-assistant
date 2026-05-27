import type { ObserverRecursionTimelineEntry, RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';
import { scoreObserverRecursionFlow } from './runtimeObserverRecursionCoordinator';
import { buildObserveGraph, scoreObserverRecursionRisk } from './recursiveObserverCascadeModel';
import { scoreTelemetryAmplificationRisk } from './telemetryEchoInflationDetector';
import { scoreCircularGovernanceAmplification } from './circularGovernanceAmplificationTracker';
import { scoreObserverDependencyLock } from './observerDependencyLockDetector';
import { scoreLongSessionRecursiveDrift } from './longSessionRecursiveDriftEngine';
import { scoreCrossLayerObserveConsistency } from './crossLayerObserveConsistencyHarmonizer';
import { scoreObserveGraphComplexity } from './observeGraphComplexityAnalyzer';
import { scoreRecursiveSignalEchoRisk } from './signalEchoLoopDetector';
import { recordObserverRecursionEvolution } from './observerRecursionEvolutionCoordinator';
import { scoreRecursionDepth } from './recursionDepthAnalyzer';
import { scoreCircularObserveGraph } from './circularObserveGraphDetector';
import { monitorTelemetryAmplification } from './telemetryAmplificationMonitor';
import { registerObserverRecursionSignals } from './observerRecursionSignalRegistry';
import { scoreRuntimeObserverConfidence } from './observerRecursionConfidenceEngine';
import { recordObserverRecursionTimeline } from './observerRecursionTimeline';

export type ObserverRecursionFlowResult = {
  flow: ObserverRecursionTimelineEntry['flow'];
  detailJa: string;
};

export function runObserverRecursionFlows(input: RuntimeObserverRecursionObserveInput): ObserverRecursionFlowResult[] {
  const results: ObserverRecursionFlowResult[] = [
    {
      flow: 'observer_recursion_flow',
      detailJa: `flow ${scoreObserverRecursionFlow(input)} · risk ${scoreObserverRecursionRisk(input)}`,
    },
    {
      flow: 'recursive_observer_cascade',
      detailJa: `cascade ${buildObserveGraph(input).nodes.length} nodes`,
    },
    {
      flow: 'telemetry_echo_inflation',
      detailJa: `echo ${scoreTelemetryAmplificationRisk(input)} · monitor ${monitorTelemetryAmplification(input)}`,
    },
    {
      flow: 'circular_governance_amplification',
      detailJa: `gov ${scoreCircularGovernanceAmplification(input)} · lock ${scoreObserverDependencyLock(input)}`,
    },
    {
      flow: 'observer_dependency_lock',
      detailJa: `depth ${scoreRecursionDepth(input)} · circular ${scoreCircularObserveGraph(input)}`,
    },
    {
      flow: 'long_session_recursive_drift',
      detailJa: `drift ${scoreLongSessionRecursiveDrift(input)} · session ${input.sessionMinutes}min`,
    },
    {
      flow: 'cross_layer_observe_consistency',
      detailJa: `consistency ${scoreCrossLayerObserveConsistency(input)}`,
    },
    {
      flow: 'observe_graph_complexity',
      detailJa: `complexity ${scoreObserveGraphComplexity(input)}`,
    },
    {
      flow: 'signal_echo_loops',
      detailJa: `echo ${scoreRecursiveSignalEchoRisk(input)} · confidence ${scoreRuntimeObserverConfidence(input)}`,
    },
    {
      flow: 'observer_recursion_evolution',
      detailJa: `evolution ${recordObserverRecursionEvolution(input)}`,
    },
  ];
  registerObserverRecursionSignals(input);
  for (const r of results) recordObserverRecursionTimeline(r.flow, r.detailJa);
  return results;
}
