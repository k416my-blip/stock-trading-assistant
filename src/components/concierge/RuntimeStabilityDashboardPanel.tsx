import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { STABILITY_UI_LABELS_JA } from '../../constants/runtimeStability';
import { selectRuntimeStabilitySnapshot } from '../../runtime/stability/runtimeStabilitySelectors';
import { buildNativeBoundaryValidationReport } from '../../native/runtime/nativeBoundaryValidation';
import { theme } from '../../theme';

function RuntimeStabilityDashboardPanelInner() {
  const snap = selectRuntimeStabilitySnapshot();
  if (!snap) {
    return (
      <View style={styles.wrap} testID="runtime-stability-dashboard-panel">
        <Text style={styles.title}>{STABILITY_UI_LABELS_JA.panelTitle}</Text>
        <Text style={styles.hint}>{STABILITY_UI_LABELS_JA.readonlyHint}</Text>
        <Text style={styles.muted}>観測待ち</Text>
      </View>
    );
  }

  const m = snap.metrics;
  const boundary = buildNativeBoundaryValidationReport();
  return (
    <View style={styles.wrap} testID="runtime-stability-dashboard-panel">
      <Text style={styles.title}>{STABILITY_UI_LABELS_JA.panelTitle}</Text>
      <Text style={styles.hint}>{STABILITY_UI_LABELS_JA.readonlyHint}</Text>
      <Row label={STABILITY_UI_LABELS_JA.healthScore} value={`${snap.healthScore} (${snap.healthLabelJa})`} />
      <Row label={STABILITY_UI_LABELS_JA.reconnectCount} value={`${m.reconnectPerMin}/min · dup ${m.wsDuplicateCount}`} />
      <Row
        label={STABILITY_UI_LABELS_JA.hydrationState}
        value={snap.hydrationLockActive ? `LOCK · overlap ${m.hydrationOverlapCount}` : 'idle'}
      />
      <Row
        label={STABILITY_UI_LABELS_JA.asyncPressure}
        value={`queue ${m.queuedTaskCount} · lag ${m.asyncQueueLagMs}ms`}
      />
      <Row label={STABILITY_UI_LABELS_JA.thermalPressure} value={m.thermalLevel} />
      <Row label={STABILITY_UI_LABELS_JA.websocketStatus} value={snap.websocketStatusJa} />
      <Row label={STABILITY_UI_LABELS_JA.heartbeatAge} value={`${m.heartbeatAgeMs}ms`} />
      <Row
        label="Native boundary"
        value={
          boundary.bypassDetected
            ? `BYPASS · ${boundary.bypassDetailJa}`
            : `ok · js ${boundary.comparison.jsScheduleCount}/${boundary.comparison.jsExecuteCount}`
        }
      />
      {snap.anomalies.length > 0 ? (
        <Text style={styles.anomaly}>
          {STABILITY_UI_LABELS_JA.anomalies}: {snap.anomalies.map((a) => a.summaryJa).join(' · ')}
        </Text>
      ) : null}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export const RuntimeStabilityDashboardPanel = memo(RuntimeStabilityDashboardPanelInner);

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    gap: 4,
  },
  title: { fontWeight: '600', fontSize: 14, color: theme.colors.text },
  hint: { fontSize: 11, color: theme.colors.textMuted },
  muted: { fontSize: 12, color: theme.colors.textMuted },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  label: { fontSize: 12, color: theme.colors.textMuted, flex: 1 },
  value: { fontSize: 12, color: theme.colors.text, flex: 1, textAlign: 'right' },
  anomaly: { fontSize: 11, color: theme.colors.warning, marginTop: 4 },
});
