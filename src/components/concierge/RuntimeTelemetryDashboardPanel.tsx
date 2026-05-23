import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TELEMETRY_UI_LABELS_JA } from '../../constants/runtimeTelemetry';
import { KILL_RISK_LABELS_JA, NATIVE_UI_LABELS_JA } from '../../constants/nativeRuntimeBridge';
import type { RuntimeTelemetryDashboardBundle } from '../../types/runtimeTelemetry';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';
import { bundlePropsEqual } from './memoDashboardProps';
import { selectRuntimeKernelSnapshot } from '../../runtime/kernel/runtimeKernelSelectors';

type Props = {
  bundle: RuntimeTelemetryDashboardBundle;
};

function RuntimeTelemetryDashboardPanelInner({ bundle }: Props) {
  const ev = bundle.evaluation;
  const m = ev.metrics;
  const kernelSnap = selectRuntimeKernelSnapshot();
  const orch = kernelSnap?.orchestrator ?? bundle.orchestrator;
  const nativeExt = bundle.nativeExtension;
  const compact = ev.compactDashboard || orch?.policy.minimalUiMode === true;

  const thermalLabel = useMemo(() => m.thermalState, [m.thermalState]);

  return (
    <View style={styles.wrap} testID="concierge-runtime-telemetry-dashboard-panel">
      <Text style={styles.title}>{TELEMETRY_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>
      {bundle.startupAnomalyJa ? (
        <SelectableText style={styles.anomaly}>
          {TELEMETRY_UI_LABELS_JA.startupAnomaly}: {bundle.startupAnomalyJa}
        </SelectableText>
      ) : null}
      {compact ? (
        <Text style={styles.compactHint}>{TELEMETRY_UI_LABELS_JA.compactHint}</Text>
      ) : null}

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>状態</Text>
        <Text style={styles.scoreValue}>{ev.stateLabelJa}</Text>
      </View>
      {orch ? (
        <>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>{TELEMETRY_UI_LABELS_JA.orchestratorState}</Text>
            <Text style={styles.scoreValue}>{orch.stateLabelJa}</Text>
          </View>
          <Metric
            label={TELEMETRY_UI_LABELS_JA.queuePressure}
            value={`${orch.queuePressurePct}%`}
          />
          <Metric
            label={TELEMETRY_UI_LABELS_JA.aiSuppression}
            value={orch.aiSuppressionActive ? 'ON' : 'off'}
          />
          <Metric
            label={TELEMETRY_UI_LABELS_JA.survivalActivations}
            value={`${orch.survivalActivationCount}`}
          />
          {!compact && orch.transitionHistory.length > 0 ? (
            <SelectableText style={styles.detailLine}>
              {TELEMETRY_UI_LABELS_JA.transitionHistory}:{' '}
              {orch.transitionHistory
                .slice(-3)
                .map((t) => `${t.from}→${t.to}`)
                .join(' · ')}
            </SelectableText>
          ) : null}
        </>
      ) : null}
      <SelectableText style={styles.summary}>{ev.summaryJa}</SelectableText>
      {orch && !compact ? (
        <SelectableText style={styles.detailLine}>{orch.summaryJa}</SelectableText>
      ) : null}

      <View style={styles.metricsGrid}>
        <Metric label={TELEMETRY_UI_LABELS_JA.fps} value={`${m.renderFPS}`} />
        <Metric label={TELEMETRY_UI_LABELS_JA.droppedFrames} value={`${m.droppedFrames}`} />
        <Metric
          label={TELEMETRY_UI_LABELS_JA.eventLoopLatency}
          value={`${m.eventLoopLatencyMs}`}
        />
        <Metric label={TELEMETRY_UI_LABELS_JA.wsRtt} value={`${m.websocketRttMs}`} />
        <Metric
          label={TELEMETRY_UI_LABELS_JA.hydrationMs}
          value={m.hydrationDurationMs == null ? '—' : `${m.hydrationDurationMs}`}
        />
        <Metric label={TELEMETRY_UI_LABELS_JA.asyncQueueDepth} value={`${m.asyncQueueDepth}`} />
        <Metric label={TELEMETRY_UI_LABELS_JA.thermal} value={thermalLabel} />
        <Metric label={TELEMETRY_UI_LABELS_JA.memoryTrend} value={`${m.memoryTrendPct}%`} />
        <Metric label={TELEMETRY_UI_LABELS_JA.runtimeMode} value={m.runtimeModeLabelJa} />
      </View>

      {nativeExt ? (
        <>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>{NATIVE_UI_LABELS_JA.nativeVsHeuristic}</Text>
            <Text style={styles.scoreValue}>
              {nativeExt.bridgeAvailable ? 'native' : 'heuristic'} ({nativeExt.nativeCoveragePct}%)
            </Text>
          </View>
          <Metric
            label={NATIVE_UI_LABELS_JA.killRisk}
            value={`${KILL_RISK_LABELS_JA[nativeExt.killPrediction.level]} (${nativeExt.killPrediction.score})`}
          />
          <Metric
            label={NATIVE_UI_LABELS_JA.anrRisk}
            value={`${nativeExt.anrRisk.anrRiskScore}`}
          />
          <Metric
            label={NATIVE_UI_LABELS_JA.miuiEvents}
            value={`${nativeExt.miuiReclaimEvents}`}
          />
          <Metric
            label={NATIVE_UI_LABELS_JA.memoryClass}
            value={`${nativeExt.memoryClass.memoryClassMb}MB${nativeExt.memoryClass.lowRamDevice ? ' low-RAM' : ''}`}
          />
        </>
      ) : null}

      {!compact ? (
        <View style={styles.detailBlock}>
          <SelectableText style={styles.detailLine}>
            JS heap ~{m.jsHeapEstimateMb}MB · resume{' '}
            {m.foregroundResumeDurationMs == null ? '—' : `${m.foregroundResumeDurationMs}ms`}
          </SelectableText>
          <SelectableText style={styles.detailLine}>
            MIUI reclaim: {m.native.miuiAggressiveReclaim ? 'detected' : 'none'} · WS jitter{' '}
            {m.websocket.jitterScore}
          </SelectableText>
          {nativeExt && !nativeExt.bridgeAvailable ? (
            <SelectableText style={styles.detailLine}>
              {NATIVE_UI_LABELS_JA.bridgeUnavailable}
            </SelectableText>
          ) : null}
          {nativeExt && nativeExt.lifecycleTimeline.length > 0 ? (
            <SelectableText style={styles.detailLine}>
              {NATIVE_UI_LABELS_JA.lifecycleTimeline}:{' '}
              {nativeExt.lifecycleTimeline
                .slice(-6)
                .map((e) => `${e.kind}@${e.at.slice(11, 19)}`)
                .join(' · ')}
            </SelectableText>
          ) : null}
          {nativeExt ? (
            <SelectableText style={styles.detailLine}>
              {NATIVE_UI_LABELS_JA.confidenceMap}: thermal{' '}
              {Math.round(nativeExt.confidenceMap.thermal.confidence * 100)}% (
              {nativeExt.confidenceMap.thermal.source}) · mem{' '}
              {Math.round(nativeExt.confidenceMap.memoryPressure.confidence * 100)}% (
              {nativeExt.confidenceMap.memoryPressure.source})
              {nativeExt.soakModeActive
                ? ` · soak CSV ${nativeExt.soakCsvExportReady ? 'ready' : 'recording'}`
                : ''}
            </SelectableText>
          ) : null}
          <SelectableText style={styles.detailLine}>
            Long session ({m.longSession.checkpoint}): queue +{m.longSession.asyncQueueGrowthTrend}{' '}
            · orch slowdown {m.longSession.orchestrationSlowdownPct}%
          </SelectableText>
          <SelectableText style={styles.detailLine}>
            Tuning: FPS cap {ev.tuning.maxDashboardFps} · concurrency {ev.tuning.asyncConcurrency}{' '}
            · sample {Math.round(ev.tuning.explanationSamplingRate * 100)}%
          </SelectableText>
        </View>
      ) : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export const RuntimeTelemetryDashboardPanel = memo(
  RuntimeTelemetryDashboardPanelInner,
  (prev, next) => bundlePropsEqual(prev, next),
);

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  safety: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  anomaly: {
    fontSize: 11,
    color: theme.colors.warning,
    marginBottom: theme.spacing.xs,
  },
  compactHint: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  scoreLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  scoreValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  summary: {
    fontSize: 12,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  metricCell: {
    minWidth: '30%',
    flexGrow: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  detailBlock: {
    marginTop: theme.spacing.sm,
    gap: 4,
  },
  detailLine: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
});
