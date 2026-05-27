import type { RuntimeCrossStackCompressionObserveInput } from '../types/runtimeCrossStackCompression';
import { scoreSignalCompressionRatio, scoreCrossStackCompression } from './compressionRatioEngine';
import { scoreTelemetryDedupRatio } from './telemetryDeduplicator';
import { scoreObserverDedupRatio } from './observerDeduplicationAnalyzer';
import { trackReplayDedup } from './replayDeduplicationTracker';
import { scoreClusteredSignals } from './signalClusteringEngine';
import { registerStackSignals } from './stackSignalRegistry';
import { buildStackTopology } from './stackTopologyBuilder';
import { buildAmplificationHeatmap } from './amplificationHeatmapBuilder';
import { recordCompressionTimeline } from './compressionTimeline';

export function runCompressionFlows(input: RuntimeCrossStackCompressionObserveInput): void {
  registerStackSignals(input);
  recordCompressionTimeline('cross_stack_compression', `ratio ${scoreSignalCompressionRatio(input)}`);
  recordCompressionTimeline('telemetry_deduplication', `dedup ${scoreTelemetryDedupRatio(input)}`);
  recordCompressionTimeline('signal_clustering', `cluster ${scoreClusteredSignals(input)}`);
  recordCompressionTimeline('observer_deduplication', `obs ${scoreObserverDedupRatio(input)}`);
  recordCompressionTimeline('replay_deduplication', `replay ${trackReplayDedup(1)}`);
  recordCompressionTimeline('stack_topology', `nodes ${buildStackTopology(input.stackCount).length}`);
  recordCompressionTimeline('amplification_heatmap', `heat ${buildAmplificationHeatmap(input).length}`);
  recordCompressionTimeline('compression_ratio', `score ${scoreCrossStackCompression(input)}`);
}
