import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ASYNC_UI_LABELS_JA } from '../../constants/asyncRuntimeCoordinator';
import { CASCADE_UI_LABELS_JA } from '../../constants/crossLayerCascade';
import { RUNTIME_UI_LABELS_JA } from '../../constants/runtimeSurvivalMobileResilience';
import type { RuntimeSurvivalMobileResilienceBundle } from '../../types/runtimeSurvivalMobileResilience';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';
import { bundlePropsEqual } from './memoDashboardProps';

type Props = {
  bundle: RuntimeSurvivalMobileResilienceBundle;
};

function RuntimeSurvivalDashboardPanelInner({ bundle }: Props) {
  const m = bundle.mobileRuntimeMetrics;
  const c = bundle.crossLayerCascadeMetrics;
  const a = bundle.asyncRuntimeMetrics;
  const compactCascade = c.cascadePressure >= 58 || a.eventLoopPressure >= 62;
  const resumeLabel = useMemo(
    () =>
      m.backgroundResumeRecoveryMs == null
        ? '—'
        : `${m.backgroundResumeRecoveryMs}ms`,
    [m.backgroundResumeRecoveryMs],
  );

  return (
    <View style={styles.wrap} testID="concierge-runtime-survival-dashboard-panel">
      <Text style={styles.title}>{RUNTIME_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{RUNTIME_UI_LABELS_JA.state}</Text>
        <Text style={styles.scoreValue}>{bundle.runtimeStateLabelJa}</Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.runtimeSummaryJa}</SelectableText>
      <SelectableText style={styles.schedulerMode}>
        {RUNTIME_UI_LABELS_JA.schedulerMode}: {bundle.layerSchedulerModeJa}
      </SelectableText>
      <SelectableText style={styles.schedulerMode}>{bundle.cascadeGuardSummaryJa}</SelectableText>
      <SelectableText style={styles.schedulerMode}>{bundle.asyncCoordinatorSummaryJa}</SelectableText>
      <SelectableText style={styles.schedulerMode}>
        Telemetry: {bundle.runtimeTelemetryStateLabelJa} — {bundle.runtimeTelemetrySummaryJa}
      </SelectableText>

      <Text style={styles.mobileMetricsTitle}>{ASYNC_UI_LABELS_JA.panelSection}</Text>
      <View style={styles.metricsRow}>
        <Metric
          label={ASYNC_UI_LABELS_JA.state}
          value={a.eventLoopState.replace('EVENTLOOP_', '')}
        />
        <Metric label={ASYNC_UI_LABELS_JA.eventLoopPressure} value={`${a.eventLoopPressure}%`} />
        <Metric label={ASYNC_UI_LABELS_JA.asyncQueueDepth} value={`${a.asyncQueueDepth}`} />
        <Metric label={ASYNC_UI_LABELS_JA.taskLatency} value={`${a.taskExecutionLatencyMs}`} />
        <Metric label={ASYNC_UI_LABELS_JA.renderBlockRisk} value={`${a.renderBlockRisk}%`} />
        <Metric label={ASYNC_UI_LABELS_JA.websocketFrameDelay} value={`${a.websocketFrameDelayMs}`} />
        <Metric
          label={ASYNC_UI_LABELS_JA.hydrationCollisionRisk}
          value={`${a.hydrationCollisionRisk}%`}
        />
      </View>

      <Text style={styles.mobileMetricsTitle}>{CASCADE_UI_LABELS_JA.panelSection}</Text>
      <View style={styles.metricsRow}>
        <Metric label={CASCADE_UI_LABELS_JA.state} value={c.cascadeState.replace('CASCADE_', '')} />
        <Metric label={CASCADE_UI_LABELS_JA.cascadePressure} value={`${c.cascadePressure}%`} />
        <Metric label={CASCADE_UI_LABELS_JA.crossLayerHealth} value={`${c.crossLayerHealth}%`} />
        <Metric label={CASCADE_UI_LABELS_JA.orchestrationFanout} value={`${c.orchestrationFanout}`} />
        {!compactCascade ? (
          <>
            <Metric label={CASCADE_UI_LABELS_JA.reasoningLoopRisk} value={`${c.reasoningLoopRisk}%`} />
            <Metric label={CASCADE_UI_LABELS_JA.renderCascadeRisk} value={`${c.renderCascadeRisk}%`} />
            <Metric
              label={CASCADE_UI_LABELS_JA.explanationStormRisk}
              value={`${c.explanationStormRisk}%`}
            />
          </>
        ) : null}
      </View>

      {!compactCascade ? (
        <View style={styles.metricsRow}>
          <Metric label={RUNTIME_UI_LABELS_JA.health} value={`${bundle.runtimeHealthPct}%`} />
          <Metric label={RUNTIME_UI_LABELS_JA.memory} value={`${bundle.memoryPressurePct}%`} />
          <Metric label={RUNTIME_UI_LABELS_JA.battery} value={`${bundle.batteryPressurePct}%`} />
          <Metric label={RUNTIME_UI_LABELS_JA.thermal} value={`${bundle.thermalPressurePct}%`} />
          <Metric label={RUNTIME_UI_LABELS_JA.websocket} value={`${bundle.websocketContinuityPct}%`} />
          <Metric label={RUNTIME_UI_LABELS_JA.hydration} value={`${bundle.hydrationIntegrityPct}%`} />
          <Metric label={RUNTIME_UI_LABELS_JA.processKill} value={`${bundle.processKillRiskPct}%`} />
          <Metric label={RUNTIME_UI_LABELS_JA.offline} value={`${bundle.offlineResiliencePct}%`} />
          <Metric label={RUNTIME_UI_LABELS_JA.stability} value={`${bundle.runtimeStabilityPct}%`} />
          <Metric label={RUNTIME_UI_LABELS_JA.pressure} value={`${bundle.runtimePressurePct}%`} />
        </View>
      ) : null}

      {!compactCascade ? (
        <>
          <Text style={styles.mobileMetricsTitle}>Mobile Runtime Metrics</Text>
          <View style={styles.metricsRow}>
            <Metric label={RUNTIME_UI_LABELS_JA.runtimeFps} value={`${m.runtimeFPS}`} />
            <Metric label={RUNTIME_UI_LABELS_JA.jsThreadPressure} value={`${m.jsThreadPressurePct}%`} />
            <Metric
              label={RUNTIME_UI_LABELS_JA.estimatedMemory}
              value={`${m.estimatedMemoryPressurePct}%`}
            />
            <Metric label={RUNTIME_UI_LABELS_JA.renderBurst} value={`${m.renderBurstRate}`} />
            <Metric label={RUNTIME_UI_LABELS_JA.wsReconnect} value={`${m.websocketReconnectRate}`} />
            <Metric label={RUNTIME_UI_LABELS_JA.backgroundResume} value={resumeLabel} />
          </View>
        </>
      ) : null}

      <SelectableText style={styles.footer}>
        realTradingEnabled={String(bundle.realTradingEnabled)} · survival=
        {String(bundle.survivalModeActive)} · cacheFirst={String(bundle.cacheFirstModeActive)} · budget=
        {bundle.orchestrationBudgetMax} · scheduler={m.schedulerMode}
      </SelectableText>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <SelectableText style={styles.metricValue}>{value}</SelectableText>
    </View>
  );
}

export const RuntimeSurvivalDashboardPanel = memo(
  RuntimeSurvivalDashboardPanelInner,
  bundlePropsEqual,
);

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.sm },
  safety: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs },
  scoreLabel: { fontSize: 13, color: theme.colors.textMuted },
  scoreValue: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  summary: { fontSize: 13, color: theme.colors.text, marginBottom: theme.spacing.xs },
  schedulerMode: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  mobileMetricsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  metric: { minWidth: '45%', marginBottom: theme.spacing.xs },
  metricLabel: { fontSize: 11, color: theme.colors.textMuted },
  metricValue: { fontSize: 13, color: theme.colors.text },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
