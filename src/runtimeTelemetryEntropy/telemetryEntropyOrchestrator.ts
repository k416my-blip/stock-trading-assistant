import type {
  RuntimeTelemetryEntropyObserveInput,
  TelemetryEntropyTimelineEntry,
} from '../types/runtimeTelemetryEntropy';
import { scoreSignalEntropy } from './signalEntropyScorer';
import { scoreTelemetryDuplicationRisk } from './telemetryDuplicationScorer';
import { scoreReplayAmplificationRisk } from './replayAmplificationScorer';
import { scoreMetricCascadeRisk } from './metricCascadeScorer';
import { scoreDashboardSaturationRisk } from './dashboardSaturationScorer';
import { scoreExportPayloadRisk } from './exportPayloadScorer';
import { scoreTimelineFragmentationRisk } from './timelineFragmentationScorer';
import { scoreTelemetryAging } from './telemetryAgingEngine';
import { recordTelemetryEntropyTimeline } from './telemetryEntropyTimeline';

export type TelemetryEntropyFlowResult = {
  flow: TelemetryEntropyTimelineEntry['flow'];
  detailJa: string;
};

export function runTelemetryEntropyFlows(input: RuntimeTelemetryEntropyObserveInput): TelemetryEntropyFlowResult[] {
  const aging = scoreTelemetryAging(input);
  const results: TelemetryEntropyFlowResult[] = [
    {
      flow: 'telemetry_entropy_flow',
      detailJa: `entropy ${scoreSignalEntropy(input)} · dup ${scoreTelemetryDuplicationRisk(input)}`,
    },
    {
      flow: 'signal_duplication',
      detailJa: `dup ratio ${input.duplicateSignalRatio} · kinds ${input.uniqueSignalKinds}`,
    },
    {
      flow: 'replay_amplification',
      detailJa: `replay ${scoreReplayAmplificationRisk(input)} · count ${input.replayCount}`,
    },
    {
      flow: 'export_payload_growth',
      detailJa: `export ${scoreExportPayloadRisk(input)} · ${input.exportBytesEstimate}b`,
    },
    {
      flow: 'dashboard_saturation',
      detailJa: `saturation ${scoreDashboardSaturationRisk(input)} · rows ${input.dashboardRowCount}`,
    },
    {
      flow: 'timeline_fragmentation',
      detailJa: `fragment ${scoreTimelineFragmentationRisk(input)} · events ${input.timelineEventCount}`,
    },
    {
      flow: 'telemetry_aging',
      detailJa: `stale ${aging.staleTelemetryRatio} · orphan ${aging.orphanMetricCount} · zombie ${aging.zombieReplayHookCount}`,
    },
    {
      flow: 'compression_failure_cascade',
      detailJa: `cascade ${scoreMetricCascadeRisk(input)} · compression ${input.compressionRatio}`,
    },
    {
      flow: 'signal_governance_record',
      detailJa: 'governance suggestions recorded (observe-only)',
    },
    {
      flow: 'entropy_evolution',
      detailJa: `session ${input.sessionMinutes}min`,
    },
  ];
  for (const r of results) recordTelemetryEntropyTimeline(r.flow, r.detailJa);
  return results;
}
